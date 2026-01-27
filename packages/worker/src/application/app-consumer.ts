import { err, type Impression, JsonF, ok, type Result, ResultF } from '@surfside/lib';
import { type Consumer, type ConsumerConfig, Kafka, type KafkaConfig, type KafkaMessage } from 'kafkajs';
import { z } from 'zod';
import type { ImpressionCommandService } from '@/domain/impression-command-service';

const zImpressionBody: z.ZodSchema<Impression> = z.object({
  id: z.string(),
  ts: z.number(),
  userId: z.string(),
  adId: z.string(),
});

type Params = {
  kafkaConfig: KafkaConfig;
  consumerConfig: ConsumerConfig;
  impressionCommandService: ImpressionCommandService;
  topic: string;
};

export class AppConsumer {
  private readonly consumer: Consumer;
  private readonly impressionCommandService: ImpressionCommandService;
  private readonly topic: string;
  constructor(params: Params) {
    const kafka = new Kafka(params.kafkaConfig);
    this.consumer = kafka.consumer(params.consumerConfig);
    this.impressionCommandService = params.impressionCommandService;
    this.topic = params.topic;
  }

  private parseMessage = (msg: KafkaMessage): Result<Impression, string> => {
    if (msg.value === null) return err('null message');
    const json = msg.value.toString();
    const jsonParseResult = JsonF.safeParse(json);
    if (!jsonParseResult.ok) return jsonParseResult;
    const schemaParseResult = zImpressionBody.safeParse(jsonParseResult.value);
    if (!schemaParseResult.success) return err(schemaParseResult.error.message);
    return ok(schemaParseResult.data);
  };

  private logMessageErrors = (errors: readonly string[]) => {
    for (const error of errors) console.error(`failed to parse impression: ${error}`);
  };

  public async start() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: true });
    await this.consumer.run({
      eachBatch: async ({ batch }) => {
        const impressionResults = batch.messages.map(this.parseMessage);
        const [impressions, messageErrors] = ResultF.partition(impressionResults);
        this.logMessageErrors(messageErrors);
        await this.impressionCommandService.storeImpressions(impressions);
      },
    });
  }

  public async stop() {
    await this.consumer.stop();
    await this.consumer.disconnect();
  }
}
