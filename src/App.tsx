import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useActionLog } from "./action-log/useActionLog";
import {
  ActionLogProvider,
  DEFAULT_DEBOUNCE_MS,
} from "./action-log/ActionLogContext";
import { diffFilterState, diffViewIds } from "./action-log/diff";
import type { Action } from "./action-log/types";

type GraphSectProps = {
  graph: ExternalGraph;
  filterCallbacks?: FilterCallbacks;
  customGraphFilter?: CustomGraphFilter;
  views?: GraphView[];
  carousels?: Carousel[];
  defaultActiveViewIds?: string[];
  /**
   * Called for every user action that mutates filter state, the active view
   * list, the global datum selection, or any view-local state registered via
   * `useTrackedState`. Fires in the order the actions occur. Mutations to
   * the external graph are not actions and are not reported.
   */
  onAction?: (action: Action) => void;
  /**
   * Debounce window in milliseconds used by `useTrackedState` when it's
   * configured with `debounce: true`. Sliders, drag, and wheel zoom collapse
   * into one action per gesture using this window.
   * @default 300
   */
  debounceMs?: number;
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
  onAction,
  debounceMs = DEFAULT_DEBOUNCE_MS,
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

  // Action pipeline — every user action that updates filters, the active view
  // list, or the selected datum funnels through one of the three wrapped
  // setters below and is appended to the log in source order. Because all
  // action-worthy state is hoisted here, views and filters added later inherit
  // tracking automatically as long as they keep using these setters.
  const actionLog = useActionLog();
  const { record } = actionLog;
  const filterStateRef = useRef(filterState);
  const activeViewIdsRef = useRef(activeViewIds);
  const selectedDatumIdRef = useRef(selectedDatumId);
  filterStateRef.current = filterState;
  activeViewIdsRef.current = activeViewIds;
  selectedDatumIdRef.current = selectedDatumId;
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  useEffect(() => {
    let lastSeq = 0;
    return actionLog.subscribe(() => {
      const cb = onActionRef.current;
      if (!cb) return;
      const snapshot = actionLog.getSnapshot();
      for (const action of snapshot) {
        if (action.seq > lastSeq) {
          lastSeq = action.seq;
          cb(action);
        }
      }
    });
  }, [actionLog]);

  const handleFilterStateChange = useCallback(
    (next: FilterState) => {
      const prev = filterStateRef.current;
      if (prev === next) return;
      const changedKeys = diffFilterState(prev, next);
      if (changedKeys.length === 0) return;
      record({ type: "FILTER_CHANGED", prev, next, changedKeys });
      setFilterState(next);
    },
    [record],
  );

  const setActiveViewIds = useCallback(
    (next: string[]) => {
      const prev = activeViewIdsRef.current;
      const ensured = ensurePinned(next);
      const { added, removed } = diffViewIds(prev, ensured);
      if (added.length === 0 && removed.length === 0) return;
      record({
        type: "VIEWS_CHANGED",
        prev,
        next: ensured,
        added,
        removed,
      });
      setActiveViewIdsRaw(ensured);
    },
    [record],
  );

  const handleSelectedDatumIdChange = useCallback(
    (next: string | null) => {
      const prev = selectedDatumIdRef.current;
      if (prev === next) return;
      record({ type: "SELECTION_CHANGED", prev, next });
      setSelectedDatumId(next);
    },
    [record],
  );

  // Undo applies the popped action's `prev` via the raw setter so it doesn't
  // re-enter the action pipeline. Ref mirrors are updated synchronously so a
  // second undo immediately afterwards sees the rewound value.
  const undo = useCallback(() => {
    const action = actionLog.pop();
    if (!action) return;
    switch (action.type) {
      case "FILTER_CHANGED":
        filterStateRef.current = action.prev;
        setFilterState(action.prev);
        break;
      case "VIEWS_CHANGED":
        activeViewIdsRef.current = action.prev;
        setActiveViewIdsRaw(action.prev);
        break;
      case "SELECTION_CHANGED":
        selectedDatumIdRef.current = action.prev;
        setSelectedDatumId(action.prev);
        break;
      case "VIEW_ACTION": {
        // View-owned undo. If the view's component has unmounted between
        // recording and undoing, the registered undoer is gone — silently
        // skip rather than crash. The action is still popped, matching the
        // user's mental model of "undo always consumes one step."
        const undoer = actionLog.getUndoer(action.viewId, action.kind);
        undoer?.(action.prev);
        break;
      }
    }
  }, [actionLog]);

  const actionLogContextValue = useMemo(
    () => ({
      subscribe: actionLog.subscribe,
      getSnapshot: actionLog.getSnapshot,
      record: actionLog.record,
      registerUndoer: actionLog.registerUndoer,
      undo,
      debounceMs,
    }),
    [actionLog, undo, debounceMs],
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
    <ActionLogProvider value={actionLogContextValue}>
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
            onFilterStateChange={handleFilterStateChange}
            selectedDatumId={selectedDatumId}
            onSelectedDatumIdChange={handleSelectedDatumIdChange}
          />
        </ViewSelectorProvider>
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => handleSelectedDatumIdChange(null)}
        />
      </div>
    </ActionLogProvider>
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
