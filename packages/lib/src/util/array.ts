const arrayCountWhere = <T>(xs: readonly T[], f: (item: T) => boolean): number =>
  xs.reduce((acc, item) => (f(item) ? acc + 1 : acc), 0);

const arrayUniqueBy = <K, V>(xs: readonly V[], f: (x: V) => K): V[] => {
  const map = new Map<K, V>();
  for (const x of xs) map.set(f(x), x);
  return Array.from(map.values());
};

export const ArrayF = {
  countWhere: arrayCountWhere,
  uniqueBy: arrayUniqueBy,
} as const;
