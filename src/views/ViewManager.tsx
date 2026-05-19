import { useMemo } from "react";
import { ExternalGraph } from "../external-graph/types";
import { FilterState } from "../filtering/types";
import ResizableViewStack from "./ResizableViewStack";
import { GraphView, ViewInstance } from "./types";

type ViewManagerProps = {
  views: GraphView[];
  activeViews: ViewInstance[];
  sourceGraph: ExternalGraph;
  filteredGraph: ExternalGraph;
  filterState: FilterState;
  onFilterStateChange: (next: FilterState) => void;
  selectedDatumId: string | null;
  onSelectedDatumIdChange: (id: string | null) => void;
};

/**
 * Active instances are rendered in the order they were added (the order in
 * `activeViews`). This is intentional: with multiple instances of the same
 * view type allowed, the user controls the stack order by add order, not by
 * a fixed registry order.
 */
export default function ViewManager({
  views,
  activeViews,
  sourceGraph,
  filteredGraph,
  filterState,
  onFilterStateChange,
  selectedDatumId,
  onSelectedDatumIdChange,
}: ViewManagerProps) {
  const viewsByType = useMemo(() => {
    const m = new Map<string, GraphView>();
    for (const v of views) m.set(v.id, v);
    return m;
  }, [views]);

  const stackEntries = useMemo(
    () =>
      activeViews
        .map((instance) => {
          const view = viewsByType.get(instance.typeId);
          return view ? { instance, view } : null;
        })
        .filter((e): e is { instance: ViewInstance; view: GraphView } => e !== null),
    [activeViews, viewsByType],
  );

  if (stackEntries.length === 0) {
    return (
      <div style={emptyStyle}>
        <p style={emptyTextStyle}>
          No views selected. Use the Add view menu to add one.
        </p>
      </div>
    );
  }

  return (
    <ResizableViewStack
      entries={stackEntries}
      renderView={({ instance, view }) => (
        <view.Component
          sourceGraph={sourceGraph}
          graph={filteredGraph}
          filterState={filterState}
          onFilterStateChange={onFilterStateChange}
          selectedDatumId={selectedDatumId}
          onSelectedDatumIdChange={onSelectedDatumIdChange}
          instanceId={instance.id}
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
