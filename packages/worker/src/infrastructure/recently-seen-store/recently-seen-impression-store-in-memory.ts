import { type Impression, ImpressionF } from '@surfside/lib';
import type { RecentlySeenImpressionStore } from '@/domain/recently-seen-impression-store';

type Params = {
  ttlSeconds: number;
};

export class RecentlySeenImpressionStoreInMemory implements RecentlySeenImpressionStore {
  private readonly ttlMs: number;
  private readonly seenMap = new Map<string, number>();

  constructor({ ttlSeconds }: Params) {
    this.ttlMs = ttlSeconds * 1000;
  }

  private _has(x: Impression) {
    const now = Date.now();
    const key = ImpressionF.toKey(x);
    const lastSeen = this.seenMap.get(key);
    if (lastSeen === undefined) return false;
    const expired = now - lastSeen > this.ttlMs;
    if (expired) this.seenMap.delete(key);
    return !expired;
  }

  public async has(x: Impression) {
    return this._has(x);
  }

  public async add(x: Impression) {
    this.seenMap.set(ImpressionF.toKey(x), Date.now());
  }

  public async hasMany(xs: readonly Impression[]) {
    return xs.map((x) => this._has(x));
  }

  public async addMany(xs: readonly Impression[]) {
    for (const x of xs) this.seenMap.set(ImpressionF.toKey(x), Date.now());
  }
}
