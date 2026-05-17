import { ExternalGraph } from "../../external-graph/types";

/**
 * A tiny graph with three tags whose scores are easy to verify by hand:
 *
 *   datum-1 — tag-a, tag-b           edges: 1->2, 1->3, 2->3
 *   datum-2 — tag-a                      degrees: 1=2, 2=2, 3=2
 *   datum-3 — tag-c
 *
 * score(tag-a) = |{1,2}| + deg(1) + deg(2) = 2 + 2 + 2 = 6
 * score(tag-b) = |{1}|   + deg(1)          = 1 + 2     = 3
 * score(tag-c) = |{3}|   + deg(3)          = 1 + 2     = 3
 */
export function createCarouselTestGraph(): ExternalGraph {
  return {
    version: 0,
    datums: [
      { id: "datum-1", name: "D1", type: "MARKDOWN", content: "" },
      { id: "datum-2", name: "D2", type: "MARKDOWN", content: "" },
      { id: "datum-3", name: "D3", type: "MARKDOWN", content: "" },
    ],
    edges: [
      { fromDatumID: "datum-1", toDatumID: "datum-2" },
      { fromDatumID: "datum-1", toDatumID: "datum-3" },
      { fromDatumID: "datum-2", toDatumID: "datum-3" },
    ],
    datumTags: [
      { name: "tag-a", datumID: "datum-1" },
      { name: "tag-b", datumID: "datum-1" },
      { name: "tag-a", datumID: "datum-2" },
      { name: "tag-c", datumID: "datum-3" },
    ],
    datumDimensions: [],
    datumTagAssociations: [],
    edgeTags: [],
  };
}
