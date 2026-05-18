# Filtering

Pure filtering logic for GraphSect. This module is UI-agnostic — it operates on `ExternalGraph` and produces a new `ExternalGraph`.

## Files

- **types.ts** — Filter value types, `FilterState`, `FilterCallbacks`, and `CustomGraphFilter`
- **defaultFilters.ts** — Default implementation for each filter kind (datum type, datum tags, connected edges, edge tags, connected datums, dimension values), plus `makeConsistent` for cross-table cleanup
- **applyFilters.ts** — Orchestrator that chains active filters, using callback overrides when provided
- **useFilterState.ts** — React hook for managing `FilterState`

## How the pipeline composes

Each default filter narrows only its **primary scope**:

- Datum-scope filters (`filterByDatumType`, `filterByDatumTags`,
  `filterByConnectedDatums`, `filterByDimensionValues`) shrink `datums` and
  leave edges and metadata untouched.
- Edge-scope filters (`filterByConnectedEdges`, `filterByEdgeTags`) shrink
  `edges` and intersect `datums` with the endpoints of the surviving edges
  (which is part of the filter's intent).

Dangling references that arise across the pipeline — edges pointing at
dropped datums, datum tags referencing removed datums, etc. — are cleaned
up by a single `makeConsistent` pass at the end of `applyFilters`. This
keeps the result order-independent and means combining e.g. an edge filter,
an edge-tag filter, and a datum-tag filter produces the natural
intersection rather than collapsing to an empty graph because of a
destructive interaction during the run.
