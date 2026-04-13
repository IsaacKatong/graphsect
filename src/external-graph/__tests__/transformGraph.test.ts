import { describe, it, expect } from "vitest";
import { transformGraph } from "../transformGraph";
import { createMockGraph } from "../__fixtures__/mockGraph";

describe("transformGraph", () => {
  it("transforms datums into nodes", () => {
    const result = transformGraph(createMockGraph());

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes[0]).toMatchObject({
      id: "node-1",
      name: "Node A",
      type: "MARKDOWN",
      content: "Content A",
    });
  });

  it("transforms edges into links", () => {
    const result = transformGraph(createMockGraph());

    expect(result.links).toHaveLength(2);
    expect(result.links[0]).toMatchObject({
      source: "node-1",
      target: "node-2",
    });
  });

  it("attaches datum tags to nodes", () => {
    const result = transformGraph(createMockGraph());

    expect(result.nodes[0].tags).toEqual(["tag-a", "tag-b"]);
    expect(result.nodes[1].tags).toEqual(["tag-a"]);
    expect(result.nodes[2].tags).toEqual([]);
  });

  it("attaches dimensions to nodes", () => {
    const result = transformGraph(createMockGraph());

    expect(result.nodes[0].dimensions).toEqual({ importance: 8 });
    expect(result.nodes[1].dimensions).toEqual({});
    expect(result.nodes[2].dimensions).toEqual({ complexity: 3 });
  });

  it("attaches edge tags to links", () => {
    const result = transformGraph(createMockGraph());

    expect(result.links[0].tags).toEqual(["edge-tag-1", "edge-tag-2"]);
    expect(result.links[1].tags).toEqual([]);
  });
});
