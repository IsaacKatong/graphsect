import { describe, it, expect } from "vitest";
import {
  filterByDatumType,
  filterByDatumTags,
  filterByConnectedEdges,
  filterByEdgeTags,
  filterByConnectedDatums,
  filterByDimensionValues,
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

describe("filterByDatumType", () => {
  it("keeps only datums matching selected types", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumType(graph, createDatumTypeFilter(["MARKDOWN"]));
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2"]);
  });

  it("prunes edges not connecting kept datums", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumType(graph, createDatumTypeFilter(["CODE"]));
    expect(result.datums.map((d) => d.id)).toEqual(["d3"]);
    expect(result.edges).toEqual([]);
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
    expect(result.edges).toHaveLength(2);
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
  });

  it("prunes orphaned edges", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumTags(
      graph,
      createDatumTagsFilter(["tag-gamma"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d3"]);
    expect(result.edges).toEqual([]);
  });

  it("returns graph unchanged when selectedTags is empty", () => {
    const graph = createFilterTestGraph();
    const result = filterByDatumTags(graph, createDatumTagsFilter([]));
    expect(result).toBe(graph);
  });
});

describe("filterByConnectedEdges", () => {
  it("keeps only datums connected by selected edges", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedEdges(
      graph,
      createConnectedEdgesFilter(["d1->d2"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(result.edges).toHaveLength(1);
  });

  it("keeps edge tags for selected edges only", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedEdges(
      graph,
      createConnectedEdgesFilter(["d1->d2"]),
    );
    expect(result.edgeTags.map((t) => t.name)).toEqual(["related"]);
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
  it("keeps edges with at least one selected tag", () => {
    const graph = createFilterTestGraph();
    const result = filterByEdgeTags(
      graph,
      createEdgeTagsFilter(["depends-on"]),
    );
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].fromDatumID).toBe("d2");
  });

  it("prunes datums not connected by remaining edges", () => {
    const graph = createFilterTestGraph();
    const result = filterByEdgeTags(
      graph,
      createEdgeTagsFilter(["depends-on"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d2", "d3"]);
  });

  it("returns graph unchanged when selectedTags is empty", () => {
    const graph = createFilterTestGraph();
    const result = filterByEdgeTags(graph, createEdgeTagsFilter([]));
    expect(result).toBe(graph);
  });
});

describe("filterByConnectedDatums", () => {
  it("keeps only selected datums and edges between them", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedDatums(
      graph,
      createConnectedDatumsFilter(["d2", "d3"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d2", "d3"]);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].fromDatumID).toBe("d2");
  });

  it("returns only the selected datum with no edges when selected alone", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedDatums(
      graph,
      createConnectedDatumsFilter(["d1"]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1"]);
    expect(result.edges).toHaveLength(0);
  });

  it("prunes edge tags for removed edges", () => {
    const graph = createFilterTestGraph();
    const result = filterByConnectedDatums(
      graph,
      createConnectedDatumsFilter(["d3", "d4"]),
    );
    expect(result.edges).toHaveLength(1);
    expect(result.edgeTags.map((t) => t.name)).toEqual(["references"]);
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
  it("keeps datums within the specified range", () => {
    const graph = createFilterTestGraph();
    const result = filterByDimensionValues(
      graph,
      createDimensionValuesFilter([
        { dimensionName: "importance", min: 5, max: 10 },
      ]),
    );
    expect(result.datums.map((d) => d.id)).toEqual(["d1", "d2", "d3"]);
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
