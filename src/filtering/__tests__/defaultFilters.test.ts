import { describe, it, expect } from "vitest";
import {
  filterByDatumType,
  filterByDatumTags,
  filterByConnectedEdges,
  filterByEdgeTags,
  filterByConnectedDatums,
  filterByDimensionValues,
  makeConsistent,
} from "../defaultFilters";
import {
  createFilterTestGraph,
  createDatumTypeFilter,
  createDatumTagsFilter,
  createConnectedEdgesFilter,
  createEdgeTagsFilter,
  createConnectedDatumsFilter,
  createDimensionValuesFilter,
} from "../__fixtures__/mockFilters";

// Each default filter narrows only its primary scope (datums OR edges +
// endpoints). Cross-table cleanup is the job of `makeConsistent`, which
// `applyFilters` runs once at the end of the pipeline — these unit tests
// therefore deliberately do NOT expect dangling-reference cleanup from the
// individual filter functions.

describe("filterByDatumType", () => {
  it("keeps only datums matching selected types and leaves edges alone", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumType(graph, createDatumTypeFilter(["MARKDOWN"]));
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(result.edges).toBe(graph.edges);
  });

  it("returns graph unchanged when selectedTypes is empty", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumType(graph, createDatumTypeFilter([]));
    expect(result).toBe(graph);
  });

  it("supports multiple type selection", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumType(
      graph,
      createDatumTypeFilter(["MARKDOWN", "CODE"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2", "d3"]);
  });
});

describe("filterByDatumTags", () => {
  it("keeps datums that have at least one selected tag", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumTags(
      graph,
      createDatumTagsFilter(["tag-alpha"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(result.edges).toBe(graph.edges);
  });

  it("returns graph unchanged when selectedTags is empty", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumTags(graph, createDatumTagsFilter([]));
    expect(result).toBe(graph);
  });
});

describe("filterByConnectedEdges", () => {
  it("keeps only datums connected by selected edges and narrows edges", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedEdges(
      graph,
      createConnectedEdgesFilter(["d1->d2"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(result.edges).toHaveLength(1);
  });

  it("returns graph unchanged when selectedEdgeIDs is empty", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedEdges(
      graph,
      createConnectedEdgesFilter([]),
    );
    expect(result).toBe(graph);
  });
});

describe("filterByEdgeTags", () => {
  it("keeps edges with at least one selected tag and narrows datums to endpoints", () => {
    const graph = createFilterTestGraph();
    const result = filterByEdgeTags(
      graph,
      createEdgeTagsFilter(["depends-on"]),
    );
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].fromDatumID).toBe("d2");
    expect(result.datums.map((d) => d.id)).toEqual(["d2", "d3"]);
  });

  it("returns graph unchanged when selectedTags is empty", () => {
    const graph = createFilterTestGraph();
    const result = filterByEdgeTags(graph, createEdgeTagsFilter([]));
    expect(result).toBe(graph);
  });
});

describe("filterByConnectedDatums", () => {
  it("keeps only selected datums and leaves edges to be reconciled later", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedDatums(
      graph,
      createConnectedDatumsFilter(["d2", "d3"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d2", "d3"]);
    expect(result.edges).toBe(graph.edges);
  });

  it("returns graph unchanged when selectedDatumIDs is empty", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedDatums(
      graph,
      createConnectedDatumsFilter([]),
    );
    expect(result).toBe(graph);
  });
});

describe("filterByDimensionValues", () => {
  it("keeps datums within the specified range and leaves edges alone", () => {
    const graph = createFilterTestGraph();
    const result = filterByDimensionValues(
      graph,
      createDimensionValuesFilter([
        { dimensionName: "importance", min: 5, max: 10 },
      ]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2", "d3"]);
    expect(result.edges).toBe(graph.edges);
  });

  it("excludes datums missing the specified dimension", () => {
    const graph = createFilterTestGraph();
    const result = filterByDimensionValues(
      graph,
      createDimensionValuesFilter([
        { dimensionName: "complexity", min: 1, max: 10 },
      ]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d3"]);
  });

  it("supports multiple range constraints", () => {
    const graph = createFilterTestGraph();
    const result = filterByDimensionValues(
      graph,
      createDimensionValuesFilter([
        { dimensionName: "importance", min: 5, max: 10 },
        { dimensionName: "complexity", min: 1, max: 5 },
      ]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1"]);
  });

  it("returns graph unchanged when ranges is empty", () => {
    const graph = createFilterTestGraph();
    const result = filterByDimensionValues(
      graph,
      createDimensionValuesFilter([]),
    );
    expect(result).toBe(graph);
  });
});

describe("makeConsistent", () => {
  it("drops edges whose endpoints are no longer in the datum set", () => {
    const graph = createFilterTestGraph();
    // Stub a graph that has lost d2 but still references it in edges.
    const result = makeConsistent({
      ...graph,
      datums: graph.datums.filter((d) => d.id !== "d2"),
    });
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d3", "d4"]);
    // d1->d2 and d2->d3 both touch d2; d3->d4 stays.
    expect(result.edges.map((e) => `${e.fromDatumID}->${e.toDatumID}`)).toEqual(
      ["d3->d4"],
    );
  });

  it("prunes datum-scoped and edge-scoped metadata to match", () => {
    const graph = createFilterTestGraph();
    const result = makeConsistent({
      ...graph,
      datums: graph.datums.filter((d) => d.id === "d3"),
    });
    expect(result.datumTags.map((t) => `${t.name}:${t.datumID}`)).toEqual([
      "tag-gamma:d3",
    ]);
    expect(result.datumDimensions.map((d) => `${d.name}:${d.datumID}`)).toEqual(
      ["importance:d3", "complexity:d3"],
    );
    // d3 was only part of d2->d3 and d3->d4; both reference a missing datum
    // after the prune (d2 stays as a fixture entry, d4 stays — but the
    // datum table only has d3, so both endpoints must be d3).
    expect(result.edges).toEqual([]);
    expect(result.edgeTags).toEqual([]);
  });
});
