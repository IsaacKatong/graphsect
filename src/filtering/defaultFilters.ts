import { ExternalGraph } from "../external-graph/types";
import {
  DatumTypeFilter,
  DatumTagsFilter,
  ConnectedEdgesFilter,
  EdgeTagsFilter,
  ConnectedDatumsFilter,
  DimensionValuesFilter,
} from "./types";

function pruneOrphanedEdges(graph: ExternalGraph): ExternalGraph {
  const datumIDs = new Set(graph.datums.map((d) => d.id));
  const edges = graph.edges.filter(
    (e) => datumIDs.has(e.fromDatumID) && datumIDs.has(e.toDatumID),
  );
  const edgeIDSet = new Set(
    edges.map((e) => `${e.fromDatumID}->${e.toDatumID}`),
  );
  return {
    ...graph,
    edges,
    edgeTags: graph.edgeTags.filter((t) => edgeIDSet.has(t.edgeID)),
  };
}

function pruneOrphanedDatums(graph: ExternalGraph): ExternalGraph {
  const connectedDatumIDs = new Set<string>();
  for (const edge of graph.edges) {
    connectedDatumIDs.add(edge.fromDatumID);
    connectedDatumIDs.add(edge.toDatumID);
  }
  const datums = graph.datums.filter((d) => connectedDatumIDs.has(d.id));
  const datumIDSet = new Set(datums.map((d) => d.id));
  return {
    ...graph,
    datums,
    datumTags: graph.datumTags.filter((t) => datumIDSet.has(t.datumID)),
    datumDimensions: graph.datumDimensions.filter((d) =>
      datumIDSet.has(d.datumID),
    ),
    datumTagAssociations: graph.datumTagAssociations.filter(
      (a) =>
        graph.datumTags.some(
          (t) => t.name === a.childTagName && datumIDSet.has(t.datumID),
        ) ||
        graph.datumTags.some(
          (t) => t.name === a.parentTagName && datumIDSet.has(t.datumID),
        ),
    ),
  };
}

export function filterByDatumType(
  graph: ExternalGraph,
  filter: DatumTypeFilter,
): ExternalGraph {
  if (filter.selectedTypes.length === 0) return graph;
  const typeSet = new Set(filter.selectedTypes);
  const datums = graph.datums.filter((d) => typeSet.has(d.type));
  return pruneOrphanedEdges({ ...graph, datums });
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
  const datums = graph.datums.filter((d) => matchingDatumIDs.has(d.id));
  return pruneOrphanedEdges({ ...graph, datums });
}

export function filterByConnectedEdges(
  graph: ExternalGraph,
  filter: ConnectedEdgesFilter,
): ExternalGraph {
  if (filter.selectedEdgeIDs.length === 0) return graph;
  const edgeIDSet = new Set(filter.selectedEdgeIDs);
  const edges = graph.edges.filter((e) =>
    edgeIDSet.has(`${e.fromDatumID}->${e.toDatumID}`),
  );
  const connectedDatumIDs = new Set<string>();
  for (const edge of edges) {
    connectedDatumIDs.add(edge.fromDatumID);
    connectedDatumIDs.add(edge.toDatumID);
  }
  const datums = graph.datums.filter((d) => connectedDatumIDs.has(d.id));
  const edgeIDSetFinal = new Set(
    edges.map((e) => `${e.fromDatumID}->${e.toDatumID}`),
  );
  return {
    ...graph,
    datums,
    edges,
    datumTags: graph.datumTags.filter((t) => connectedDatumIDs.has(t.datumID)),
    datumDimensions: graph.datumDimensions.filter((d) =>
      connectedDatumIDs.has(d.datumID),
    ),
    edgeTags: graph.edgeTags.filter((t) => edgeIDSetFinal.has(t.edgeID)),
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
  const edges = graph.edges.filter((e) =>
    matchingEdgeIDs.has(`${e.fromDatumID}->${e.toDatumID}`),
  );
  return pruneOrphanedDatums({ ...graph, edges });
}

export function filterByConnectedDatums(
  graph: ExternalGraph,
  filter: ConnectedDatumsFilter,
): ExternalGraph {
  if (filter.selectedDatumIDs.length === 0) return graph;
  const datumIDSet = new Set(filter.selectedDatumIDs);
  const edges = graph.edges.filter(
    (e) => datumIDSet.has(e.fromDatumID) || datumIDSet.has(e.toDatumID),
  );
  const edgeIDSet = new Set(
    edges.map((e) => `${e.fromDatumID}->${e.toDatumID}`),
  );
  return {
    ...graph,
    edges,
    edgeTags: graph.edgeTags.filter((t) => edgeIDSet.has(t.edgeID)),
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
  return pruneOrphanedEdges({ ...graph, datums });
}
