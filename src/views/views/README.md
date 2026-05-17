# views/views

The built-in `GraphView` implementations. Each file in here exports a
`GraphView`-compatible component that wraps an existing visualisation
(`filter-panel`, `tag-mesh`, `plotting`) and adapts it to the
`GraphViewProps` contract defined in `../types.ts`.

- `FiltersView.tsx` — surfaces `FilterPanel`. Writes `filterState`, reads
  `sourceGraph` to enumerate options.
- `TagMeshView.tsx` — surfaces `TagMesh2DView` + `TagMeshControls`. Reads the
  filtered `graph` and runs `transformGraph` to produce its layout input.
- `PlotGraphView.tsx` — surfaces `PlotView` and `DimensionSelector`. Hosts
  the `NodeDetailPanel` for nodes clicked in the plot.

If you're adding another view, keep its body small — the heavy work belongs
in the underlying feature folder. The wrapper exists only to (a) translate
`GraphViewProps` into the underlying component's props and (b) manage any
view-local state (like the dimension selector's open/closed status).
