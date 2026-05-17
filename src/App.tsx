import { useCallback, useMemo, useState } from "react";
import { ExternalGraph } from "./external-graph/types";
import {
  FilterCallbacks,
  CustomGraphFilter,
  FilterState,
  EMPTY_FILTER_STATE,
} from "./filtering/types";
import { applyFilters } from "./filtering/applyFilters";
import { transformGraph } from "./external-graph/transformGraph";
import ViewManager from "./views/ViewManager";
import {
  BUILTIN_VIEWS,
  CAROUSELS_VIEW,
  FILTERS_VIEW,
} from "./views/builtinViews";
import { createCarouselsView } from "./views/views/CarouselsView";
import { GraphView } from "./views/types";
import { ViewSelectorProvider } from "./views/ViewSelectorContext";
import NodeDetailPanel from "./graph-view/NodeDetailPanel";
import { Carousel } from "./carousels/types";

type GraphSectProps = {
  graph: ExternalGraph;
  filterCallbacks?: FilterCallbacks;
  customGraphFilter?: CustomGraphFilter;
  views?: GraphView[];
  carousels?: Carousel[];
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
  views,
  carousels,
  defaultActiveViewIds = DEFAULT_ACTIVE_VIEW_IDS,
}: GraphSectProps) {
  const [filterState, setFilterState] =
    useState<FilterState>(EMPTY_FILTER_STATE);
  const [activeViewIds, setActiveViewIdsRaw] = useState<string[]>(() =>
    ensurePinned(defaultActiveViewIds),
  );
  // Global datum selection — one slot, shared across every view. Clicking a
  // datum anywhere replaces this id; the NodeDetailPanel below the stack
  // re-renders against the new selection. Set to `null` to close the panel.
  const [selectedDatumId, setSelectedDatumId] = useState<string | null>(null);

  const setActiveViewIds = useCallback(
    (next: string[]) => setActiveViewIdsRaw(ensurePinned(next)),
    [],
  );

  // If the caller passed a `views` array, use it verbatim. Otherwise use the
  // built-in registry, swapping in a freshly-built carousels view when the
  // caller has supplied custom carousels.
  const effectiveViews = useMemo<GraphView[]>(() => {
    if (views) return views;
    if (!carousels) return BUILTIN_VIEWS;
    const customCarouselsView = createCarouselsView(carousels);
    return BUILTIN_VIEWS.map((v) =>
      v.id === CAROUSELS_VIEW.id ? customCarouselsView : v,
    );
  }, [views, carousels]);

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
    () => effectiveViews.filter((v) => v.id !== PINNED_VIEW_ID),
    [effectiveViews],
  );
  const selectableActiveIds = useMemo(
    () => activeViewIds.filter((id) => id !== PINNED_VIEW_ID),
    [activeViewIds],
  );

  // Resolve the global selection against the *source* graph so the detail
  // panel keeps working even if a filter just hid the selected datum.
  const selectedNode = useMemo(() => {
    if (!selectedDatumId) return null;
    return (
      transformGraph(graph).nodes.find((n) => n.id === selectedDatumId) ?? null
    );
  }, [graph, selectedDatumId]);

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
          views={effectiveViews}
          activeIds={activeViewIds}
          sourceGraph={graph}
          filteredGraph={filteredGraph}
          filterState={filterState}
          onFilterStateChange={setFilterState}
          selectedDatumId={selectedDatumId}
          onSelectedDatumIdChange={setSelectedDatumId}
        />
      </ViewSelectorProvider>
      <NodeDetailPanel
        node={selectedNode}
        onClose={() => setSelectedDatumId(null)}
      />
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
