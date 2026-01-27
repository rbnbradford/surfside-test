import { AppConfig } from '@/application/app-config';
import { AppConsumer } from '@/application/app-consumer';
import { AppEnv } from '@/application/app-env';
import { ImpressionCommandService } from '@/domain/impression-command-service';
import { ImpressionWriterClickhouse } from '@/infrastructure/impression-writer/impression-writer-clickhouse';
import { RecentlySeenImpressionStoreInMemory } from '@/infrastructure/recently-seen-store/recently-seen-impression-store-in-memory';
import { RecentlySeenImpressionStoreValkey } from '@/infrastructure/recently-seen-store/recently-seen-impression-store-valkey';

const env = AppEnv.parse();
const config = AppConfig.build(env);

const buildRecentlySeenStore = (config: AppConfig) => {
  const { ttlSeconds } = config.recentlySeenStore;
  switch (config.recentlySeenStore.method) {
    case 'valkey': {
      const { host, port, namespace } = config.recentlySeenStore;
      return new RecentlySeenImpressionStoreValkey({ ttlSeconds, redisConfig: { host, port }, namespace });
    }
    case 'in-memory': {
      return new RecentlySeenImpressionStoreInMemory({ ttlSeconds });
    }
  }
};

const main = async () => {
  const { table, ...clickhouseConfig } = config.impressionWriter;
  const impressionWriter = new ImpressionWriterClickhouse({ clickhouseConfig, table });
  const recentlySeenStore = buildRecentlySeenStore(config);
  const impressionCommandService = new ImpressionCommandService({ recentlySeenStore, impressionWriter });

  const { topic, groupId, brokers, clientId } = config.kafkaConsumer;
  const appConsumer = new AppConsumer({
    kafkaConfig: { clientId, brokers },
    consumerConfig: { groupId, maxWaitTimeInMs: 1000 },
    impressionCommandService,
    topic,
  });
  await appConsumer.start();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
