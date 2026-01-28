import { createClient } from '@clickhouse/client';
import type { NodeClickHouseClient } from '@clickhouse/client/dist/client';
import type { NodeClickHouseClientConfigOptions } from '@clickhouse/client/dist/config';
import { type Impression, IntervalPromise } from '@surfside/lib';
import { type Consumer, Kafka, type KafkaConfig, logLevel, Partitioners } from 'kafkajs';
import { v4 as uuidV4 } from 'uuid';
import { AppServer } from '@/application/app-server';
import { ImpressionWriterKafka } from '@/infrastructure/domain/impression-writer/impression-writer-kafka';
import { ImpressionQueryServiceClickhouse } from '@/infrastructure/query/impression-query-service-clickhouse';

const buildConsumeAllImpressions = (consumer: Consumer) => async (): Promise<Impression[]> => {
  const initialBatchLimitMs = 10_000;
  const inactivityLimitMs = 200;
  const impressions: Impression[] = [];
  let initialBatchReceived = false;
  let lastBatchTime = Date.now();

  const inactivityPromise = IntervalPromise<void>((res) => {
    const limit = initialBatchReceived ? inactivityLimitMs : initialBatchLimitMs;
    if (Date.now() - lastBatchTime >= limit) res();
  }, inactivityLimitMs);

  await consumer.run({
    partitionsConsumedConcurrently: 1,
    eachBatch: async ({ batch }) => {
      initialBatchReceived = true;
      lastBatchTime = Date.now();
      const values = batch.messages
        .map((message) => message.value)
        .filter((value) => value !== null)
        .map((x) => JSON.parse(x.toString()));
      impressions.push(...values);
    },
  });

  await inactivityPromise;
  await consumer.stop();
  return impressions;
};

const buildPostEvent = (port: number) => async (body: unknown) => {
  return await fetch(`http://localhost:${port}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

const buildGetStats = (port: number) => async (timeWindowMinutes: number) => {
  return await fetch(`http://localhost:${port}/stats?timeWindowMinutes=${timeWindowMinutes}`);
};

const buildInsertImpressions =
  (client: NodeClickHouseClient, table: string) => async (impressions: readonly Impression[]) => {
    await client.insert({
      table,
      format: 'JSONEachRow',
      values: impressions.map((x) => ({ id: x.id, ts: x.ts, user_id: x.userId, ad_id: x.adId })),
    });
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

  const consumer = kafka.consumer({ groupId: `integration-test-consumer-${testId}` });
  await consumer.subscribe({ topic, fromBeginning: true });
  await consumer.connect();

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

  const impressionWriter = await ImpressionWriterKafka.build({
    kafkaConfig,
    producerConfig: {
      retry: { initialRetryTime: 20, retries: 10, maxRetryTime: 100 },
      createPartitioner: Partitioners.DefaultPartitioner,
      maxInFlightRequests: 10,
    },
    topic,
  });

  const impressionQueryService = new ImpressionQueryServiceClickhouse({ clickhouseConfig, table: testId });

  const appServer = new AppServer({
    port: 0,
    cors: { origins: ['*'] },
    impressionWriter,
    impressionQueryService,
  });
  await appServer.start();
  const assignedPort = appServer.getPort();

  const cleanup = async () => {
    await consumer.disconnect();
    await impressionWriter.disconnect();
    await clickhouseClient.query({ query: `DROP TABLE ${testId};` });
    await clickhouseClient.close();
    await appServer.stop();
  };

  return {
    server: {
      postEvent: buildPostEvent(assignedPort),
      getStats: buildGetStats(assignedPort),
    },
    impressionDb: {
      insertImpressions: buildInsertImpressions(clickhouseClient, testId),
    },
    kafka: {
      consumeAllImpressions: buildConsumeAllImpressions(consumer),
    },
    cleanup,
    [Symbol.asyncDispose]: cleanup,
  } as const;
};

export const TestContext = {
  build: buildTestContext,
} as const;
