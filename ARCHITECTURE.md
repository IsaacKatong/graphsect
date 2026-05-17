# Architecture

GraphSect is built around a `GraphView` abstraction. The `<GraphSect>`
component owns the source `ExternalGraph` and the current `FilterState`. It
applies filters once, then hands the resulting filtered graph to every active
view. Built-in views — Filters, Tag Mesh, Plot — each render the filtered
graph in their own way and may write back to the filter state. The Filters
view is pinned (always active, never appears in the selector); the user
toggles other views from a multi-select menu rendered inside the Filters bar.
Active views stack full-width with drag-resizable heights.

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
       ├── TagMeshView ─── transformGraph() ──→ TagMesh2DView (SVG)
       └── PlotGraphView ─ PlotView (Plotly) ──→ NodeDetailPanel on click
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

`src/graph-view/NodeDetailPanel.tsx` displays when a user clicks a node in the plot view. It shows the node's name, type, tags, dimensions, and full content in a slide-out side panel.

### 7. View Management

`src/views/` contains the `GraphView` abstraction, the view registry, the
top-right multi-select `ViewSelector`, and the `ResizableViewStack` that
arranges active views top to bottom at full width with drag-resizable heights
(clamped to each view's `minHeight`). The three built-in views — Filters,
Tag Mesh, Plot — each implement the `GraphView` contract and re-render
whenever the source graph or filter state changes. See
[`src/views/README.md`](src/views/README.md) for the full contract.

## Component — GraphSect

`src/App.tsx` exports the `GraphSect` component, which is the main entry point for the library. It accepts the following props:

| Prop | Type | Description |
|---|---|---|
| `graph` | `ExternalGraph` | Source graph data |
| `filterCallbacks?` | `FilterCallbacks` | Override individual filter logic |
| `customGraphFilter?` | `CustomGraphFilter` | Replace all built-in filtering |
| `views?` | `GraphView[]` | Replace or extend the default view registry (defaults to `BUILTIN_VIEWS`) |
| `defaultActiveViewIds?` | `string[]` | Which view ids are active on first mount (defaults to `["filters", "tag-mesh"]`) |
