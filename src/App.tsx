import { useCallback, useMemo, useState } from "react";
import { ExternalGraph } from "./external-graph/types";
import {
  FilterCallbacks,
  CustomGraphFilter,
  FilterState,
  EMPTY_FILTER_STATE,
} from "./filtering/types";
import { applyFilters } from "./filtering/applyFilters";
import ViewManager from "./views/ViewManager";
import { BUILTIN_VIEWS, FILTERS_VIEW } from "./views/builtinViews";
import { GraphView } from "./views/types";
import { ViewSelectorProvider } from "./views/ViewSelectorContext";

type GraphSectProps = {
  graph: ExternalGraph;
  filterCallbacks?: FilterCallbacks;
  customGraphFilter?: CustomGraphFilter;
  views?: GraphView[];
  defaultActiveViewIds?: string[];
};

const PINNED_VIEW_ID = FILTERS_VIEW.id;
const DEFAULT_ACTIVE_VIEW_IDS = [PINNED_VIEW_ID, "tag-mesh"];

function ensurePinned(ids: string[]): string[] {
  return ids.includes(PINNED_VIEW_ID) ? ids : [PINNED_VIEW_ID, ...ids];
}

function GraphSect({
  graph,
  filterCallbacks,
  customGraphFilter,
  views = BUILTIN_VIEWS,
  defaultActiveViewIds = DEFAULT_ACTIVE_VIEW_IDS,
}: GraphSectProps) {
  const [filterState, setFilterState] =
    useState<FilterState>(EMPTY_FILTER_STATE);
  const [activeViewIds, setActiveViewIdsRaw] = useState<string[]>(() =>
    ensurePinned(defaultActiveViewIds),
  );

  const setActiveViewIds = useCallback(
    (next: string[]) => setActiveViewIdsRaw(ensurePinned(next)),
    [],
  );

  const filteredGraph = useMemo(() => {
    if (customGraphFilter) return customGraphFilter(graph);
    return applyFilters(graph, filterState, filterCallbacks);
  }, [graph, filterState, filterCallbacks, customGraphFilter]);

  // The Views selector lives inside the pinned Filters view; only non-pinned
  // views appear in its dropdown so the pinned view can't be toggled off.
  // We also strip the pinned id from activeIds before exposing it so the
  // selector's badge counts only togglable views (the pinned wrapper
  // `setActiveViewIds` re-adds the pin on emit).
  const selectableViews = useMemo(
    () => views.filter((v) => v.id !== PINNED_VIEW_ID),
    [views],
  );
  const selectableActiveIds = useMemo(
    () => activeViewIds.filter((id) => id !== PINNED_VIEW_ID),
    [activeViewIds],
  );

  return (
    <div style={rootStyle}>
      <ViewSelectorProvider
        value={{
          views: selectableViews,
          activeIds: selectableActiveIds,
          onActiveIdsChange: setActiveViewIds,
        }}
      >
        <ViewManager
          views={views}
          activeIds={activeViewIds}
          sourceGraph={graph}
          filteredGraph={filteredGraph}
          filterState={filterState}
          onFilterStateChange={setFilterState}
        />
      </ViewSelectorProvider>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#0f172a",
  position: "relative",
  minHeight: 0,
};

export { GraphSect as default, type GraphSectProps };
