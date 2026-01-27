import { ResultF } from './result';

const safeParseJson = ResultF.mapThrowingFunction(JSON.parse, () => 'invalid json');

export const JsonF = {
  safeParse: safeParseJson,
} as const;
