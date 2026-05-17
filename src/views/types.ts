import { ComponentType } from "react";
import { ExternalGraph } from "../external-graph/types";
import { FilterState } from "../filtering/types";

export type GraphViewProps = {
  sourceGraph: ExternalGraph;
  graph: ExternalGraph;
  filterState: FilterState;
  onFilterStateChange: (next: FilterState) => void;
};

export type GraphView = {
  id: string;
  name: string;
  minHeight?: number;
  Component: ComponentType<GraphViewProps>;
};
