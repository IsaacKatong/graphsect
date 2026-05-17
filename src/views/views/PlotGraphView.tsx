import { useState } from "react";
import PlotView from "../../plotting/PlotView";
import DimensionSelector from "../../plotting/DimensionSelector";
import { GraphViewProps } from "../types";

export default function PlotGraphView({
  sourceGraph,
  graph,
  onSelectedDatumIdChange,
}: GraphViewProps) {
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [showEdges, setShowEdges] = useState(false);
  const [open, setOpen] = useState(false);

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
          onNodeClick={(datumId) => onSelectedDatumIdChange(datumId)}
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
