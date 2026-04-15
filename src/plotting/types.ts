import { ExternalGraph } from "../external-graph/types";

export type DimensionSelection = {
  dimensions: string[];
};

export type DimensionSelectionCallbacks = {
  onDimensionsChange?: (dimensions: string[]) => void;
};

export type CustomDimensionSelector = (
  graph: ExternalGraph,
) => string[];
