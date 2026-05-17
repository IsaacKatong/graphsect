import { describe, expect, it } from "vitest";
import { computeTagScores } from "../scoreTag";
import { createCarouselTestGraph } from "../__fixtures__/mockCarouselGraph";
import { ExternalGraph } from "../../external-graph/types";

describe("computeTagScores", () => {
  it("computes |datums(T)| + Σ deg(d) for each tag", () => {
    const scores = computeTagScores(createCarouselTestGraph());
    expect(scores.get("tag-a")).toBe(6);
    expect(scores.get("tag-b")).toBe(3);
    expect(scores.get("tag-c")).toBe(3);
  });

  it("counts each edge twice — once per endpoint", () => {
    // A single edge between two datums sharing one tag: degree contributions
    // are 1 to each datum, summed with the |datums(T)| = 2 baseline gives 4.
    const graph: ExternalGraph = {
      version: 0,
      datums: [
        { id: "a", name: "A", type: "MARKDOWN", content: "" },
        { id: "b", name: "B", type: "MARKDOWN", content: "" },
      ],
      edges: [{ fromDatumID: "a", toDatumID: "b" }],
      datumTags: [
        { name: "shared", datumID: "a" },
        { name: "shared", datumID: "b" },
      ],
      datumDimensions: [],
      datumTagAssociations: [],
      edgeTags: [],
    };
    expect(computeTagScores(graph).get("shared")).toBe(4);
  });

  it("returns an empty map for a graph with no tags", () => {
    const graph: ExternalGraph = {
      version: 0,
      datums: [{ id: "a", name: "A", type: "MARKDOWN", content: "" }],
      edges: [],
      datumTags: [],
      datumDimensions: [],
      datumTagAssociations: [],
      edgeTags: [],
    };
    expect([...computeTagScores(graph).entries()]).toEqual([]);
  });

  it("scores a tag with no edges as just |datums(T)|", () => {
    const graph: ExternalGraph = {
      version: 0,
      datums: [
        { id: "a", name: "A", type: "MARKDOWN", content: "" },
        { id: "b", name: "B", type: "MARKDOWN", content: "" },
      ],
      edges: [],
      datumTags: [
        { name: "lonely", datumID: "a" },
        { name: "lonely", datumID: "b" },
      ],
      datumDimensions: [],
      datumTagAssociations: [],
      edgeTags: [],
    };
    expect(computeTagScores(graph).get("lonely")).toBe(2);
  });
});
