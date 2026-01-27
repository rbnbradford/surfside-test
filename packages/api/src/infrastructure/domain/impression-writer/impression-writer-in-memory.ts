import type { Impression } from '@surfside/lib';
import type { ImpressionWriter } from '@/domain/impression-writer';

type Params = {
  record: Partial<Record<string, Impression[]>>;
};

export class ImpressionWriterInMemory implements ImpressionWriter {
  private readonly record: Partial<Record<string, Impression[]>>;

  constructor({ record }: Params) {
    this.record = record;
  }

  public async write(impression: Impression) {
    const key = impression.adId;
    if (!this.record[key]) this.record[key] = [impression];
    else this.record[key].push(impression);
  }
}
