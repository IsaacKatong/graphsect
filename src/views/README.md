# views

The view-management layer. Everything the user sees of an `ExternalGraph` is a
`GraphView`, and this folder is responsible for:

- Defining the `GraphView` contract.
- Maintaining the registry of built-in views (filters, tag mesh, plot).
- Letting the user pick which views are active (multi-select `ViewSelector`).
- Stacking active views full-width with drag-to-resize heights
  (`ResizableViewStack`).
- Feeding every active view a consistent slice of the world: the source graph,
  the filtered graph, the current filter state, and a setter for the filter
  state.

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
};
```

A view receives both the raw `sourceGraph` (e.g. to enumerate all possible
filter options) and the `graph` that's already had the current filter state
applied (what most views actually render). It may optionally update
`filterState` — that's how the built-in filter view contributes to the pipeline.

Because the filter state and the external graph live above all views, every
active view re-renders whenever either changes — there is no per-view stale
state to worry about.

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

All three are exported from `builtinViews.ts` and are the default contents of
the `views` prop on `<GraphSect>`.

## ViewSelector

A multi-select dropdown that lists togglable views. Each view in the
selector's `views` prop appears as a checkbox; toggling pushes a new array
into `activeIds` via `onActiveIdsChange`. The selector preserves the order of
its `views` prop regardless of the order in which the user enabled views, so
the stack layout is stable.

The selector lives inside the pinned `FiltersView` (not in a global toolbar).
The host renders it via the `ViewSelectorContext` — `<GraphSect>` wraps the
tree in `<ViewSelectorProvider value={{ views, activeIds, onActiveIdsChange }}>`,
and `FiltersView` reads it with `useViewSelector()`.

## Pinned views

The Filters view is **pinned**: it's always active, can't be toggled off, and
doesn't appear in the selector's list. `<GraphSect>` enforces this by always
prepending `FILTERS_VIEW.id` to `activeIds` and by passing only the non-pinned
views into the context.

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
