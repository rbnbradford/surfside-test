import { type Impression, ImpressionF } from '@surfside/lib';
import { Redis, type RedisOptions } from 'ioredis';
import type { RecentlySeenImpressionStore } from '@/domain/recently-seen-impression-store';

type Params = {
  redisConfig: RedisOptions;
  ttlSeconds: number;
  namespace: string;
};

export class RecentlySeenImpressionStoreValkey implements RecentlySeenImpressionStore {
  private readonly redis: Redis;
  private readonly ttlSeconds: number;
  private readonly namespace: string;

  constructor({ redisConfig, ttlSeconds, namespace }: Params) {
    this.redis = new Redis(redisConfig);
    this.ttlSeconds = ttlSeconds;
    this.namespace = namespace;
  }

  private toKey(impression: Impression) {
    return `${this.namespace}:${ImpressionF.toKey(impression)}`;
  }

  public async has(impression: Impression): Promise<boolean> {
    const key = this.toKey(impression);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  public async add(impression: Impression): Promise<void> {
    const key = this.toKey(impression);
    await this.redis.set(key, '1', 'EX', this.ttlSeconds);
  }

  public async hasMany(impressions: readonly Impression[]): Promise<boolean[]> {
    if (impressions.length === 0) return [];
    const keys = impressions.map((x) => this.toKey(x));
    const values = await this.redis.mget(keys);
    return values.map((v) => v !== null);
  }

  public async addMany(impressions: readonly Impression[]): Promise<void> {
    if (impressions.length === 0) return;
    const pipeline = this.redis.pipeline();
    for (const x of impressions) pipeline.set(this.toKey(x), '1', 'EX', this.ttlSeconds);
    await pipeline.exec();
  }
}
