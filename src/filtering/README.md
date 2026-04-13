# Filtering

Pure filtering logic for GraphSect. This module is UI-agnostic — it operates on `ExternalGraph` and produces a new `ExternalGraph`.

## Files

- **types.ts** — Filter value types, `FilterState`, `FilterCallbacks`, and `CustomGraphFilter`
- **defaultFilters.ts** — Default implementation for each filter kind (datum type, datum tags, connected edges, edge tags, connected datums, dimension values)
- **applyFilters.ts** — Orchestrator that chains active filters, using callback overrides when provided
- **useFilterState.ts** — React hook for managing `FilterState`
