import type { AppEnv } from '@/application/app-env';

type KafkaConsumerConfig = {
  clientId: string;
  groupId: string;
  brokers: string[];
  topic: string;
};

type ImpressionWriterConfig = {
  method: 'clickhouse';
  url: string;
  database: string;
  username: string;
  password: string;
  table: string;
};

type RecentlySeenStoreConfig = { ttlSeconds: number } & (
  | { method: 'in-memory' }
  | { method: 'valkey'; host: string; port: number; namespace: string }
);

export type AppConfig = {
  appEnv: AppEnv['APP_ENV'];
  kafkaConsumer: KafkaConsumerConfig;
  recentlySeenStore: RecentlySeenStoreConfig;
  impressionWriter: ImpressionWriterConfig;
};

const buildAppConfig = (appEnv: AppEnv): AppConfig => {
  const kafkaConsumerConfig: KafkaConsumerConfig = {
    clientId: `${appEnv.KAFKA_CONSUMER_CLIENT_ID}:${appEnv.NODE_APP_INSTANCE ?? '0'}`,
    groupId: appEnv.KAFKA_CONSUMER_GROUP_ID,
    brokers: appEnv.KAFKA_CONSUMER_BROKERS,
    topic: appEnv.KAFKA_CONSUMER_TOPIC,
  };

  const recentlySeenStoreConfig: RecentlySeenStoreConfig = {
    ttlSeconds: appEnv.RECENTLY_SEEN_STORE_TTL_SECONDS,
    ...(appEnv.RECENTLY_SEEN_STORE_METHOD === 'in-memory'
      ? { method: 'in-memory' }
      : {
          method: 'valkey',
          host: appEnv.RECENTLY_SEEN_STORE_VALKEY_HOST,
          port: appEnv.RECENTLY_SEEN_STORE_VALKEY_PORT,
          namespace: 'impression',
        }),
  };

  const impressionWriterConfig: ImpressionWriterConfig = {
    method: 'clickhouse',
    url: appEnv.IMPRESSION_WRITER_CLICKHOUSE_URL,
    database: appEnv.IMPRESSION_WRITER_CLICKHOUSE_DB,
    username: appEnv.IMPRESSION_WRITER_CLICKHOUSE_USER,
    password: appEnv.IMPRESSION_WRITER_CLICKHOUSE_PASS,
    table: 'impressions',
  };

  return {
    appEnv: appEnv.APP_ENV,
    kafkaConsumer: kafkaConsumerConfig,
    recentlySeenStore: recentlySeenStoreConfig,
    impressionWriter: impressionWriterConfig,
  };
};

export const AppConfig = {
  build: buildAppConfig,
} as const;
