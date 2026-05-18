import FilterPanel from "../../filter-panel/FilterPanel";
import { EMPTY_FILTER_STATE, FilterState } from "../../filtering/types";
import { GraphViewProps } from "../types";
import ViewSelector from "../ViewSelector";
import { useViewSelector } from "../ViewSelectorContext";

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
      {selector && (
        <div style={selectorSlotStyle}>
          <ViewSelector
            views={selector.views}
            activeIds={selector.activeIds}
            onActiveIdsChange={selector.onActiveIdsChange}
          />
        </div>
      )}
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
};
