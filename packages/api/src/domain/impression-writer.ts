import type { Impression } from '@surfside/lib';

export type ImpressionWriter = {
  readonly write: (impression: Impression) => Promise<void>;
};
