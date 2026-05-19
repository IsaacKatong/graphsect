# views

The view-management layer. Everything the user sees of an `ExternalGraph` is a
`GraphView`, and this folder is responsible for:

- Defining the `GraphView` contract.
- Maintaining the registry of built-in views (filters, tag mesh, plot).
- Letting the user **add** instances of any view type via `AddViewMenu`. The
  same view type can be added multiple times — each instance carries its own
  state and its own undo history.
- Stacking active instances full-width with drag-to-resize heights
  (`ResizableViewStack`), each non-pinned instance rendered with a small
  header strip and a close (×) button.
- Feeding every active instance a consistent slice of the world: the source
  graph, the filtered graph, the current filter state, the current selection,
  and the instance's unique id.

## The GraphView contract

A `GraphView` is a single object:

```ts
type GraphView = {
  id: string;            // stable id used for activation + height tracking
  name: string;          // label in the Views menu
  minHeight?: number;    // minimum pixel height in the stack (default 200)
  Component: ComponentType<GraphViewProps>;
};

type GraphViewProps = {
  sourceGraph: ExternalGraph;                       // pre-filter
  graph: ExternalGraph;                             // post-filter — what you display
  filterState: FilterState;                         // current filter state
  onFilterStateChange: (next: FilterState) => void; // edit the filter state
  selectedDatumId: string | null;                   // globally-selected datum, or null
  onSelectedDatumIdChange: (id: string | null) => void;
  instanceId: string;                               // unique id for THIS instance
};

type ViewInstance = {
  id: string;     // unique across the live stack
  typeId: string; // references GraphView.id in the registry
};
```

A view receives both the raw `sourceGraph` (e.g. to enumerate all possible
filter options) and the `graph` that's already had the current filter state
applied (what most views actually render). It may optionally update
`filterState` — that's how the built-in filter view contributes to the pipeline.

Because the filter state and the external graph live above all views, every
active view re-renders whenever either changes — there is no per-view stale
state to worry about. The same is true for `selectedDatumId`: it lives at the
`<GraphSect>` level, every view sees the same value, and the single shared
`<NodeDetailPanel>` that `<GraphSect>` renders below the stack reflects
whatever datum any view most recently selected. Views that don't surface
clickable datums can simply ignore the prop.

## Built-in views

- `FILTERS_VIEW` — wraps the legacy `FilterPanel`. Reads `sourceGraph` to
  enumerate options, writes `filterState`.
- `TAG_MESH_VIEW` — wraps the 2D tag mesh. Reads the filtered `graph`.
- `PLOT_VIEW` — wraps the dimension scatter plot and its dimension picker.
  Reads both the `sourceGraph` (for picking dimensions) and the filtered
  `graph` (for what to plot). Also hosts the `NodeDetailPanel` for the nodes
  it makes clickable.
- `CAROUSELS_VIEW` — renders one section per `Carousel` (see
  [`src/carousels/`](../carousels/README.md)) with click-to-filter tag
  rectangles. Built via `createCarouselsView(carousels?)` so clients can
  supply their own carousel list via the `carousels` prop on `<GraphSect>`
  without replacing the rest of the registry.
- `DATUM_LIST_VIEW` — a scrollable list of every datum in the post-filter
  graph, in a stable-per-mount random order. Clicking a row sets the global
  `selectedDatumId`; the selected row is highlighted.

All are exported from `builtinViews.ts` and are the default contents of the
`views` prop on `<GraphSect>`.

## AddViewMenu

An **Add view** button + dropdown listing every view type in the registry
(except the pinned filters view). Clicking a type appends a fresh instance to
the active list. The same type can be added any number of times.

The menu lives inside the pinned `FiltersView` (not in a global toolbar).
The host renders it via the `ViewSelectorContext` — `<GraphSect>` wraps the
tree in `<ViewSelectorProvider value={{ addableTypes, onAdd, onClose, pinnedInstanceId }}>`,
and `FiltersView` reads it with `useViewSelector()`. Closing an instance is
handled by the × button each non-pinned instance renders in its header
(also dispatched through `useViewSelector().onClose`).

## Pinned views

