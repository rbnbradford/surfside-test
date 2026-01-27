import { v4 as uuidV4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { TestContext } from './test-context';

describe('Stats Querying', () => {
  it('returns accurate counts from ClickHouse', async () => {
    await using ctx = await TestContext.build();

    const now = Date.now();

    const adId1 = uuidV4();
    const adId2 = uuidV4();
    await ctx.impressionDb.insertImpressions([
      { id: uuidV4(), ts: now - 60 * 1000, userId: uuidV4(), adId: adId1 },
      { id: uuidV4(), ts: now - 60 * 1000, userId: uuidV4(), adId: adId2 },
    ]);

    const response = await ctx.server.getStats(10);
    const stats = await response.json();

    expect(stats).toEqual({
      [adId1]: 1,
      [adId2]: 1,
    });
  });

  it('filters impressions outside the time window', async () => {
    await using ctx = await TestContext.build();

    const now = Date.now();
    const recentAdId = uuidV4();
    const oldAdId = uuidV4();

    await ctx.impressionDb.insertImpressions([
      { id: uuidV4(), ts: now - 2 * 60 * 1000, userId: uuidV4(), adId: recentAdId },
      { id: uuidV4(), ts: now - 60 * 60 * 1000, userId: uuidV4(), adId: oldAdId },
    ]);

    const response = await ctx.server.getStats(10);
    const stats = await response.json();

    expect(stats).toEqual({
      [recentAdId]: 1,
    });
  });

  it('returns 400 for invalid time window', async () => {
    await using ctx = await TestContext.build();

    const response = await ctx.server.getStats(0);
    expect(response.status).toBe(400);
  });
});
