import { describe, it, expect, vi } from "vitest";
import { applyFilters } from "../applyFilters";
import {
  createFilterTestGraph,
  createFilterState,
  createDatumTypeFilter,
  createDatumTagsFilter,
} from "../__fixtures__/mockFilters";
import { ExternalGraph } from "../../external-graph/types";

describe("applyFilters", () => {
  it("returns graph unchanged when all filters are null", () => {
    const graph = createFilterTestGraph();
    const result = applyFilters(graph, createFilterState());
    expect(result).toBe(graph);
  });

  it("applies a single active filter using default logic", () => {
    const graph = createFilterTestGraph();
    const result = applyFilters(
      graph,
      createFilterState({ datumType: createDatumTypeFilter(["CODE"]) }),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d3"]);
  });

  it("chains multiple active filters sequentially", () => {
    const graph = createFilterTestGraph();
    const result = applyFilters(
      graph,
      createFilterState({
        datumType: createDatumTypeFilter(["MARKDOWN"]),
        datumTags: createDatumTagsFilter(["tag-beta"]),
      }),
    );
    // datumType keeps d1, d2; datumTags with tag-beta keeps only d1
    expect(result.datums.map((d) => d.id)).toEqual(["d1"]);
  });

  it("uses callback override when provided", () => {
    const graph = createFilterTestGraph();
    const customDatumType = vi.fn(
      (g: ExternalGraph) =>
        ({
          ...g,
          datums: g.datums.filter((d) => d.id === "d4"),
          edges: [],
          edgeTags: [],
        }) as ExternalGraph,
    );

    const result = applyFilters(
      graph,
      createFilterState({ datumType: createDatumTypeFilter(["MARKDOWN"]) }),
      { datumType: customDatumType },
    );
    expect(customDatumType).toHaveBeenCalledOnce();
    expect(result.datums.map((d) => d.id)).toEqual(["d4"]);
  });

  it("uses default for filters without a callback override", () => {
    const graph = createFilterTestGraph();
    const customDatumType = vi.fn(
      (g: ExternalGraph) =>
        ({
          ...g,
          datums: g.datums.filter((d) => d.id === "d4"),
          edges: [],
          edgeTags: [],
        }) as ExternalGraph,
    );

    const result = applyFilters(
      graph,
      createFilterState({
        datumType: createDatumTypeFilter(["MARKDOWN"]),
        datumTags: createDatumTagsFilter(["tag-alpha"]),
      }),
      { datumType: customDatumType },
    );
    // customDatumType returns only d4, then datumTags default runs on that result
    // d4 has no tags matching "tag-alpha", so it gets filtered out
    expect(result.datums).toEqual([]);
  });
});
