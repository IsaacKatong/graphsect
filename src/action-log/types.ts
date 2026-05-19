import { FilterState } from "../filtering/types";

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
  prev: string[];
  next: string[];
  added: string[];
  removed: string[];
};

export type SelectionChangedAction = ActionBase & {
  type: "SELECTION_CHANGED";
  prev: string | null;
  next: string | null;
};

export type Action =
  | FilterChangedAction
  | ViewsChangedAction
  | SelectionChangedAction;

export type ActionType = Action["type"];
