import type { Impression } from '@surfside/lib';
import { Kafka, type KafkaConfig, type Producer, type ProducerConfig } from 'kafkajs';
import type { ImpressionWriter } from '@/domain/impression-writer';

type Params = {
  kafkaConfig: KafkaConfig;
  producerConfig: ProducerConfig;
  topic: string;
};

export class ImpressionWriterKafka implements ImpressionWriter {
  private readonly producer: Producer;
  private readonly topic: string;

  public constructor({ kafkaConfig, producerConfig, topic }: Params) {
    const kafka = new Kafka(kafkaConfig);
    const producer = kafka.producer(producerConfig);
    this.producer = producer;
    this.topic = topic;
  }

  async write(impression: Impression): Promise<void> {
    await this.producer.connect();
    await this.producer.send({
      topic: this.topic,
      acks: 1,
      messages: [{ key: impression.id, value: JSON.stringify(impression) }],
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