The Filters view is **pinned**: it's always present as a singleton with the
constant instance id `"filters"`, can't be closed, and doesn't appear in the
Add view menu. `<GraphSect>` enforces this by re-injecting the pinned
instance into every `setActiveViews` emission.

If you replace the registry via the `views` prop on `<GraphSect>`, the same
rule applies to whichever view has id `"filters"` — it remains pinned.

## ResizableViewStack

Active views render full-width, top to bottom. The last view in the stack
takes the remaining vertical space (`flex: 1 1 0`); every other view starts at
its declared `minHeight` so heavy visualizations placed last get the bulk of
the space by default. A drag handle between adjacent views lets the user
resize the view above it; the size is clamped to that view's `minHeight`.
When a view is added or removed, previously-sized views keep their stored
heights and the new "last" view absorbs any difference via flex.

The drag math is isolated in `resize.ts` (`clampDragHeight`) so it can be
unit-tested independent of the DOM.

## Adding a new view

1. Implement a component `({ sourceGraph, graph, filterState,
   onFilterStateChange }) => ReactNode`.
2. Wrap it as a `GraphView` (`id`, `name`, optional `minHeight`, `Component`).
3. Either add it to `BUILTIN_VIEWS` (if shipping it as a default) or pass it
   in the `views` prop on `<GraphSect>` and seed `defaultActiveViewIds`.

The view body controls its own internal state (e.g. zoom, selected node, tag
mesh params). Anything that should be shared across views — the source graph
and the filter state — flows through `GraphViewProps`.

### Action tracking rule

GraphSect logs every user action that updates filter state, the active view
list, or the global datum selection (see the "Action Pipeline" section of the
top-level [`README.md`](../../README.md)). The pipeline only works because all
three pieces of state live at `<GraphSect>` and are mutated through the props
listed above. **A new view must never own its own filter state, its own
copy of `selectedDatumId`, or its own view-visibility state internally** —
read those from props, write back through the provided callbacks.

#### View-local state that should be undoable

Views *are* allowed to own their own state (zoom, sliders, scroll position,
etc.). Whether or not that state participates in the action log is the view's
call:

- If the state should be undoable, declare it with `useTrackedState(instanceId, kind, initial, { debounce })` from `src/action-log/`. **Always use the `instanceId` prop, not the static GraphView id** — that's how two on-screen instances of the same view type keep independent state and independent undo histories. The hook records each change as a `VIEW_ACTION` and self-registers an undoer so the Undo button rewinds through the view's setter.
- If the state is transient (hover, drag-in-progress flag, animation frame), keep it as plain `useState`.

Use `debounce: true` for anything continuous (drag, wheel zoom, slider) so
one gesture costs one undo step. The debounce window is configured globally
via the `debounceMs` prop on `<GraphSect>` (default 300 ms). When several
pieces of view state move together as a single gesture (e.g. a wheel-zoom
that updates both zoom and pan), keep them in **one** tracked object so the
undo step matches the user's mental model — see `tag-mesh/TagMesh2DView.tsx`
for an example with a combined `viewport`.

`useTrackedState` returns a third tuple slot — an untracked setter — for
non-user-driven changes that shouldn't show up in undo (e.g.
`ResizableViewStack` uses it to seed a starting height when a new view is
added to the stack, since that's initialization rather than a user gesture).

## Files

- `types.ts` — the `GraphView` / `GraphViewProps` contract.
- `ViewManager.tsx` — picks the active views (in registry order) and renders
  them through `ResizableViewStack`.
- `ViewSelector.tsx` — multi-select dropdown component (hosted inside the
  pinned `FiltersView`).
- `ViewSelectorContext.tsx` — `ViewSelectorProvider` / `useViewSelector` for
  delivering the selector's state to whichever view embeds it.
- `ResizableViewStack.tsx` — vertical stack with drag-to-resize handles.
- `resize.ts` — pure resize math.
- `builtinViews.ts` — the registry of default views.
- `views/FiltersView.tsx`, `views/TagMeshView.tsx`, `views/PlotGraphView.tsx`
  — the built-in views, each wrapping the existing legacy component.
- `index.ts` — public re-exports.
