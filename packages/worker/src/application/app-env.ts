import { z } from 'zod';

/**
 * Kafka Consumer env vars
 * =======================
 */
type KafkaConsumerEnv = {
  KAFKA_CONSUMER_CLIENT_ID: string;
  KAFKA_CONSUMER_GROUP_ID: string;
  KAFKA_CONSUMER_BROKERS: string[];
  KAFKA_CONSUMER_TOPIC: string;
};

/**
 * Recently Seen Store env vars
 * ============================
 */
type RecentlySeenStoreBaseEnv = {
  RECENTLY_SEEN_STORE_TTL_SECONDS: number;
};
type RecentlySeenStoreValkeyEnv = {
  RECENTLY_SEEN_STORE_METHOD: 'valkey';
  RECENTLY_SEEN_STORE_VALKEY_HOST: string;
  RECENTLY_SEEN_STORE_VALKEY_PORT: number;
};
type RecentlySeenStoreInMemoryEnv = {
  RECENTLY_SEEN_STORE_METHOD: 'in-memory';
};
type RecentlySeenStoreEnv = RecentlySeenStoreBaseEnv & (RecentlySeenStoreValkeyEnv | RecentlySeenStoreInMemoryEnv);

/**
 * Impression Writer env vars
 * ==========================
 */
type ImpressionWriterClickhouseEnv = {
  IMPRESSION_WRITER_CLICKHOUSE_URL: string;
  IMPRESSION_WRITER_CLICKHOUSE_DB: string;
  IMPRESSION_WRITER_CLICKHOUSE_USER: string;
  IMPRESSION_WRITER_CLICKHOUSE_PASS: string;
};
type ImpressionWriterEnv = ImpressionWriterClickhouseEnv;

/**
 * App env
 * =======
 */
export type AppEnv = {
  APP_ENV: 'development' | 'staging' | 'production';
  NODE_ENV: 'development' | 'production' | 'test';
  NODE_APP_INSTANCE?: string | undefined;
} & KafkaConsumerEnv &
  RecentlySeenStoreEnv &
  ImpressionWriterEnv;

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

const zKafkaConsumerEnv: z.ZodSchema<KafkaConsumerEnv> = z.object({
  KAFKA_CONSUMER_CLIENT_ID: z.string(),
  KAFKA_CONSUMER_GROUP_ID: z.string(),
  KAFKA_CONSUMER_BROKERS: zStringListDelimitedByComma,
  KAFKA_CONSUMER_TOPIC: z.string(),
});

const zRecentlySeenStoreBaseEnv: z.ZodSchema<RecentlySeenStoreBaseEnv> = z.object({
  RECENTLY_SEEN_STORE_TTL_SECONDS: z
    .string()
    .transform(Number)
    .refine((hours) => hours > 0, 'must be a positive number'),
});
const zRecentlySeenStoreValkeyEnv: z.ZodSchema<RecentlySeenStoreValkeyEnv> = z.object({
  RECENTLY_SEEN_STORE_METHOD: z.literal('valkey'),
  RECENTLY_SEEN_STORE_VALKEY_HOST: z.string(),
  RECENTLY_SEEN_STORE_VALKEY_PORT: zPort,
});
const zRecentlySeenStoreInMemoryEnv: z.ZodSchema<RecentlySeenStoreInMemoryEnv> = z.object({
  RECENTLY_SEEN_STORE_METHOD: z.literal('in-memory'),
});
const zRecentlySeenStoreEnv: z.ZodSchema<RecentlySeenStoreEnv> = zRecentlySeenStoreBaseEnv.and(
  zRecentlySeenStoreValkeyEnv.or(zRecentlySeenStoreInMemoryEnv),
);

const zImpressionWriterClickhouseEnv: z.ZodSchema<ImpressionWriterClickhouseEnv> = z.object({
  IMPRESSION_WRITER_CLICKHOUSE_URL: z.string(),
  IMPRESSION_WRITER_CLICKHOUSE_DB: z.string(),
  IMPRESSION_WRITER_CLICKHOUSE_USER: z.string(),
  IMPRESSION_WRITER_CLICKHOUSE_PASS: z.string(),
});
const zImpressionWriterEnv: z.ZodSchema<ImpressionWriterEnv> = zImpressionWriterClickhouseEnv;

const validateNodeEnvAndAppEnv = (env: AppEnv): boolean => nodeEnvAppEnvMapping[env.NODE_ENV].includes(env.APP_ENV);

const zEnv: z.ZodSchema<AppEnv> = z
  .object({
    APP_ENV: z.enum(['development', 'staging', 'production']),
    NODE_ENV: z.enum(['development', 'production', 'test']),
    NODE_APP_INSTANCE: z.string().optional(),
  })
  .and(zKafkaConsumerEnv)
  .and(zRecentlySeenStoreEnv)
  .and(zImpressionWriterEnv)
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
