# Architecture

GraphSect is built around a `GraphView` abstraction. The `<GraphSect>`
component owns the source `ExternalGraph` and the current `FilterState`. It
applies filters once, then hands the resulting filtered graph to every active
view. Built-in views — Filters, Tag Mesh, Plot, Carousels — each render the
filtered graph in their own way and may write back to the filter state. The
Filters view is pinned (always active, never appears in the selector); the
user toggles other views from a multi-select menu rendered inside the Filters
bar. Active views stack full-width with drag-resizable heights.

## Data Flow

```
ExternalGraph (source)
       │
       ├── customGraphFilter? ─ YES ──→ customGraphFilter(graph) ──┐
       │                                                            │
       NO                                                           │
       │                                                            │
       ▼                                                            │
  applyFilters(graph, filterState, filterCallbacks?)               │
       │                                                            │
       ▼                                                            ▼
  ExternalGraph (filtered) ────────────────────────────────────────┘
       │
       ▼
  ViewManager  (activeIds always include the pinned Filters view)
       │
       ├── for each active view ──→ ResizableViewStack
       │
       ▼
  view.Component({ sourceGraph, graph, filterState, onFilterStateChange })
       │
       ├── FiltersView (pinned) ──── writes filterState ──── (closes loop into applyFilters)
       │       │
       │       └── hosts ViewSelector via ViewSelectorContext (multi-select non-pinned views)
       ├── TagMeshView ─── transformGraph() + computeTagScores() ──→ TagMesh2DView (SVG)
       ├── PlotGraphView ─ PlotView (Plotly) ──→ onSelectedDatumIdChange(datumId)
       └── CarouselsView ─ runs each Carousel.selection(graph) ──→ tag rectangles
                                              click → toggles tag in datumTags

  selectedDatumId (hoisted to <GraphSect>) ──→ NodeDetailPanel (single shared instance)
```

### 1. Input — ExternalGraph

The application consumes an `ExternalGraph` JSON file, the data format used by the external-cortex project. This structure contains:

- **datums** — The core entities (nodes) with an id, name, type, and content.
- **edges** — Directional connections between datums.
- **datumTags** — Labels associated with individual datums.
- **datumDimensions** — Numeric values (e.g. importance, complexity) associated with datums.
- **edgeTags** — Labels associated with edges.
- **datumTagAssociations** — Hierarchical relationships between tags.

### 2. Filter — Filtering Pipeline

`src/filtering/` contains the filtering system that sits between the source ExternalGraph and the transform step. It supports three modes of operation:

**Mode A — Default filters:** GraphSect provides built-in filter implementations for six filter types: datum type, datum tags, connected edges, edge tags, connected datums, and dimension values. The `FilterPanel` UI renders buttons for each. The `applyFilters()` orchestrator chains active filters sequentially, each receiving the output of the previous.

**Mode B — Callback overrides:** Clients pass a `filterCallbacks` prop containing custom implementations for any subset of filters. The `applyFilters()` orchestrator checks for a callback before falling back to the default. Each callback has the signature `(graph: ExternalGraph, filter: T) => ExternalGraph`, where `T` is the filter-specific value type.

**Mode C — Full override:** Clients pass a `customGraphFilter` callback that receives the source graph and returns the graph to render. This bypasses all built-in filter logic; the filters view, if active, still renders but its filter state is ignored.

Key files:
- `src/filtering/types.ts` — Filter value types (`DatumTypeFilter`, `DatumTagsFilter`, etc.), `FilterState`, `FilterCallbacks`, `CustomGraphFilter`
- `src/filtering/defaultFilters.ts` — One pure function per filter kind, plus helpers for pruning orphaned edges/datums
- `src/filtering/applyFilters.ts` — Orchestrator that iterates `FilterState`, dispatching to callbacks or defaults
- `src/filtering/useFilterState.ts` — React hook managing `FilterState` with `setFilter`, `clearFilter`, `clearAllFilters`

### 3. Transform — transformGraph()

`src/external-graph/transformGraph.ts` converts the (filtered) ExternalGraph into a normalized `{ nodes, links }` shape:

