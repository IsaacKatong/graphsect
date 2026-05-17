import { ComponentType } from "react";
import { ExternalGraph } from "../external-graph/types";
import { FilterState } from "../filtering/types";

export type GraphViewProps = {
  sourceGraph: ExternalGraph;
  graph: ExternalGraph;
  filterState: FilterState;
  onFilterStateChange: (next: FilterState) => void;
  /**
   * Globally-selected datum (the one whose detail panel is currently open),
   * or null when nothing is selected. Hoisted to `<GraphSect>` so every view
   * shares one selection: clicking a datum in any view replaces whatever
   * was selected before and pops the same shared detail panel.
   */
  selectedDatumId: string | null;
  onSelectedDatumIdChange: (id: string | null) => void;
};

export type GraphView = {
  id: string;
  name: string;
  minHeight?: number;
  Component: ComponentType<GraphViewProps>;
};
