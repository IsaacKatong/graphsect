import {
  ReactNode,
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import { Action } from "./types";
import { ActionLog } from "./useActionLog";

type ActionLogContextValue = Pick<ActionLog, "subscribe" | "getSnapshot"> & {
  /**
   * Undo the most recent action. Rewinds the corresponding state to the
   * action's recorded `prev` value and removes the action from the log.
   * Undo does not append a new action and does not fire `onAction`.
   */
  undo: () => void;
};

const ActionLogContext = createContext<ActionLogContextValue | null>(null);

export function ActionLogProvider({
  value,
  children,
}: {
  value: ActionLogContextValue;
  children: ReactNode;
}) {
  return (
    <ActionLogContext.Provider value={value}>
      {children}
    </ActionLogContext.Provider>
  );
}

// Subscribe a component to the action log. Re-renders whenever a new action
// is recorded. Returns the full log in insertion order; consumers can take
// the last entry, filter by type, etc.
export function useActionLogSnapshot(): readonly Action[] {
  const ctx = useContext(ActionLogContext);
  if (!ctx) {
    throw new Error(
      "useActionLogSnapshot must be used inside an ActionLogProvider",
    );
  }
  return useSyncExternalStore(ctx.subscribe, ctx.getSnapshot, ctx.getSnapshot);
}

// Returns `{ undo, canUndo }`. `canUndo` is derived from the live log length
// and re-renders the caller whenever the log changes. If no provider is
// mounted (e.g. a view is rendered standalone in a test), undo is a no-op
// and `canUndo` is false so the UndoButton renders disabled.
const EMPTY_SUBSCRIBE = () => () => {};
const EMPTY_SNAPSHOT: readonly Action[] = [];
const EMPTY_GET = () => EMPTY_SNAPSHOT;
const NOOP = () => {};

export function useUndo(): { undo: () => void; canUndo: boolean } {
  const ctx = useContext(ActionLogContext);
  const subscribe = ctx?.subscribe ?? EMPTY_SUBSCRIBE;
  const getSnapshot = ctx?.getSnapshot ?? EMPTY_GET;
  const log = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { undo: ctx?.undo ?? NOOP, canUndo: log.length > 0 };
}
