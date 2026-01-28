import type { Impression } from '@surfside/lib';
import { Kafka, type KafkaConfig, type Producer, type ProducerConfig } from 'kafkajs';
import type { ImpressionWriter } from '@/domain/impression-writer';

type Params = {
  kafkaConfig: KafkaConfig;
  producerConfig: ProducerConfig;
  topic: string;
};

export class ImpressionWriterKafka implements ImpressionWriter {
  private constructor(
    private readonly producer: Producer,
    private readonly topic: string,
  ) {}

  async write(impression: Impression): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      acks: 1,
      messages: [{ key: impression.id, value: JSON.stringify(impression) }],
    });
  }

  static async build({ kafkaConfig, producerConfig, topic }: Params): Promise<ImpressionWriterKafka> {
    const kafka = new Kafka(kafkaConfig);
    const producer = kafka.producer(producerConfig);
    await producer.connect();
    return new ImpressionWriterKafka(producer, topic);
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
