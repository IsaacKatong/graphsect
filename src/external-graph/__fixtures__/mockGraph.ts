import { ExternalGraph } from "../types";

export function createMockGraph(): ExternalGraph {
  return {
    version: 0,
    datums: [
      { id: "node-1", name: "Node A", type: "MARKDOWN", content: "Content A" },
      { id: "node-2", name: "Node B", type: "MARKDOWN", content: "Content B" },
      { id: "node-3", name: "Node C", type: "MARKDOWN", content: "Content C" },
    ],
    edges: [
      { fromDatumID: "node-1", toDatumID: "node-2" },
      { fromDatumID: "node-2", toDatumID: "node-3" },
    ],
    datumTags: [
      { name: "tag-a", datumID: "node-1" },
      { name: "tag-b", datumID: "node-1" },
      { name: "tag-a", datumID: "node-2" },
    ],
    datumDimensions: [
      { name: "importance", datumID: "node-1", value: 8 },
      { name: "complexity", datumID: "node-3", value: 3 },
    ],
    datumTagAssociations: [],
    edgeTags: [
      { name: "edge-tag-1", edgeID: "node-1->node-2" },
      { name: "edge-tag-2", edgeID: "node-1->node-2" },
    ],
  };
}
