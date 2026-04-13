import { useEffect, useRef, useCallback } from "react";
import ForceGraph3D from "3d-force-graph";
import { ForceGraphData, ForceGraphNode } from "../external-graph/transformGraph";

type ForceGraph3DViewProps = {
  data: ForceGraphData;
  onNodeClick: (node: ForceGraphNode) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphInstance = any;

export default function ForceGraph3DView({
  data,
  onNodeClick,
}: ForceGraph3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphInstance>(null);

  const handleNodeClick = useCallback(
    (node: object) => {
      onNodeClick(node as ForceGraphNode);
    },
    [onNodeClick],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const init = ForceGraph3D as unknown as (
      ...args: unknown[]
    ) => (el: HTMLElement) => ForceGraphInstance;

    const graph = init()(containerRef.current)
      .graphData(data)
      .nodeLabel("name")
      .nodeColor(() => "#6366f1")
      .nodeVal((node: ForceGraphNode) => {
        const importance = node.dimensions["importance"];
        return importance ?? 4;
      })
      .linkColor(() => "#94a3b8")
      .linkOpacity(0.4)
      .linkWidth(1)
      .onNodeClick(handleNodeClick)
      .backgroundColor("#0f172a");

    graphRef.current = graph;

    return () => {
      graph._destructor?.();
    };
    // Only create the instance once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.graphData(data);
    }
  }, [data]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.onNodeClick(handleNodeClick);
    }
  }, [handleNodeClick]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
