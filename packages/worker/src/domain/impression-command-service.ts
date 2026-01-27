import { ArrayF, type Impression, ImpressionF } from '@surfside/lib';
import type { ImpressionWriter } from '@/domain/impression-writer';
import type { RecentlySeenImpressionStore } from '@/domain/recently-seen-impression-store';

type Params = {
  recentlySeenStore: RecentlySeenImpressionStore;
  impressionWriter: ImpressionWriter;
};

export class ImpressionCommandService {
  private readonly recentlySeenStore: RecentlySeenImpressionStore;
  private readonly impressionWriter: ImpressionWriter;

  constructor({ recentlySeenStore, impressionWriter }: Params) {
    this.recentlySeenStore = recentlySeenStore;
    this.impressionWriter = impressionWriter;
  }

  private async deduplicateImpressions(impressions: readonly Impression[]): Promise<Impression[]> {
    const unique = ArrayF.uniqueBy(impressions, ImpressionF.toKey);
    const seen = await this.recentlySeenStore.hasMany(unique);
    return unique.filter((_, i) => !seen[i]);
  }

  public async storeImpressions(impressions: readonly Impression[]) {
    const deduplicatedImpressions = await this.deduplicateImpressions(impressions);
    if (deduplicatedImpressions.length === 0) return;
    await this.impressionWriter.writeMany(deduplicatedImpressions);
    await this.recentlySeenStore.addMany(deduplicatedImpressions);
  }
}
