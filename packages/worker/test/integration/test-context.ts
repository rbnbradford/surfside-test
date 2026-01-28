import { createClient } from '@clickhouse/client';
import type { NodeClickHouseClient } from '@clickhouse/client/dist/client';
import type { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config';
import { type Impression, IntervalPromise } from '@surfside/lib';
import { Kafka, type KafkaConfig, logLevel, Partitioners, type Producer } from 'kafkajs';
import { v4 as uuidV4 } from 'uuid';
import { expect, vi } from 'vitest';
import { AppConsumer } from '@/application/app-consumer';
import { ImpressionCommandService } from '@/domain/impression-command-service';
import { ImpressionWriterClickhouse } from '@/infrastructure/impression-writer/impression-writer-clickhouse';
import { RecentlySeenImpressionStoreValkey } from '@/infrastructure/recently-seen-store/recently-seen-impression-store-valkey';

const buildProduceImpressions =
  (producer: Producer, topic: string) =>
  async (impressions: readonly Impression[]): Promise<void> => {
    const messages = impressions.map((x) => ({ key: x.id, value: JSON.stringify(x) }));
    await producer.sendBatch({ topicMessages: [{ topic, messages }] });
  };

const buildGetAllImpressions =
  (client: NodeClickHouseClient, table: string, impressionCommandService: ImpressionCommandService) =>
  async (): Promise<Impression[]> => {
    const storeSpy = vi.spyOn(impressionCommandService, 'storeImpressions');
    await vi.waitFor(() => expect(storeSpy).toHaveBeenCalled(), { timeout: 5000 });
    await Promise.all(storeSpy.mock.results.map((r) => r.value));
    storeSpy.mockClear();

    const result = await client.query({ query: `SELECT * FROM ${table}` });
    const rows = await result.json<{ id: string; ts: number; user_id: string; ad_id: string }>();
    return rows.data.map((row) => ({ id: row.id, ts: row.ts, userId: row.user_id, adId: row.ad_id }));
  };

const buildTestContext = async () => {
  const testId = uuidV4().replaceAll('-', '');

  const kafkaConfig: KafkaConfig = {
    clientId: `integration-test-client-${testId}`,
    brokers: ['localhost:29092'],
    logLevel: logLevel.NOTHING,
  };

  const topic = testId;

  const kafka = new Kafka(kafkaConfig);
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic, numPartitions: 1, replicationFactor: 1 }] });

  await IntervalPromise<void>(async (res) => {
    const topics = await admin.listTopics();
    if (topics.includes(topic)) res();
  }, 100);

  await admin.disconnect();

  const producer = kafka.producer({
    retry: { initialRetryTime: 20, retries: 10, maxRetryTime: 100 },
    createPartitioner: Partitioners.DefaultPartitioner,
    maxInFlightRequests: 10,
  });
  await producer.connect();

  const clickhouseConfig: NodeClickHouseClientConfigOptions = {
    url: 'http://localhost:8123',
    username: 'default',
    password: 'password',
    database: 'impressions_db',
  };

  const clickhouseClient = createClient(clickhouseConfig);

  await IntervalPromise<void>(async (res) => {
    const pingResult = await clickhouseClient.ping();
    if (pingResult.success) res();
  }, 100);

  await clickhouseClient.command({ query: `CREATE TABLE ${testId} AS impressions;` });

  const impressionWriter = new ImpressionWriterClickhouse({ clickhouseConfig, table: testId });
  const recentlySeenStore = new RecentlySeenImpressionStoreValkey({
    ttlSeconds: 24 * 60 * 60,
    redisConfig: { host: 'localhost', port: 6379 },
    namespace: testId,
  });
  const impressionCommandService = new ImpressionCommandService({ impressionWriter, recentlySeenStore });

  const appConsumer = new AppConsumer({
    kafkaConfig: kafkaConfig,
    consumerConfig: { groupId: testId, maxWaitTimeInMs: 1000 },
    impressionCommandService,
    topic,
  });
  await appConsumer.start();

  const cleanup = async () => {
    await producer.disconnect();
    await clickhouseClient.query({ query: `DROP TABLE ${testId};` });
    await clickhouseClient.close();
    await appConsumer.stop();
  };

  return {
    impressionDb: {
      getAllImpressions: buildGetAllImpressions(clickhouseClient, testId, impressionCommandService),
    },
    kafka: {
      produceImpressions: buildProduceImpressions(producer, topic),
    },
    cleanup,
    [Symbol.asyncDispose]: cleanup,
  } as const;
};

export const TestContext = {
  build: buildTestContext,
} as const;
