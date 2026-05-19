import { FilterState } from "../filtering/types";
import { ViewInstance } from "../views/types";

export function diffFilterState(
  prev: FilterState,
  next: FilterState,
): (keyof FilterState)[] {
  const keys = Object.keys(next) as (keyof FilterState)[];
  return keys.filter((k) => prev[k] !== next[k]);
}

export function diffViews(
  prev: ViewInstance[],
  next: ViewInstance[],
): { added: ViewInstance[]; removed: ViewInstance[] } {
  const prevIds = new Set(prev.map((v) => v.id));
  const nextIds = new Set(next.map((v) => v.id));
  return {
    added: next.filter((v) => !prevIds.has(v.id)),
    removed: prev.filter((v) => !nextIds.has(v.id)),
  };
}
