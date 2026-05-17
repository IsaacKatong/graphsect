# carousels

A **carousel** is a named list of datum tags drawn from an `ExternalGraph`.
The Carousels view renders each carousel as a title plus an equal-sized
rectangle for every tag (text scaled to fit, wrapping to new lines once a row
overflows). Clicking a tag rewrites the `datumTags` filter so the rest of the
app sees only datums carrying that tag.

The interface is intentionally tiny so clients can register their own
carousels:

```ts
type CarouselDatumTagSelection = (graph: ExternalGraph) => string[];

type Carousel = {
  name: string;                          // section title
  selection: CarouselDatumTagSelection;  // returns the tags, in render order
};
```

The `selection` function is given the **source graph** (pre-filter) so the
carousel can offer the full menu of tags regardless of the current filter
state. The function's return order is the render order — sort however you
like.

## Default carousel — Most Connected

`MOST_CONNECTED_CAROUSEL` sorts every tag by `computeTagScores(graph)`
descending, ties broken alphabetically. The scoring formula is the same one
used by the Tag Mesh layout (so the carousel order matches what's visually
"big" in the mesh):

    score(T) = |datums(T)| + Σ deg(d) for d ∈ datums(T)

`scoreTag.ts` is the canonical implementation; `buildTagMeshLayout` consumes
the same `Map<string, number>` rather than re-deriving the formula.

## Adding your own carousel

```tsx
const RECENTLY_USED: Carousel = {
  name: "Recently used",
  selection: (graph) => recencyLookup(graph),
};

<GraphSect graph={...} carousels={[RECENTLY_USED, MOST_CONNECTED_CAROUSEL]} />
```

`<GraphSect>` rebuilds the Carousels view from the `carousels` prop, so the
order in that array is the order of sections in the view. To rebuild the
view yourself (e.g. to ship it in a custom `views` registry), call
`createCarouselsView(carousels)` from `src/views/views/CarouselsView.tsx`.

## Files

- `types.ts` — the `Carousel` / `CarouselDatumTagSelection` contract.
- `scoreTag.ts` — `computeTagScores`, the canonical connectedness score.
- `defaultCarousels.ts` — `MOST_CONNECTED_CAROUSEL` and
  `DEFAULT_CAROUSELS`.
- `index.ts` — public re-exports.
