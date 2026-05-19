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
  /**
   * Unique id for THIS instance of the view. Multiple instances of the same
   * GraphView can be on screen at once; views should pass this id (not the
   * GraphView's static `id`) as the first argument to `useTrackedState` so
   * their per-instance state doesn't collide.
   */
  instanceId: string;
};

export type GraphView = {
  id: string;
  name: string;
  minHeight?: number;
  Component: ComponentType<GraphViewProps>;
};

/**
 * One live entry in the active-views list. `id` is unique across the stack
 * (used everywhere instances are keyed: heights, useTrackedState, undo
 * registry). `typeId` references a `GraphView.id` in the registry.
 */
export type ViewInstance = {
  id: string;
  typeId: string;
};
