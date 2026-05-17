import { useMemo, useState } from "react";
import PlotView from "../../plotting/PlotView";
import DimensionSelector from "../../plotting/DimensionSelector";
import NodeDetailPanel from "../../graph-view/NodeDetailPanel";
import {
  transformGraph,
  ForceGraphNode,
} from "../../external-graph/transformGraph";
import { GraphViewProps } from "../types";

export default function PlotGraphView({ sourceGraph, graph }: GraphViewProps) {
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [showEdges, setShowEdges] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ForceGraphNode | null>(null);

  const graphData = useMemo(() => transformGraph(graph), [graph]);

  return (
    <div style={containerStyle}>
      {dimensions.length === 0 ? (
        <div style={emptyStyle}>
          <p style={emptyTextStyle}>
            Pick one to three dimensions to plot datums against.
          </p>
        </div>
      ) : (
        <PlotView
          graph={graph}
          dimensions={dimensions}
          showEdges={showEdges}
          onNodeClick={(datumId) => {
            const node = graphData.nodes.find((n) => n.id === datumId);
            if (node) setSelectedNode(node);
          }}
        />
      )}
      <div style={toolbarStyle}>
        <DimensionSelector
          graph={sourceGraph}
          selected={dimensions}
          onSelectionChange={setDimensions}
          showEdges={showEdges}
          onShowEdgesChange={setShowEdges}
          open={open}
          onOpenChange={setOpen}
        />
      </div>
      <NodeDetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  backgroundColor: "#0f172a",
};

const toolbarStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  pointerEvents: "auto",
  zIndex: 50,
};

const emptyStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
};
