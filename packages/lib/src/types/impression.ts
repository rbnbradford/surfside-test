export type Impression = {
  id: string;
  ts: number;
  userId: string;
  adId: string;
};

export const ImpressionF = {
  toKey: (x: Impression) => `${x.id} ${x.ts} ${x.adId} ${x.userId}`,
};
