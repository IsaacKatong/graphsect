# Plotting

Dimension-based plotting for GraphSect. When a user selects 1–3 dimensions as axes, the force graph view is replaced with a Plotly.js scatter plot that places datums at their exact coordinate values.

## Files

- **types.ts** — `DimensionSelection`, `DimensionSelectionCallbacks`, and `CustomDimensionSelector` types
- **useDimensionSelection.ts** — React hook for managing selected dimensions (max 3), with `setDimensions`, `toggleDimension`, and `clearDimensions`
- **PlotView.tsx** — Renders a 1D, 2D, or 3D scatter plot based on the number of selected dimensions. Extracts dimension values from the `ExternalGraph` and plots datums at their coordinates
- **DimensionSelector.tsx** — Dropdown button for selecting which dimensions to plot. Shows available dimensions as checkboxes, disables further selection at 3

## Client API

The plotting system follows the same override pattern as filtering:

1. **Default** — Built-in `DimensionSelector` manages state internally
2. **Callback** — Pass `onDimensionsChange` to `GraphSect` to be notified when dimensions change
3. **Controlled** — Pass `selectedDimensions` + `onDimensionsChange` to own the state externally; optionally set `hideDefaultDimensionSelector` to provide your own UI