- Each **datum** becomes a **node** enriched with its resolved tags and dimensions.
- Each **edge** becomes a **link** enriched with its resolved edge tags.
- Tags and dimensions are indexed by datum/edge ID for O(1) lookup during transformation.

### 4. Render — TagMesh2DView

`src/tag-mesh/TagMesh2DView.tsx` renders a 2D SVG mesh of tags. The layout in `buildTagMeshLayout.ts` is a greedy heuristic: the tag with the most datums is placed first, then each remaining tag is attached to the already-placed tag it shares the most datum-to-datum edge connections with, using a free angular slot around that parent. Each tag is a circle (radius scaled by datum count) and each tag-to-tag connection is a line. The three tunables — max neighbors per tag, size scale, and distance between tags — are exposed as sliders in `TagMeshControls.tsx`.

### 5. Filter UI — FilterPanel

`src/filter-panel/FilterPanel.tsx` renders the default filter buttons overlaid on the graph. It extracts available filter options from the source ExternalGraph (unique types, tags, edge IDs, dimensions with min/max ranges). Each filter button opens a multi-select dropdown. The dimension filter provides min/max range inputs.

Key files:
- `src/filter-panel/FilterPanel.tsx` — Assembles all filter buttons, extracts options from source graph
- `src/filter-panel/FilterButton.tsx` — Reusable multi-select dropdown button
- `src/filter-panel/DimensionRangeFilter.tsx` — Specialized min/max range inputs for dimension filtering

### 6. Inspect — NodeDetailPanel

`src/graph-view/NodeDetailPanel.tsx` is the shared detail panel. It lives at
the `<GraphSect>` level (not inside any view), reads a single
`selectedDatumId` state hoisted alongside `filterState`, and renders the
selected datum's name, type, tags, dimensions, and full content in a slide-out
side panel. Any view receives the current `selectedDatumId` plus an
`onSelectedDatumIdChange` setter through `GraphViewProps`; clicking a datum
anywhere swaps the panel to that datum without spawning a second instance.
Resolution runs against the source graph so a hidden datum stays viewable
when a filter would otherwise drop it from the post-filter graph.

### 7. View Management

`src/views/` contains the `GraphView` abstraction, the view registry, the
multi-select `ViewSelector`, and the `ResizableViewStack` that arranges
active views top to bottom at full width with drag-resizable heights
(clamped to each view's `minHeight`). The four built-in views — Filters,
Tag Mesh, Plot, Carousels — each implement the `GraphView` contract and
re-render whenever the source graph or filter state changes. See
[`src/views/README.md`](src/views/README.md) for the full contract.

### 8. Carousels

`src/carousels/` defines the `Carousel` interface — a `{ name, selection }`
pair where `selection(graph) => string[]` returns the tags to render in
order. The default `MOST_CONNECTED_CAROUSEL` sorts every tag by
`computeTagScores(graph)`, the canonical connectedness score also consumed
by `buildTagMeshLayout`:

    score(T) = |datums(T)| + Σ deg(d) for d ∈ datums(T)

`<CarouselsView>` renders each carousel as a title plus fixed-size tag
rectangles (text scaled to fit; rows wrap once they overflow). Clicking a
tag rewrites `filterState.datumTags` so the rest of the app sees only
datums carrying that tag.

## Component — GraphSect

`src/App.tsx` exports the `GraphSect` component, which is the main entry point for the library. It accepts the following props:

| Prop | Type | Description |
|---|---|---|
| `graph` | `ExternalGraph` | Source graph data |
| `filterCallbacks?` | `FilterCallbacks` | Override individual filter logic |
| `customGraphFilter?` | `CustomGraphFilter` | Replace all built-in filtering |
| `views?` | `GraphView[]` | Replace the default view registry (defaults to `BUILTIN_VIEWS`) |
| `carousels?` | `Carousel[]` | Override the carousels shown inside the built-in Carousels view (ignored when `views` is also passed) |
| `defaultActiveViewIds?` | `string[]` | Which view ids are active on first mount (defaults to `["filters", "tag-mesh"]`) |
