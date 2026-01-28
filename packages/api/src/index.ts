import type { Impression } from '@surfside/lib';
import { Partitioners } from 'kafkajs';
import { AppConfig } from '@/application/app-config';
import { AppEnv } from '@/application/app-env';
import { AppServer } from '@/application/app-server';
import { ImpressionWriterInMemory } from '@/infrastructure/domain/impression-writer/impression-writer-in-memory';
import { ImpressionWriterKafka } from '@/infrastructure/domain/impression-writer/impression-writer-kafka';
import { ImpressionQueryServiceClickhouse } from '@/infrastructure/query/impression-query-service-clickhouse';
import { ImpressionQueryServiceInMemory } from '@/infrastructure/query/impression-query-service-in-memory';

const env = AppEnv.parse();
const config = AppConfig.build(env);

const inMemoryImpressionRecord: Record<string, Impression[]> = {};

const buildImpressionWriter = async ({ config }: { config: AppConfig }) => {
  switch (config.impressionWriter.method) {
    case 'kafka': {
      const { clientId, brokers, topic } = config.impressionWriter;
      return await ImpressionWriterKafka.build({
        kafkaConfig: { clientId, brokers },
        producerConfig: {
          retry: { initialRetryTime: 20, retries: 10, maxRetryTime: 100 },
          createPartitioner: Partitioners.DefaultPartitioner,
          maxInFlightRequests: 10,
        },
        topic,
      });
    }
    case 'in-memory':
      return new ImpressionWriterInMemory({ record: inMemoryImpressionRecord });
  }
};

const buildImpressionQueryService = ({ config }: { config: AppConfig }) => {
  switch (config.impressionQueryService.method) {
    case 'clickhouse': {
      const { table, ...clickhouseConfig } = config.impressionQueryService;
      return new ImpressionQueryServiceClickhouse({ clickhouseConfig, table });
    }
    case 'in-memory':
      return new ImpressionQueryServiceInMemory({ record: inMemoryImpressionRecord });
  }
};

const main = async () => {
  const impressionWriter = await buildImpressionWriter({ config });
  const impressionQueryService = buildImpressionQueryService({ config });
  const { port, cors } = config.server;
  const server = new AppServer({ port, cors, impressionWriter, impressionQueryService });
  await server.start();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
