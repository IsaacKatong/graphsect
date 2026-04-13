import { useState, useMemo } from "react";
import ForceGraph3DView from "./graph-view/ForceGraph3DView";
import NodeDetailPanel from "./graph-view/NodeDetailPanel";
import FilterPanel from "./filter-panel/FilterPanel";
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
};

function GraphSect({
  graph,
  filterCallbacks,
  customGraphFilter,
  hideDefaultFilters,
}: GraphSectProps) {
  const [selectedNode, setSelectedNode] = useState<ForceGraphNode | null>(null);
  const { filterState, setFilter, clearAllFilters } = useFilterState();

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

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ForceGraph3DView data={graphData} onNodeClick={setSelectedNode} />
      {showFilters && (
        <FilterPanel
          sourceGraph={graph}
          filterState={filterState}
          onFilterChange={setFilter}
          onClearAll={clearAllFilters}
        />
      )}
      <NodeDetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <GraphSect graph={graphJson as ExternalGraph} />
    </div>
  );
}
