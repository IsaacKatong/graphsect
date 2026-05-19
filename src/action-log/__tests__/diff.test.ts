import { describe, expect, it } from "vitest";
import { diffFilterState, diffViews } from "../diff";
import { EMPTY_FILTER_STATE, FilterState } from "../../filtering/types";
import type { ViewInstance } from "../../views/types";

const v = (id: string, typeId: string = id.replace(/-\d+$/, "")): ViewInstance => ({
  id,
  typeId,
});

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

describe("diffViews", () => {
  it("reports additions and removals separately, keyed by instance id", () => {
    expect(diffViews([v("a-1"), v("b-1")], [v("b-1"), v("c-1")])).toEqual({
      added: [v("c-1")],
      removed: [v("a-1")],
    });
  });

  it("reports nothing when the instance sets match", () => {
    expect(diffViews([v("a-1"), v("b-1")], [v("a-1"), v("b-1")])).toEqual({
      added: [],
      removed: [],
    });
  });

  it("two instances of the same type are distinct", () => {
    // Both have typeId "tag-mesh" but different ids — removing one and
    // adding another should be reported as a swap.
    expect(
      diffViews(
        [v("tag-mesh-1", "tag-mesh")],
        [v("tag-mesh-2", "tag-mesh")],
      ),
    ).toEqual({
      added: [v("tag-mesh-2", "tag-mesh")],
      removed: [v("tag-mesh-1", "tag-mesh")],
    });
  });
});
