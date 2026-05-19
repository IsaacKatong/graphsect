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
| `views?` | `GraphView[]` | Replace the default view registry |
| `carousels?` | `Carousel[]` | Override the carousels shown inside the built-in Carousels view |
| `defaultActiveViewIds?` | `string[]` | View type ids active on first mount. Each entry seeds one instance; the same type can appear more than once. |
| `onAction?` | `(action: Action) => void` | Receive every user action that changes filters, the active view list, or the selected datum |
| `debounceMs?` | `number` | Window (ms) for collapsing rapid `useTrackedState` updates into one action (default: 300) |

## Action Pipeline

GraphSect tracks every user action that updates filter state, the active view
list, or the global datum selection. Mutations to the external graph itself
are not actions and are not reported.

### Consuming actions

Subscribe at the host via the `onAction` prop:

```tsx
import { GraphSect, Action } from "graphsect";

<GraphSect
  graph={myExternalGraph}
  onAction={(action: Action) => {
    // action.seq, action.timestamp, action.type, plus a typed payload
    console.log(action);
  }}
/>
```

Or, from inside a custom view, subscribe to the full log:

```tsx
import { useActionLogSnapshot } from "graphsect";

function MyDebugView() {
  const log = useActionLogSnapshot();
  return <pre>{JSON.stringify(log.at(-1), null, 2)}</pre>;
}
```

### Action shapes

All actions share `{ seq: number; timestamp: number; type: string }`. `seq`
is monotonic across every action type, so the log is a single total order.

| Type | Payload |
|---|---|
| `FILTER_CHANGED` | `prev`, `next` (full `FilterState`), `changedKeys` (which slices flipped) |
| `VIEWS_CHANGED` | `prev`, `next` (arrays of `ViewInstance`), `added`, `removed` |
| `SELECTION_CHANGED` | `prev`, `next` (datum id or `null`) |
| `VIEW_ACTION` | `viewId`, `kind`, `prev`, `next` — emitted by views that opt into tracking via `useTrackedState` |

### Multi-instance views

Each entry of the active-view list is a `ViewInstance`:

```ts
type ViewInstance = {
  id: string;     // unique across the whole stack
  typeId: string; // references a GraphView.id in the registry
};
```

The same view type can be added to the stack multiple times — clicking the
**Add view** menu in the filters toolbar appends a fresh instance with its
own auto-generated id. Each instance gets its own header strip with a close
(×) button. The pinned filters view is always present and can't be closed.

Inside a view component, the `instanceId` prop is the unique id for *this*
instance. Pass it to `useTrackedState` so two on-screen instances of the same
type (e.g. two tag-mesh views) keep their viewport, sliders, and any other
tracked state independent of each other.

When a view instance is closed, all its `useTrackedState` undoers deregister.
Any past `VIEW_ACTION` for that instance still sits in the log; clicking Undo
will pop the action but applying its `prev` is a silent no-op (since the
view is gone). Undoing the close itself reopens the same instance id; React
mounts a fresh component, so prior tracked state inside that instance is
**not** restored.

### Tracking view-local state

State that lives inside a view (zoom, pan, sliders, scroll position, etc.) is
fine to keep local — but if you want it to participate in the action log and
Undo, declare it with `useTrackedState` instead of `useState`:

```tsx
import { useTrackedState } from "graphsect";

function MyView({ instanceId }: GraphViewProps) {
  // Pass `instanceId` as the first arg so two on-screen MyView instances
  // each keep their own tracked state.

  // Discrete state — every change is recorded immediately.
  const [page, setPage] = useTrackedState<number>(instanceId, "page", 1);

  // Continuous state — multiple sets within `debounceMs` collapse into one
  // action so a gesture (drag, scroll, wheel zoom) costs one undo step.
  const [zoom, setZoom] = useTrackedState<number>(
    instanceId,
    "zoom",
    1,
    { debounce: true },
  );

  // Untracked UI state stays as plain useState.
  const [hovered, setHovered] = useState<string | null>(null);
}
```

The hook self-registers an undoer keyed by `(viewId, kind)`. Undo applies the
recorded `prev` value through the hook's own setter, so the view stays in
control of its state.

The hook returns a **third** tuple slot — an "untracked" setter that updates
the value and the undo baseline without recording an action. Use it for
non-user-driven changes that should not appear in undo (initializing defaults
when a new view is added to a stack, syncing to an external store, etc.):

```tsx
const [heights, setHeights, seedHeights] = useTrackedState<Record<string, number>>(
  "view-stack",
  "heights",
  {},
  { debounce: true },
);

// User-driven drag: tracked, debounced into one undo step.
setHeights((prev) => ({ ...prev, [id]: newHeight }));

// Programmatic init when a new view is added: not an action.
seedHeights((prev) => ({ ...prev, [newViewId]: minHeight }));
```

**Tracking decision per piece of state:**

- User-driven and meaningful to undo? → `useTrackedState`. Pick `debounce: true` for anything continuous.
- Transient UI state (hover, drag-in-progress flag, animation frame)? → plain `useState`.
- Application-level state (filters, active views, selected datum)? → already tracked automatically by `<GraphSect>`; views consume it through `GraphViewProps`.

### Undo

`<GraphSect>` ships an **Undo** button in the filters toolbar (next to the
Views menu). Clicking it pops the most recent action from the log and rewinds
the corresponding state to that action's recorded `prev` value — including
view-local state registered through `useTrackedState`. Undo is a rewind, not
a new action: it does **not** append to the log and does **not** fire
`onAction`. When the log is empty the button is disabled. The undo handle is
also available programmatically inside any view via the `useUndo()` hook
(`{ undo, canUndo }`). If a view that owned a tracked piece of state has
unmounted by the time the user undoes a `VIEW_ACTION` for it, the action is
popped but applying `prev` is a silent no-op — undo still advances one step.

### How new views and filters inherit tracking

There is one rule:

> **All action-worthy state lives at `<GraphSect>`.** Views and filters never
> own filter state, the active view list, or the global datum selection
> internally — they read it from props and write back through the provided
> callbacks.

Because every action funnels through the three setters on the root component,
new sources are picked up automatically:

- **Adding a filter** — add a key to `FilterState` in [`src/filtering/types.ts`](src/filtering/types.ts) and write its default in [`src/filtering/defaultFilters.ts`](src/filtering/defaultFilters.ts). The diff routine compares the union by key, so the new slice appears in `changedKeys` the first time it flips. No registration is needed.
- **Adding a view** — implement a component that takes `GraphViewProps`, wrap it as a `GraphView`, and add it to the registry (see [`src/views/README.md`](src/views/README.md)). Any state the view mutates must go through `onFilterStateChange` or `onSelectedDatumIdChange`; toggling its visibility goes through `ViewSelectorContext.onActiveIdsChange`. All three are already wrapped, so the view contributes to the log by construction.

**What to avoid in a new view:** do not call `useState` for anything that
represents a filter, a selected datum, or another view's visibility. Local
state for purely visual concerns (zoom level, hover, expand/collapse) is fine
— those are not actions. If you find yourself wanting to track a new kind of
user action, hoist its state to `<GraphSect>` and add a new action type to
[`src/action-log/types.ts`](src/action-log/types.ts) so the pipeline can carry
it.
