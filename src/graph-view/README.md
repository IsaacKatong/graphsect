# graph-view

React components for rendering graph visualizations and node details.

## Files

- **TagMesh2DView.tsx** — 2D mesh view that groups datums by tag. Tags are placed greedily: the tag with the most datums goes first, then each remaining tag is placed next to the already-placed tag it shares the most datum connections with. Tags render as circles (radius scaled by datum count); links between tags render as lines. Sliders expose the tunable knobs: neighbors per tag, tag size scale, tag distance
- **NodeDetailPanel.tsx** — Side panel shown when a node is clicked. Renders `type === "MARKDOWN"` datums via `react-markdown` and surfaces parse errors as a banner at the top
