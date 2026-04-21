# graphSect

A framework for displaying graphs with rich metadata to improve understanding through visualization.

## Overview

graphSect makes the dissecting, displaying, and digesting of structured, connected data easier. It provides interactive graph visualizations with rich metadata support, enabling users to explore complex relationships and gain insights through visual analysis.

## Features

- **Tag Mesh View** — The default visualization lays out datum tags as a 2D mesh using a greedy tag-connection heuristic, with tunable neighbor count, tag size, and distance.
- **Node Inspection** — Select any node in the graph to view all of its associated metadata and details.
- **Filtering** — Apply filters to focus on specific subsets of nodes, reducing visual clutter and highlighting what matters.
- **Alternative Views** — Switch to value-based graph views that leverage dimensions associated with nodes, enabling different analytical perspectives on the same data.

## Examples

The `examples/` folder contains example graph JSON files. When the dev server starts, you are prompted to select one of the available examples to render. To add your own, drop a JSON file matching the `ExternalGraph` schema into the `examples/` folder and it will appear in the selection prompt automatically.

## Usage

### Basic

Render a graph with default filter buttons:

```tsx
import { GraphSect } from "graphsect";

<GraphSect graph={myExternalGraph} />
```

Out of the box, GraphSect renders filter buttons for:

| Filter | What it does |
|---|---|
| **Datum Type** | Show only datums of selected types (multi-select) |
| **Datum Tags** | Show only datums that carry at least one selected tag |
| **Edges** | Show only datums connected by selected edges |
| **Edge Tags** | Show only edges that carry at least one selected tag |
| **Datums** | Show only edges that connect to selected datums |
| **Dimensions** | Show only datums whose dimension values fall within specified ranges |

### Overriding Individual Filters

Each default filter can be replaced with a custom callback. All callbacks live in a single `filterCallbacks` object. Each callback receives the current `ExternalGraph` and the filter value, and returns a new `ExternalGraph`.

```tsx
import { GraphSect } from "graphsect";
import { ExternalGraph } from "graphsect/external-graph/types";
import { DatumTypeFilter } from "graphsect/filtering/types";

function myDatumTypeFilter(graph: ExternalGraph, filter: DatumTypeFilter): ExternalGraph {
  // Your efficient custom filtering logic
  return filteredGraph;
}

<GraphSect
  graph={myExternalGraph}
  filterCallbacks={{
    datumType: myDatumTypeFilter,
    // Other filters continue to use defaults
  }}
/>
```

Available callback keys: `datumType`, `datumTags`, `connectedEdges`, `edgeTags`, `connectedDatums`, `dimensionValues`.

### Full Override — Bypassing Built-in Filters

If you want complete control over filtering, pass a `customGraphFilter` callback. When provided, the default filter buttons are hidden and GraphSect calls your function to get the graph to render.

```tsx
import { GraphSect } from "graphsect";
import { ExternalGraph } from "graphsect/external-graph/types";

function myCustomFilter(sourceGraph: ExternalGraph): ExternalGraph {
  // Return whatever filtered graph you want rendered
  return sourceGraph;
}

<GraphSect
  graph={myExternalGraph}
  customGraphFilter={myCustomFilter}
/>
```

You can also hide the default filter panel while still using the built-in filter logic by passing `hideDefaultFilters`:

```tsx
<GraphSect graph={myExternalGraph} hideDefaultFilters />
```

## Props

| Prop | Type | Description |
|---|---|---|
| `graph` | `ExternalGraph` | The source graph data to visualize |
| `filterCallbacks?` | `FilterCallbacks` | Optional callbacks to override individual default filters |
| `customGraphFilter?` | `CustomGraphFilter` | Optional callback that replaces all built-in filtering |
| `hideDefaultFilters?` | `boolean` | Hide the default filter panel |
