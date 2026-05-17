# views/views

The built-in `GraphView` implementations. Each file in here exports a
`GraphView`-compatible component that wraps an existing visualisation
(`filter-panel`, `tag-mesh`, `plotting`) and adapts it to the
`GraphViewProps` contract defined in `../types.ts`.

- `FiltersView.tsx` — surfaces `FilterPanel`. Writes `filterState`, reads
  `sourceGraph` to enumerate options.
- `TagMeshView.tsx` — surfaces `TagMesh2DView` + `TagMeshControls`. Reads the
  filtered `graph`, runs `transformGraph` plus `computeTagScores` (the same
  score the carousels use) and threads both into the layout.
- `PlotGraphView.tsx` — surfaces `PlotView` and `DimensionSelector`. Hosts
  the `NodeDetailPanel` for nodes clicked in the plot.
- `CarouselsView.tsx` — renders one section per `Carousel`. Exports
  `createCarouselsView(carousels?)` so the caller can build a view bound to
  their own list (the default registry uses `DEFAULT_CAROUSELS`).

If you're adding another view, keep its body small — the heavy work belongs
in the underlying feature folder. The wrapper exists only to (a) translate
`GraphViewProps` into the underlying component's props and (b) manage any
view-local state (like the dimension selector's open/closed status).
