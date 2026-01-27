import { ArrayF, type Impression } from '@surfside/lib';
import type { ImpressionQueryService } from '@/query/impression-query-service';

type Params = {
  record: Partial<Record<string, Impression[]>>;
  nowProvider?: () => Date;
};

export class ImpressionQueryServiceInMemory implements ImpressionQueryService {
  private readonly record: Partial<Record<string, Impression[]>>;
  private readonly nowProvider: () => Date;

  constructor({ record, nowProvider }: Params) {
    this.record = record;
    this.nowProvider = nowProvider ?? (() => new Date());
  }

  public async getImpressionsByAdId({ timeWindowMinutes }: { timeWindowMinutes: number }) {
    const nowMs = this.nowProvider().getTime();
    const timeWindowMs = timeWindowMinutes * 60 * 1000;
    const threshold = nowMs - timeWindowMs;
    const entries = Object.entries(this.record);
    const counts = entries.map(([k, xs]) => [k, ArrayF.countWhere(xs ?? [], ({ ts }) => ts > threshold)]);
    return Object.fromEntries(counts);
  }
}
