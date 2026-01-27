import { z } from 'zod';

/**
 * Impression Writer env vars
 * ==========================
 */
type ImpressionWriterKafkaEnv = {
  IMPRESSION_WRITER_METHOD: 'kafka';
  IMPRESSION_WRITER_KAFKA_CLIENT_ID: string;
  IMPRESSION_WRITER_KAFKA_BROKERS: string[];
  IMPRESSION_WRITER_KAFKA_TOPIC: string;
};
type ImpressionWriterInMemoryEnv = {
  IMPRESSION_WRITER_METHOD: 'in-memory';
};
type ImpressionWriterEnv = ImpressionWriterKafkaEnv | ImpressionWriterInMemoryEnv;

/**
 * Impression Query Service env vars
 * =================================
 */

type ImpressionQueryServiceInMemoryEnv = {
  IMPRESSION_QUERY_SERVICE_METHOD: 'in-memory';
};
type ImpressionQueryServiceClickhouseEnv = {
  IMPRESSION_QUERY_SERVICE_METHOD: 'clickhouse';
  IMPRESSION_QUERY_SERVICE_CLICKHOUSE_URL: string;
  IMPRESSION_QUERY_SERVICE_CLICKHOUSE_DB: string;
  IMPRESSION_QUERY_SERVICE_CLICKHOUSE_USER: string;
  IMPRESSION_QUERY_SERVICE_CLICKHOUSE_PASS: string;
};
type ImpressionQueryServiceEnv = ImpressionQueryServiceInMemoryEnv | ImpressionQueryServiceClickhouseEnv;

/**
 * Server env vars
 * ===============
 */
type ServerEnv = {
  SERVER_PORT: number;
  SERVER_CORS_ORIGINS: string[];
};

/**
 * App env
 * =======
 */
export type NODE_ENV = 'development' | 'production' | 'test';
export type APP_DEPLOY_ENV = 'development' | 'staging' | 'production';
export type AppEnv = {
  APP_ENV: APP_DEPLOY_ENV;
  NODE_ENV: NODE_ENV;
  NODE_APP_INSTANCE?: string | undefined;
} & ImpressionWriterEnv &
  ImpressionQueryServiceEnv &
  ServerEnv;

const nodeEnvAppEnvMapping: Record<AppEnv['NODE_ENV'], AppEnv['APP_ENV'][]> = {
  development: ['development'],
  production: ['production', 'staging'],
  test: ['development'],
};

const zPort = z
  .string()
  .transform(Number)
  .refine((port) => port > 0, 'must be a positive number')
  .refine((port) => Number.isInteger(port), 'must be an integer')
  .default(3000);

const zStringListDelimitedByComma = z
  .string()
  .min(1)
  .transform((x) => x.split(',').map((x) => x.trim()));

const zImpressionWriterKafkaEnv: z.ZodSchema<ImpressionWriterKafkaEnv> = z.object({
  IMPRESSION_WRITER_METHOD: z.literal('kafka'),
  IMPRESSION_WRITER_KAFKA_CLIENT_ID: z.string(),
  IMPRESSION_WRITER_KAFKA_BROKERS: zStringListDelimitedByComma,
  IMPRESSION_WRITER_KAFKA_TOPIC: z.string(),
});
const zImpressionWriterInMemoryEnv: z.ZodSchema<ImpressionWriterInMemoryEnv> = z.object({
  IMPRESSION_WRITER_METHOD: z.literal('in-memory'),
});
const zImpressionWriterEnv: z.ZodSchema<ImpressionWriterEnv> =
  zImpressionWriterKafkaEnv.or(zImpressionWriterInMemoryEnv);

const zImpressionQueryServiceInMemoryEnv: z.ZodSchema<ImpressionQueryServiceInMemoryEnv> = z.object({
  IMPRESSION_QUERY_SERVICE_METHOD: z.literal('in-memory'),
});
const zImpressionQueryServiceClickhouseEnv: z.ZodSchema<ImpressionQueryServiceClickhouseEnv> = z.object({
  IMPRESSION_QUERY_SERVICE_METHOD: z.literal('clickhouse'),
  IMPRESSION_QUERY_SERVICE_CLICKHOUSE_URL: z.string(),
  IMPRESSION_QUERY_SERVICE_CLICKHOUSE_DB: z.string(),
  IMPRESSION_QUERY_SERVICE_CLICKHOUSE_USER: z.string(),
  IMPRESSION_QUERY_SERVICE_CLICKHOUSE_PASS: z.string(),
});
const zImpressionQueryServiceEnv: z.ZodSchema<ImpressionQueryServiceEnv> = zImpressionQueryServiceInMemoryEnv.or(
  zImpressionQueryServiceClickhouseEnv,
);

const zServerEnv: z.ZodSchema<ServerEnv> = z.object({
  SERVER_PORT: zPort,
  SERVER_CORS_ORIGINS: zStringListDelimitedByComma,
});

const validateNodeEnvAndAppEnv = (env: AppEnv): boolean => nodeEnvAppEnvMapping[env.NODE_ENV].includes(env.APP_ENV);

const zEnv: z.ZodSchema<AppEnv> = z
  .object({
    APP_ENV: z.enum(['development', 'staging', 'production']),
    NODE_ENV: z.enum(['development', 'production', 'test']),
    NODE_APP_INSTANCE: z.string().optional(),
  })
  .and(zImpressionWriterEnv)
  .and(zImpressionQueryServiceEnv)
  .and(zServerEnv)
  .refine(validateNodeEnvAndAppEnv, 'invalid NODE_ENV & APP_ENV combination');

const parseAppEnv = () => {
  const result = zEnv.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map(({ message, path }) => ({ path: path.join('.'), message }));
    const errorBody = { message: 'Invalid environment variables', issues, actual: process.env };
    throw new Error(JSON.stringify(errorBody, null, 2));
  }
  return result.data;
};

export const AppEnv = {
  parse: parseAppEnv,
} as const;
