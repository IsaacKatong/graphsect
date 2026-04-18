# Grouping

Hierarchical partitioning of datums by shared tags, with a bottom-up 3D sphere-packed layout. Powers the Grouped View mode in `graph-view/`.

## Files

- **types.ts** — `HierarchyNode` (group/leaf union), `GroupedGraphNode` (group/leaf/ghost union with pinned `fx/fy/fz`), `GroupedGraphLink`, `UNTAGGED_LABEL`
- **buildHierarchy.ts** — Greedy tag-based partition: at each level, pick the tag covering the most datums (alphabetical tiebreak), recurse on the subset, then repeat on remaining datums. Stops when a partition holds one datum or every datum shares the same tag set. Datums with no tags group under `(untagged)`
- **buildPackedLayout3D.ts** — Recursive bottom-up 3D sphere packing. Each group runs a `d3-force-3d` simulation over its children using the largest sibling radius as a uniform collide radius, then sizes itself to contain them. Produces stable `fx/fy/fz/r` positions — no live forces at render time
- **buildVisibleGraph.ts** — Given the hierarchy and a set of expanded group IDs, emits the visible nodes plus "ghost" placeholders for expanded groups. Deduplicates edges to one per (source, target) pair, accumulating the union of tags, and assigns a stable per-pair `curveRotation` hashed from the endpoint IDs
- **hierarchyUtils.ts** — `allGroupIds(roots)` helper for operations over every group in a hierarchy
- **d3-force-3d.d.ts** — Hand-rolled module declaration (no `@types` package is published)
