import { describe, expect, it } from "vitest";
import { diffFilterState, diffViewIds } from "../diff";
import { EMPTY_FILTER_STATE, FilterState } from "../../filtering/types";

describe("diffFilterState", () => {
  it("returns an empty list when nothing changed", () => {
    expect(diffFilterState(EMPTY_FILTER_STATE, EMPTY_FILTER_STATE)).toEqual([]);
  });

  it("identifies a single changed key", () => {
    const next: FilterState = {
      ...EMPTY_FILTER_STATE,
      datumType: { selectedTypes: ["MARKDOWN"] },
    };
    expect(diffFilterState(EMPTY_FILTER_STATE, next)).toEqual(["datumType"]);
  });

  it("identifies multiple changed keys when several flip in one update", () => {
    const next: FilterState = {
      ...EMPTY_FILTER_STATE,
      datumType: { selectedTypes: ["MARKDOWN"] },
      datumTags: { selectedTags: ["tag-a"] },
    };
    expect(diffFilterState(EMPTY_FILTER_STATE, next).sort()).toEqual(
      ["datumTags", "datumType"],
    );
  });

  it("uses referential equality — same object reference is not a change", () => {
    const filter = { selectedTypes: ["MARKDOWN"] };
    const prev: FilterState = { ...EMPTY_FILTER_STATE, datumType: filter };
    const next: FilterState = { ...EMPTY_FILTER_STATE, datumType: filter };
    expect(diffFilterState(prev, next)).toEqual([]);
  });
});

describe("diffViewIds", () => {
  it("reports additions and removals separately", () => {
    expect(diffViewIds(["a", "b"], ["b", "c"])).toEqual({
      added: ["c"],
      removed: ["a"],
    });
  });

  it("reports nothing when the sets match", () => {
    expect(diffViewIds(["a", "b"], ["a", "b"])).toEqual({
      added: [],
      removed: [],
    });
  });

  it("is order-insensitive", () => {
    expect(diffViewIds(["a", "b"], ["b", "a"])).toEqual({
      added: [],
      removed: [],
    });
  });
});
