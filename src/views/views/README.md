# views/views

The built-in `GraphView` implementations. Each file in here exports a
`GraphView`-compatible component that wraps an existing visualisation
(`tag-mesh`, `plotting`) and adapts it to the `GraphViewProps` contract
defined in `../types.ts`. The filter buttons themselves are **not** a view —
they live in the top-level [`src/Toolbar.tsx`](../../Toolbar.tsx).

- `TagMeshView.tsx` — surfaces `TagMesh2DView` + `TagMeshControls`. Reads the
  filtered `graph`, runs `transformGraph` plus `computeTagScores` (the same
  score the carousels use) and threads both into the layout.
- `PlotGraphView.tsx` — surfaces `PlotView` and `DimensionSelector`. Clicks
  on a plot node call `onSelectedDatumIdChange(datumId)`; the shared
  `NodeDetailPanel` lives at the `<GraphSect>` level so the same panel is
  re-used regardless of which view triggered the selection.
- `CarouselsView.tsx` — renders one section per `Carousel`. Exports
  `createCarouselsView(carousels?)` so the caller can build a view bound to
  their own list (the default registry uses `DEFAULT_CAROUSELS`).
- `DatumListView.tsx` — scrollable list of every datum in the post-filter
  graph; clicks set `selectedDatumId`. Scroll position is tracked via
  `useTrackedState`, so it participates in undo.

If you're adding another view, keep its body small — the heavy work belongs
in the underlying feature folder. The wrapper exists only to (a) translate
`GraphViewProps` into the underlying component's props and (b) manage any
view-local state (like the dimension selector's open/closed status).
