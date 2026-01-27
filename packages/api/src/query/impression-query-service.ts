export type ImpressionQueryService = {
  getImpressionsByAdId: (params: { timeWindowMinutes: number }) => Promise<Record<string, number>>;
};
