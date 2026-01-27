import type { APP_DEPLOY_ENV, AppEnv } from '@/application/app-env';

type ImpressionWriterConfig =
  | { method: 'kafka'; clientId: string; brokers: string[]; topic: string }
  | { method: 'in-memory' };

type ImpressionQueryServiceConfig =
  | { method: 'in-memory' }
  | {
      method: 'clickhouse';
      url: string;
      database: string;
      username: string;
      password: string;
      table: string;
    };

type ServerConfig = {
  port: number;
  cors: { origins: string[] };
};

export type AppConfig = {
  appEnv: APP_DEPLOY_ENV;
  instanceNumber?: string | undefined;
  impressionWriter: ImpressionWriterConfig;
  impressionQueryService: ImpressionQueryServiceConfig;
  server: ServerConfig;
};

const buildAppConfig = (appEnv: AppEnv): AppConfig => {
  const impressionWriterConfig: ImpressionWriterConfig =
    appEnv.IMPRESSION_WRITER_METHOD === 'in-memory'
      ? { method: 'in-memory' }
      : {
          method: 'kafka',
          clientId: `${appEnv.IMPRESSION_WRITER_KAFKA_CLIENT_ID}:${appEnv.NODE_APP_INSTANCE ?? '0'}`,
          brokers: appEnv.IMPRESSION_WRITER_KAFKA_BROKERS,
          topic: appEnv.IMPRESSION_WRITER_KAFKA_TOPIC,
        };

  const impressionQueryServiceConfig: ImpressionQueryServiceConfig =
    appEnv.IMPRESSION_QUERY_SERVICE_METHOD === 'in-memory'
      ? { method: 'in-memory' }
      : {
          method: 'clickhouse',
          url: appEnv.IMPRESSION_QUERY_SERVICE_CLICKHOUSE_URL,
          database: appEnv.IMPRESSION_QUERY_SERVICE_CLICKHOUSE_DB,
          username: appEnv.IMPRESSION_QUERY_SERVICE_CLICKHOUSE_USER,
          password: appEnv.IMPRESSION_QUERY_SERVICE_CLICKHOUSE_PASS,
          table: 'impressions',
        };

  const serverConfig: ServerConfig = {
    port: appEnv.SERVER_PORT,
    cors: { origins: appEnv.SERVER_CORS_ORIGINS },
  };

  return {
    appEnv: appEnv.APP_ENV,
    instanceNumber: appEnv.NODE_APP_INSTANCE,
    impressionWriter: impressionWriterConfig,
    impressionQueryService: impressionQueryServiceConfig,
    server: serverConfig,
  };
};

export const AppConfig = {
  build: buildAppConfig,
} as const;
