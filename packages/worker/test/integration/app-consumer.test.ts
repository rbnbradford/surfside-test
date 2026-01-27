import type { Impression } from '@surfside/lib';
import { v4 as uuidV4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { TestContext } from './test-context';

describe('app consumer', () => {
  it('inserts impressions into Clickhouse', async () => {
    await using ctx = await TestContext.build();
    const impressionsToStore: Impression[] = [
      { id: uuidV4(), ts: Date.now(), userId: uuidV4(), adId: uuidV4() },
      { id: uuidV4(), ts: Date.now(), userId: uuidV4(), adId: uuidV4() },
      { id: uuidV4(), ts: Date.now(), userId: uuidV4(), adId: uuidV4() },
    ];
    await ctx.kafka.produceImpressions(impressionsToStore);
    const impressions = await ctx.impressionDb.getAllImpressions();
    expect(impressions).toHaveLength(3);
  });

  it('deduplicates exact matches within the same batch', async () => {
    await using ctx = await TestContext.build();
    const duplicateImpression: Impression = {
      id: uuidV4(),
      ts: Date.now(),
      userId: uuidV4(),
      adId: uuidV4(),
    };
    const impressionsToStore: Impression[] = [
      duplicateImpression,
      duplicateImpression,
      { id: uuidV4(), ts: Date.now(), userId: uuidV4(), adId: uuidV4() },
    ];
    await ctx.kafka.produceImpressions(impressionsToStore);
    const impressions = await ctx.impressionDb.getAllImpressions();
    expect(impressions).toHaveLength(2);
  });

  it('deduplicates impressions seen in previous batches', async () => {
    await using ctx = await TestContext.build();
    const previouslySeen: Impression = { id: uuidV4(), ts: Date.now(), userId: uuidV4(), adId: uuidV4() };
    await ctx.kafka.produceImpressions([previouslySeen]);
    await ctx.impressionDb.getAllImpressions();

    const nextBatch: Impression[] = [
      previouslySeen,
      { id: uuidV4(), ts: Date.now(), userId: uuidV4(), adId: uuidV4() },
    ];
    await ctx.kafka.produceImpressions(nextBatch);
    const impressions = await ctx.impressionDb.getAllImpressions();
    expect(impressions).toHaveLength(2);
  });
});
