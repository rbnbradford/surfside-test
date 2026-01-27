import type { Impression } from '@surfside/lib';

export type ImpressionWriter = {
  readonly writeMany: (impression: readonly Impression[]) => Promise<void>;
};
