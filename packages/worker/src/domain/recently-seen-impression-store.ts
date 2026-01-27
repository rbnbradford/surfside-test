import type { Impression } from '@surfside/lib';

export type RecentlySeenImpressionStore = {
  readonly has: (impression: Impression) => Promise<boolean>;
  readonly add: (impression: Impression) => Promise<void>;
  readonly hasMany: (impressions: readonly Impression[]) => Promise<boolean[]>;
  readonly addMany: (impressions: readonly Impression[]) => Promise<void>;
};
