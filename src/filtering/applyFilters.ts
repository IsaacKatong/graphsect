import { ExternalGraph } from "../external-graph/types";
import { FilterState, FilterCallbacks } from "./types";
import {
  filterByDatumType,
  filterByDatumTags,
  filterByConnectedEdges,
  filterByEdgeTags,
  filterByConnectedDatums,
  filterByDimensionValues,
  makeConsistent,
} from "./defaultFilters";

type FilterEntry = {
  key: keyof FilterState;
  defaultFn: (graph: ExternalGraph, filter: never) => ExternalGraph;
};

const FILTER_PIPELINE: FilterEntry[] = [
  { key: "datumType", defaultFn: filterByDatumType as FilterEntry["defaultFn"] },
  { key: "datumTags", defaultFn: filterByDatumTags as FilterEntry["defaultFn"] },
  { key: "connectedEdges", defaultFn: filterByConnectedEdges as FilterEntry["defaultFn"] },
  { key: "edgeTags", defaultFn: filterByEdgeTags as FilterEntry["defaultFn"] },
  { key: "connectedDatums", defaultFn: filterByConnectedDatums as FilterEntry["defaultFn"] },
  { key: "dimensionValues", defaultFn: filterByDimensionValues as FilterEntry["defaultFn"] },
];

export function applyFilters(
  graph: ExternalGraph,
  filterState: FilterState,
  callbacks?: FilterCallbacks,
): ExternalGraph {
  let result = graph;
  let anyApplied = false;

  for (const { key, defaultFn } of FILTER_PIPELINE) {
    const filterValue = filterState[key];
    if (filterValue === null) continue;

    anyApplied = true;
    const callback = callbacks?.[key];
    if (callback) {
      result = (callback as (graph: ExternalGraph, filter: typeof filterValue) => ExternalGraph)(
        result,
        filterValue,
      );
    } else {
      result = defaultFn(result, filterValue as never);
    }
  }

  // Each default filter narrows only its primary scope (datums or edges)
  // and leaves metadata + cross-table refs alone, so dangling references
  // can build up across the pipeline. `makeConsistent` cleans them up in
  // one place at the end — order-independent and a single source of truth
  // for cross-table invariants. Skip the pass when nothing was applied so
  // the no-op path can still return the source graph by reference.
  return anyApplied ? makeConsistent(result) : result;
}
