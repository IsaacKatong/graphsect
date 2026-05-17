import { useMemo } from "react";
import { ExternalGraph } from "../external-graph/types";
import { FilterState } from "../filtering/types";
import ResizableViewStack from "./ResizableViewStack";
import { GraphView } from "./types";

type ViewManagerProps = {
  views: GraphView[];
  activeIds: string[];
  sourceGraph: ExternalGraph;
  filteredGraph: ExternalGraph;
  filterState: FilterState;
  onFilterStateChange: (next: FilterState) => void;
};

export default function ViewManager({
  views,
  activeIds,
  sourceGraph,
  filteredGraph,
  filterState,
  onFilterStateChange,
}: ViewManagerProps) {
  // Active views render in registry order, not selection order, so the stack
  // is stable regardless of which order the user toggled views on.
  const active = useMemo(
    () => views.filter((v) => activeIds.includes(v.id)),
    [views, activeIds],
  );

  if (active.length === 0) {
    return (
      <div style={emptyStyle}>
        <p style={emptyTextStyle}>No views selected. Use the Views menu to add one.</p>
      </div>
    );
  }

  return (
    <ResizableViewStack
      views={active}
      renderView={(view) => (
        <view.Component
          sourceGraph={sourceGraph}
          graph={filteredGraph}
          filterState={filterState}
          onFilterStateChange={onFilterStateChange}
        />
      )}
    />
  );
}

const emptyStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#0f172a",
};

const emptyTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
};
