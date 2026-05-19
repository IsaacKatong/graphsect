import FilterPanel from "./filter-panel/FilterPanel";
import {
  EMPTY_FILTER_STATE,
  FilterState,
} from "./filtering/types";
import { ExternalGraph } from "./external-graph/types";
import AddViewMenu from "./views/ViewSelector";
import { useViewSelector } from "./views/ViewSelectorContext";
import UndoButton from "./action-log/UndoButton";

type ToolbarProps = {
  /** Post-filter graph — dropdown options narrow with the current filter set. */
  graph: ExternalGraph;
  filterState: FilterState;
  onFilterStateChange: (next: FilterState) => void;
};

/**
 * Top-of-app toolbar.
 *
 * Top row: Undo + Add view (left-aligned). The Add view menu is rendered
 * here because the toolbar is the only place in the layout that's always
 * present — the view stack underneath is fully user-controlled and can be
 * empty. Bottom row: the filter buttons.
 */
export default function Toolbar({
  graph,
  filterState,
  onFilterStateChange,
}: ToolbarProps) {
  const selector = useViewSelector();

  function setFilter<K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) {
    onFilterStateChange({ ...filterState, [key]: value });
  }

  function clearAll() {
    onFilterStateChange(EMPTY_FILTER_STATE);
  }

  return (
    <div style={rootStyle} data-testid="toolbar">
      <div style={topRowStyle}>
        <UndoButton />
        {selector && (
          <AddViewMenu
            addableTypes={selector.addableTypes}
            onAdd={selector.onAdd}
          />
        )}
      </div>
      <div style={bottomRowStyle}>
        <FilterPanel
          graph={graph}
          filterState={filterState}
          onFilterChange={setFilter}
          onClearAll={clearAll}
        />
      </div>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#0f172a",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "#1e293b",
  flexShrink: 0,
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const bottomRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  // Filter buttons inside this row are a flex container that wraps; let it
  // span the full width.
  width: "100%",
};
