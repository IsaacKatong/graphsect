import { ExternalGraph } from "../../external-graph/types";
import {
  DatumTypeFilter,
  DatumTagsFilter,
  ConnectedEdgesFilter,
  EdgeTagsFilter,
  ConnectedDatumsFilter,
  DimensionValuesFilter,
  FilterState,
  EMPTY_FILTER_STATE,
} from "../types";

export function createFilterTestGraph(): ExternalGraph {
  return {
    version: 0,
    datums: [
      { id: "d1", name: "Doc A", type: "MARKDOWN", content: "Content A" },
      { id: "d2", name: "Doc B", type: "MARKDOWN", content: "Content B" },
      { id: "d3", name: "Code C", type: "CODE", content: "Content C" },
      { id: "d4", name: "Image D", type: "IMAGE", content: "Content D" },
    ],
    edges: [
      { fromDatumID: "d1", toDatumID: "d2" },
      { fromDatumID: "d2", toDatumID: "d3" },
      { fromDatumID: "d3", toDatumID: "d4" },
    ],
    datumTags: [
      { name: "tag-alpha", datumID: "d1" },
      { name: "tag-beta", datumID: "d1" },
      { name: "tag-alpha", datumID: "d2" },
      { name: "tag-gamma", datumID: "d3" },
    ],
    datumDimensions: [
      { name: "importance", datumID: "d1", value: 10 },
      { name: "importance", datumID: "d2", value: 5 },
      { name: "importance", datumID: "d3", value: 8 },
      { name: "importance", datumID: "d4", value: 2 },
      { name: "complexity", datumID: "d1", value: 3 },
      { name: "complexity", datumID: "d3", value: 7 },
    ],
    datumTagAssociations: [],
    edgeTags: [
      { name: "related", edgeID: "d1->d2" },
      { name: "depends-on", edgeID: "d2->d3" },
      { name: "references", edgeID: "d3->d4" },
    ],
  };
}

export function createDatumTypeFilter(
  selectedTypes: string[] = ["MARKDOWN"],
): DatumTypeFilter {
  return { selectedTypes };
}

export function createDatumTagsFilter(
  selectedTags: string[] = ["tag-alpha"],
): DatumTagsFilter {
  return { selectedTags };
}

export function createConnectedEdgesFilter(
  selectedEdgeIDs: string[] = ["d1->d2"],
): ConnectedEdgesFilter {
  return { selectedEdgeIDs };
}

export function createEdgeTagsFilter(
  selectedTags: string[] = ["related"],
): EdgeTagsFilter {
  return { selectedTags };
}

export function createConnectedDatumsFilter(
  selectedDatumIDs: string[] = ["d1"],
): ConnectedDatumsFilter {
  return { selectedDatumIDs };
}

export function createDimensionValuesFilter(
  ranges: DimensionValuesFilter["ranges"] = [
    { dimensionName: "importance", min: 5, max: 10 },
  ],
): DimensionValuesFilter {
  return { ranges };
}

export function createFilterState(
  overrides: Partial<FilterState> = {},
): FilterState {
  return { ...EMPTY_FILTER_STATE, ...overrides };
}
