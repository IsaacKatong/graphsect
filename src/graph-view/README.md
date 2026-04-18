# graph-view

React components for rendering graph visualizations and node details.

## Files

- **ForceGraph3DView.tsx** — Default flat 3D force-directed view of all datums. Uses OrbitControls with `zoomToCursor` so the scroll wheel zooms toward the pointer
- **GroupedGraphView.tsx** — Alternative view that renders the tag-based hierarchy from `../grouping/` as nested spheres with fixed positions. Clicking a group expands it into a sparse wireframe "ghost" (three orthogonal torus rings) and reveals its children; clicking the ghost collapses back. Node dragging is disabled so the layout stays put. Accepts a `resetToken` that, when incremented, collapses everything back to the root
- **GroupedViewControls.tsx** — Toolbar dropdown with Enable/Disable and Reset actions for Grouped View. Controlled `open`/`onOpenChange` so only one toolbar dropdown is open at a time
- **NodeDetailPanel.tsx** — Side panel shown when a node is clicked. Renders `type === "MARKDOWN"` datums via `react-markdown` and surfaces parse errors as a banner at the top
