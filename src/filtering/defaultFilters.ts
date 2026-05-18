import { ExternalGraph } from "../external-graph/types";
import {
  DatumTypeFilter,
  DatumTagsFilter,
  ConnectedEdgesFilter,
  EdgeTagsFilter,
  ConnectedDatumsFilter,
  DimensionValuesFilter,
} from "./types";

function edgeID(e: { fromDatumID: string; toDatumID: string }): string {
  return `${e.fromDatumID}->${e.toDatumID}`;
}

function endpointSet(
  edges: Iterable<{ fromDatumID: string; toDatumID: string }>,
): Set<string> {
  const out = new Set<string>();
  for (const e of edges) {
    out.add(e.fromDatumID);
    out.add(e.toDatumID);
  }
  return out;
}

/**
 * Drop edges that reference a datum no longer present, and prune every
 * datum-scoped or edge-scoped metadata table down to what's still
 * referenced. Each individual filter narrows only its primary scope (datums
 * or edges) and leaves the rest untouched; `applyFilters` calls this once
 * at the end of the pipeline so cross-table consistency is handled in one
 * place, regardless of filter order or which subset of filters was active.
 */
export function makeConsistent(graph: ExternalGraph): ExternalGraph {
  const datumIDs = new Set(graph.datums.map((d) => d.id));
  const edges = graph.edges.filter(
    (e) => datumIDs.has(e.fromDatumID) && datumIDs.has(e.toDatumID),
  );
  const edgeIDSet = new Set(edges.map(edgeID));
  const datumTags = graph.datumTags.filter((t) => datumIDs.has(t.datumID));
  const survivingTagNames = new Set(datumTags.map((t) => t.name));
  return {
    ...graph,
    edges,
    edgeTags: graph.edgeTags.filter((t) => edgeIDSet.has(t.edgeID)),
    datumTags,
    datumDimensions: graph.datumDimensions.filter((d) =>
      datumIDs.has(d.datumID),
    ),
    datumTagAssociations: graph.datumTagAssociations.filter(
      (a) =>
        survivingTagNames.has(a.childTagName) ||
        survivingTagNames.has(a.parentTagName),
    ),
  };
}

export function filterByDatumType(
  graph: ExternalGraph,
  filter: DatumTypeFilter,
): ExternalGraph {
  if (filter.selectedTypes.length === 0) return graph;
  const typeSet = new Set(filter.selectedTypes);
  return {
    ...graph,
    datums: graph.datums.filter((d) => typeSet.has(d.type)),
  };
}

export function filterByDatumTags(
  graph: ExternalGraph,
  filter: DatumTagsFilter,
): ExternalGraph {
  if (filter.selectedTags.length === 0) return graph;
  const tagSet = new Set(filter.selectedTags);
  const matchingDatumIDs = new Set(
    graph.datumTags.filter((t) => tagSet.has(t.name)).map((t) => t.datumID),
  );
  return {
    ...graph,
    datums: graph.datums.filter((d) => matchingDatumIDs.has(d.id)),
  };
}

export function filterByConnectedEdges(
  graph: ExternalGraph,
  filter: ConnectedEdgesFilter,
): ExternalGraph {
  if (filter.selectedEdgeIDs.length === 0) return graph;
  const edgeIDSet = new Set(filter.selectedEdgeIDs);
  // Narrow edges to the user's selection AND narrow datums to the endpoints
  // of those edges — the second step is part of this filter's intent
  // ("only show datums on these edges"), and intersects with any other
  // datum-narrowing filter the pipeline applies.
  const edges = graph.edges.filter((e) => edgeIDSet.has(edgeID(e)));
  const endpoints = endpointSet(edges);
  return {
    ...graph,
    edges,
    datums: graph.datums.filter((d) => endpoints.has(d.id)),
  };
}

export function filterByEdgeTags(
  graph: ExternalGraph,
  filter: EdgeTagsFilter,
): ExternalGraph {
  if (filter.selectedTags.length === 0) return graph;
  const tagSet = new Set(filter.selectedTags);
  const matchingEdgeIDs = new Set(
    graph.edgeTags.filter((t) => tagSet.has(t.name)).map((t) => t.edgeID),
  );
  const edges = graph.edges.filter((e) => matchingEdgeIDs.has(edgeID(e)));
  const endpoints = endpointSet(edges);
  return {
    ...graph,
    edges,
    datums: graph.datums.filter((d) => endpoints.has(d.id)),
  };
}

export function filterByConnectedDatums(
  graph: ExternalGraph,
  filter: ConnectedDatumsFilter,
): ExternalGraph {
  if (filter.selectedDatumIDs.length === 0) return graph;
  const datumIDSet = new Set(filter.selectedDatumIDs);
  return {
    ...graph,
    datums: graph.datums.filter((d) => datumIDSet.has(d.id)),
  };
}

export function filterByDimensionValues(
  graph: ExternalGraph,
  filter: DimensionValuesFilter,
): ExternalGraph {
  if (filter.ranges.length === 0) return graph;
  const dimensionMap = new Map<string, Map<string, number>>();
  for (const dim of graph.datumDimensions) {
    let byDatum = dimensionMap.get(dim.datumID);
    if (!byDatum) {
      byDatum = new Map();
      dimensionMap.set(dim.datumID, byDatum);
    }
    byDatum.set(dim.name, dim.value);
  }
  const datums = graph.datums.filter((d) => {
    const dims = dimensionMap.get(d.id);
    return filter.ranges.every((range) => {
      const value = dims?.get(range.dimensionName);
      if (value === undefined) return false;
      return value >= range.min && value <= range.max;
    });
  });
  return { ...graph, datums };
}
