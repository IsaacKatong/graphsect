import { FilterState } from "../filtering/types";
import { ViewInstance } from "../views/types";

type ActionBase = {
  seq: number;
  timestamp: number;
};

export type FilterChangedAction = ActionBase & {
  type: "FILTER_CHANGED";
  prev: FilterState;
  next: FilterState;
  changedKeys: (keyof FilterState)[];
};

export type ViewsChangedAction = ActionBase & {
  type: "VIEWS_CHANGED";
  prev: ViewInstance[];
  next: ViewInstance[];
  added: ViewInstance[];
  removed: ViewInstance[];
};

export type SelectionChangedAction = ActionBase & {
  type: "SELECTION_CHANGED";
  prev: string | null;
  next: string | null;
};

/**
 * Generic view-owned action. Emitted by `useTrackedState`. The view registers
 * an undoer keyed by `{ viewId, kind }` with the action log so undo can route
 * back to the view's setter. `prev` and `next` are opaque to the log.
 */
export type ViewAction = ActionBase & {
  type: "VIEW_ACTION";
  viewId: string;
  kind: string;
  prev: unknown;
  next: unknown;
};

export type Action =
  | FilterChangedAction
  | ViewsChangedAction
  | SelectionChangedAction
  | ViewAction;

export type ActionType = Action["type"];
