export type Ok<TOk> = { ok: true; value: TOk };
export type Err<TErr> = { ok: false; error: TErr };
export type Result<TOk, TErr> = Ok<TOk> | Err<TErr>;

export const ok = <TOk>(value: TOk): Ok<TOk> => ({ ok: true, value });
export const err = <TErr>(error: TErr): Err<TErr> => ({ ok: false, error });

const resultPartition = <TOk, TErr>(xs: readonly Result<TOk, TErr>[]): [TOk[], TErr[]] => {
  const oks: TOk[] = [];
  const errs: TErr[] = [];
  for (const x of xs) x.ok ? oks.push(x.value) : errs.push(x.error);
  return [oks, errs];
};

const mapThrowingFunctionToResult: {
  <TArgs extends readonly unknown[], TOk>(f: (...args: TArgs) => TOk): (...args: TArgs) => Result<TOk, unknown>;
  <TArgs extends readonly unknown[], TOk, TErr>(
    f: (...args: TArgs) => TOk,
    mapError: (e: unknown) => TErr,
  ): (...args: TArgs) => Result<TOk, TErr>;
} =
  <TArgs extends readonly unknown[], TOk>(f: (...args: TArgs) => TOk, mapError?: (e: unknown) => unknown) =>
  (...args: TArgs): Result<TOk, unknown> => {
    try {
      return ok(f(...args));
    } catch (e) {
      if (mapError) return err(mapError(e));
      return err(e);
    }
  };

export const ResultF = {
  partition: resultPartition,
  mapThrowingFunction: mapThrowingFunctionToResult,
} as const;
