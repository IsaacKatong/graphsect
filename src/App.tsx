import { useState, useMemo } from "react";
import ForceGraph3DView from "./graph-view/ForceGraph3DView";
import NodeDetailPanel from "./graph-view/NodeDetailPanel";
import FilterPanel from "./filter-panel/FilterPanel";
import PlotView from "./plotting/PlotView";
import DimensionSelector from "./plotting/DimensionSelector";
import { useDimensionSelection } from "./plotting/useDimensionSelection";
import {
  transformGraph,
  ForceGraphNode,
} from "./external-graph/transformGraph";
import { ExternalGraph } from "./external-graph/types";
import {
  FilterCallbacks,
  CustomGraphFilter,
} from "./filtering/types";
import { useFilterState } from "./filtering/useFilterState";
import { applyFilters } from "./filtering/applyFilters";
import graphJson from "../local-storage/graph.json";

type GraphSectProps = {
  graph: ExternalGraph;
  filterCallbacks?: FilterCallbacks;
  customGraphFilter?: CustomGraphFilter;
  hideDefaultFilters?: boolean;
  hideDefaultDimensionSelector?: boolean;
  onDimensionsChange?: (dimensions: string[]) => void;
  selectedDimensions?: string[];
};

function GraphSect({
  graph,
  filterCallbacks,
  customGraphFilter,
  hideDefaultFilters,
  hideDefaultDimensionSelector,
  onDimensionsChange,
  selectedDimensions: controlledDimensions,
}: GraphSectProps) {
  const [selectedNode, setSelectedNode] = useState<ForceGraphNode | null>(null);
  const { filterState, setFilter, clearAllFilters } = useFilterState();
  const internal = useDimensionSelection();

  const isControlled = controlledDimensions !== undefined;
  const activeDimensions = isControlled
    ? controlledDimensions
    : internal.selectedDimensions;

  function handleDimensionsChange(dimensions: string[]) {
    if (isControlled) {
      onDimensionsChange?.(dimensions);
    } else {
      internal.setDimensions(dimensions);
      onDimensionsChange?.(dimensions);
    }
  }

  const filteredGraph = useMemo(() => {
    if (customGraphFilter) {
      return customGraphFilter(graph);
    }
    return applyFilters(graph, filterState, filterCallbacks);
  }, [graph, filterState, filterCallbacks, customGraphFilter]);

  const graphData = useMemo(
    () => transformGraph(filteredGraph),
    [filteredGraph],
  );

  const showFilters = !hideDefaultFilters && !customGraphFilter;
  const showDimensionSelector = !hideDefaultDimensionSelector;
  const showPlot = activeDimensions.length > 0;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {showPlot ? (
        <PlotView graph={filteredGraph} dimensions={activeDimensions} />
      ) : (
        <ForceGraph3DView data={graphData} onNodeClick={setSelectedNode} />
      )}
      {(showFilters || showDimensionSelector) && (
        <div style={toolbarStyle}>
          {showFilters ? (
            <FilterPanel
              sourceGraph={graph}
              filterState={filterState}
              onFilterChange={setFilter}
              onClearAll={clearAllFilters}
            />
          ) : (
            <div />
          )}
          {showDimensionSelector && (
            <DimensionSelector
              graph={graph}
              selected={activeDimensions}
              onSelectionChange={handleDimensionsChange}
            />
          )}
        </div>
      )}
      {!showPlot && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  position: "absolute",
  top: "12px",
  left: "12px",
  right: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  zIndex: 50,
  pointerEvents: "none",
};

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <GraphSect graph={graphJson as ExternalGraph} />
    </div>
  );
}
