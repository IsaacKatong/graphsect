# src

Application source code for graphSect.

- **external-graph/** — Types and utilities for the ExternalGraph data format, including the transformer that normalizes it into the graph shape used by the views.
- **filtering/** — Pure filtering logic for narrowing the graph by datum type, tags, edges, and dimension ranges. Supports default filters, callback overrides, and full custom filters.
- **filter-panel/** — UI components for the built-in filter controls (multi-select dropdowns and dimension range inputs).
- **graph-view/** — Node detail panel shown when a datum is selected.
- **tag-mesh/** — 2D mesh view: greedy tag-based layout heuristic, SVG renderer, and slider controls for tuning neighbor count, tag size, and distance.
- **plotting/** — Dimension-based plotting with Plotly.js. Selecting 1–3 dimensions as axes switches the view from the tag mesh to a scatter plot that places datums at their exact coordinate values.
- **App.tsx** — Root application component that loads graph data and wires up the views.
- **main.tsx** — Entry point that mounts the React app to the DOM.
