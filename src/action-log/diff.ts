import { FilterState } from "../filtering/types";

export function diffFilterState(
  prev: FilterState,
  next: FilterState,
): (keyof FilterState)[] {
  const keys = Object.keys(next) as (keyof FilterState)[];
  return keys.filter((k) => prev[k] !== next[k]);
}

export function diffViewIds(
  prev: string[],
  next: string[],
): { added: string[]; removed: string[] } {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  return {
    added: next.filter((id) => !prevSet.has(id)),
    removed: prev.filter((id) => !nextSet.has(id)),
  };
}
