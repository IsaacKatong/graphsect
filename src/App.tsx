import { useState, useEffect } from "react";
import ForceGraph3DView from "./graph-view/ForceGraph3DView";
import NodeDetailPanel from "./graph-view/NodeDetailPanel";
import {
  transformGraph,
  ForceGraphData,
  ForceGraphNode,
} from "./external-graph/transformGraph";
import { ExternalGraph } from "./external-graph/types";
import graphJson from "../local-storage/graph.json";

export default function App() {
  const [graphData, setGraphData] = useState<ForceGraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<ForceGraphNode | null>(null);

  useEffect(() => {
    const data = transformGraph(graphJson as ExternalGraph);
    setGraphData(data);
  }, []);

  if (!graphData) return null;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <ForceGraph3DView data={graphData} onNodeClick={setSelectedNode} />
      <NodeDetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
