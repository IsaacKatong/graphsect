import { ExternalGraph } from "./types";

export type ForceGraphNode = {
  id: string;
  name: string;
  type: string;
  content: string;
  tags: string[];
  dimensions: Record<string, number>;
};

export type ForceGraphLink = {
  source: string;
  target: string;
  tags: string[];
};

export type ForceGraphData = {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
};

export function transformGraph(graph: ExternalGraph): ForceGraphData {
  const tagsByDatum = new Map<string, string[]>();
  for (const tag of graph.datumTags) {
    const existing = tagsByDatum.get(tag.datumID) ?? [];
    existing.push(tag.name);
    tagsByDatum.set(tag.datumID, existing);
  }

  const dimensionsByDatum = new Map<string, Record<string, number>>();
  for (const dim of graph.datumDimensions) {
    const existing = dimensionsByDatum.get(dim.datumID) ?? {};
    existing[dim.name] = dim.value;
    dimensionsByDatum.set(dim.datumID, existing);
  }

  const edgeTagsByID = new Map<string, string[]>();
  for (const tag of graph.edgeTags) {
    const existing = edgeTagsByID.get(tag.edgeID) ?? [];
    existing.push(tag.name);
    edgeTagsByID.set(tag.edgeID, existing);
  }

  const nodes: ForceGraphNode[] = graph.datums.map((datum) => ({
    id: datum.id,
    name: datum.name,
    type: datum.type,
    content: datum.content,
    tags: tagsByDatum.get(datum.id) ?? [],
    dimensions: dimensionsByDatum.get(datum.id) ?? {},
  }));

  const links: ForceGraphLink[] = graph.edges.map((edge) => {
    const edgeID = `${edge.fromDatumID}->${edge.toDatumID}`;
    return {
      source: edge.fromDatumID,
      target: edge.toDatumID,
      tags: edgeTagsByID.get(edgeID) ?? [],
    };
  });

  return { nodes, links };
}
