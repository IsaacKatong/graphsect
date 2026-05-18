import { describe, it, expect, vi } from "vitest";
import { applyFilters } from "../applyFilters";
import {
  createFilterTestGraph,
  createFilterState,
  createDatumTypeFilter,
  createDatumTagsFilter,
  createConnectedEdgesFilter,
  createEdgeTagsFilter,
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

  it("combines edges, edge tags, and datum tags into a non-empty result when the datum tag is still attached to an active datum (regression)", () => {
    // Bug: with the old pipeline, applying edges + edge tags + a datum tag
    // collapsed to an empty graph because the datum-tag filter ran first
    // and pruned dangling edges, leaving the later edge filters nothing to
    // work with. With the new design — narrow primary scope, reconcile
    // once at the end — the result is the intersection: only datums that
    // both pass the datum-tag predicate AND are endpoints of an allowed
    // edge survive. In the fixture, d1->d2 is in the edge set, "related"
    // is the only edge tag on d1->d2, and d2 carries tag-alpha — so d2
    // alone survives.
    const graph = createFilterTestGraph();
    const result = applyFilters(
      graph,
      createFilterState({
        connectedEdges: createConnectedEdgesFilter(["d1->d2"]),
        edgeTags: createEdgeTagsFilter(["related"]),
        datumTags: createDatumTagsFilter(["tag-alpha"]),
      }),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(result.edges.map((e) => `${e.fromDatumID}->${e.toDatumID}`)).toEqual(
      ["d1->d2"],
    );
  });

  it("collapses cleanly when a datum-tag selection excludes every endpoint of the selected edges", () => {
    // Same combination, but the datum tag (tag-gamma) only appears on d3,
    // which is not an endpoint of the selected edge d1->d2. The result is
    // an empty graph — but, crucially, the dropdown should never have
    // offered tag-gamma in the first place once edges + edge tags were
    // active (the FilterPanel reads from the post-filter graph, so
    // tag-gamma wouldn't be listed). This test pins down what happens
    // when the combination is forced programmatically anyway.
    const graph = createFilterTestGraph();
    const result = applyFilters(
      graph,
      createFilterState({
        connectedEdges: createConnectedEdgesFilter(["d1->d2"]),
        edgeTags: createEdgeTagsFilter(["related"]),
        datumTags: createDatumTagsFilter(["tag-gamma"]),
      }),
    );
    expect(result.datums).toEqual([]);
    expect(result.edges).toEqual([]);
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
