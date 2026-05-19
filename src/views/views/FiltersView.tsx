import FilterPanel from "../../filter-panel/FilterPanel";
import { EMPTY_FILTER_STATE, FilterState } from "../../filtering/types";
import { GraphViewProps } from "../types";
import AddViewMenu from "../ViewSelector";
import { useViewSelector } from "../ViewSelectorContext";
import UndoButton from "../../action-log/UndoButton";

export default function FiltersView({
  graph,
  filterState,
  onFilterStateChange,
}: GraphViewProps) {
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
    <div style={panelStyle}>
      <FilterPanel
        graph={graph}
        filterState={filterState}
        onFilterChange={setFilter}
        onClearAll={clearAll}
      />
      <div style={selectorSlotStyle}>
        <UndoButton />
        {selector && (
          <AddViewMenu
            addableTypes={selector.addableTypes}
            onAdd={selector.onAdd}
          />
        )}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  padding: "12px",
  overflowY: "auto",
  backgroundColor: "#0f172a",
  boxSizing: "border-box",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const selectorSlotStyle: React.CSSProperties = {
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: "8px",
};
