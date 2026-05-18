# Filter Panel

React UI components for the default filter buttons rendered by GraphSect.

## Files

- **FilterPanel.tsx** — Main component that assembles all filter buttons. Extracts available options from the **post-filter** graph the host passes in, so adding any filter (from any source — the panel itself, a carousel, a custom view) automatically narrows every other dropdown to the options that still produce non-empty results. Cleared filters expand the option set back out because the post-filter graph widens again.
- **FilterButton.tsx** — Reusable multi-select dropdown button used for datum type, datum tags, edges, edge tags, and datum filters.
- **DimensionRangeFilter.tsx** — Specialized filter for dimension values with min/max range inputs per dimension.
