# Architecture

## Data Flow

```
graph.json (ExternalGraph)
       │
       ▼
  transformGraph()
       │
       ▼
  ForceGraphData { nodes, links }
       │
       ▼
  ForceGraph3DView (3d-force-graph)
       │
       ▼
  User clicks node
       │
       ▼
  NodeDetailPanel
```

### 1. Input — ExternalGraph

The application consumes an `ExternalGraph` JSON file, the data format used by the external-cortex project. This structure contains:

- **datums** — The core entities (nodes) with an id, name, type, and content.
- **edges** — Directional connections between datums.
- **datumTags** — Labels associated with individual datums.
- **datumDimensions** — Numeric values (e.g. importance, complexity) associated with datums.
- **edgeTags** — Labels associated with edges.
- **datumTagAssociations** — Hierarchical relationships between tags.

### 2. Transform — transformGraph()

`src/external-graph/transformGraph.ts` converts the ExternalGraph into the format expected by 3d-force-graph:

- Each **datum** becomes a **node** enriched with its resolved tags and dimensions.
- Each **edge** becomes a **link** enriched with its resolved edge tags.
- Tags and dimensions are indexed by datum/edge ID for O(1) lookup during transformation.

### 3. Render — ForceGraph3DView

`src/graph-view/ForceGraph3DView.tsx` passes the transformed data to the 3d-force-graph library, which renders an interactive 3D force-directed graph using WebGL (three.js). Node size is driven by the `importance` dimension when present.

### 4. Inspect — NodeDetailPanel

`src/graph-view/NodeDetailPanel.tsx` displays when a user clicks a node. It shows the node's name, type, tags, dimensions, and full content in a slide-out side panel.
