import type { Impression } from '@surfside/lib';
import { v4 as uuidV4 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { TestContext } from './test-context';

describe('event endpoint', () => {
  it('publishes valid impressions to Kafka', async () => {
    await using ctx = await TestContext.build();
    const impression: Impression = { id: uuidV4(), ts: Date.now(), userId: uuidV4(), adId: uuidV4() };
    const res = await ctx.server.postEvent(impression);
    expect(res.status).toBe(204);
    const impressions = await ctx.kafka.consumeAllImpressions();
    expect(impressions).toHaveLength(1);
  });

  it('publishes multiple impressions to Kafka', async () => {
    await using ctx = await TestContext.build();
    const impressionsToSend = Array.from(
      { length: 3 },
      (): Impression => ({
        id: uuidV4(),
        ts: Date.now(),
        userId: uuidV4(),
        adId: uuidV4(),
      }),
    );

    for (const impression of impressionsToSend) {
      const res = await ctx.server.postEvent(impression);
      expect(res.status).toBe(204);
    }

    const impressions = await ctx.kafka.consumeAllImpressions();
    expect(impressions).toHaveLength(impressionsToSend.length);
    expect(impressions).toEqual(impressionsToSend);
  });

  it('returns the same impression payload from Kafka', async () => {
    await using ctx = await TestContext.build();
    const impression: Impression = { id: uuidV4(), ts: Date.now(), userId: uuidV4(), adId: uuidV4() };
    const res = await ctx.server.postEvent(impression);
    expect(res.status).toBe(204);

    const impressions = await ctx.kafka.consumeAllImpressions();
    expect(impressions).toHaveLength(1);
    expect(impressions[0]).toEqual(impression);
  });

  const invalidBodies: { name: string; body: unknown }[] = [
    { name: 'missing fields', body: { id: uuidV4() } },
    { name: 'string timestamp', body: { id: uuidV4(), ts: 'now', userId: uuidV4(), adId: uuidV4() } },
    { name: 'numeric userId', body: { id: uuidV4(), ts: Date.now(), userId: 1234, adId: uuidV4() } },
  ];

  it.each(invalidBodies)('returns 400 for invalid body: $name', async ({ body }) => {
    await using ctx = await TestContext.build();
    const res = await ctx.server.postEvent(body);
    expect(res.status).toBe(400);
  });
});
