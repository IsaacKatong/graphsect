import { ExternalGraph } from "../external-graph/types";

// --- Filter value types (one per filter kind) ---

export type DatumTypeFilter = { selectedTypes: string[] };

export type DatumTagsFilter = { selectedTags: string[] };

export type ConnectedEdgesFilter = { selectedEdgeIDs: string[] };

export type EdgeTagsFilter = { selectedTags: string[] };

export type ConnectedDatumsFilter = { selectedDatumIDs: string[] };

export type DimensionValuesFilter = {
  ranges: { dimensionName: string; min: number; max: number }[];
};

// --- Combined filter state ---

export type FilterState = {
  datumType: DatumTypeFilter | null;
  datumTags: DatumTagsFilter | null;
  connectedEdges: ConnectedEdgesFilter | null;
  edgeTags: EdgeTagsFilter | null;
  connectedDatums: ConnectedDatumsFilter | null;
  dimensionValues: DimensionValuesFilter | null;
};

// --- Callback type for a single filter ---

export type FilterCallback<T> = (
  graph: ExternalGraph,
  filter: T,
) => ExternalGraph;

// --- All overridable callbacks in one sub-object ---

export type FilterCallbacks = {
  datumType?: FilterCallback<DatumTypeFilter>;
  datumTags?: FilterCallback<DatumTagsFilter>;
  connectedEdges?: FilterCallback<ConnectedEdgesFilter>;
  edgeTags?: FilterCallback<EdgeTagsFilter>;
  connectedDatums?: FilterCallback<ConnectedDatumsFilter>;
  dimensionValues?: FilterCallback<DimensionValuesFilter>;
};

// --- Full override: replaces ALL built-in filtering ---

export type CustomGraphFilter = (
  sourceGraph: ExternalGraph,
) => ExternalGraph;

export const EMPTY_FILTER_STATE: FilterState = {
  datumType: null,
  datumTags: null,
  connectedEdges: null,
  edgeTags: null,
  connectedDatums: null,
  dimensionValues: null,
};
