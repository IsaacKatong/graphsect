import {
  ReactNode,
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import { Action } from "./types";
import { ActionLog, ViewActionUndoer } from "./useActionLog";

type ActionLogContextValue = Pick<
  ActionLog,
  "subscribe" | "getSnapshot" | "record" | "registerUndoer"
> & {
  /**
   * Undo the most recent action. Rewinds the corresponding state to the
   * action's recorded `prev` value and removes the action from the log.
   * Undo does not append a new action and does not fire `onAction`.
   */
  undo: () => void;
  /**
   * Global debounce window in milliseconds used by `useTrackedState` when
   * `debounce: true`. Multiple sets within this window collapse into one
   * recorded action.
   */
  debounceMs: number;
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

// Internal — returns the bits `useTrackedState` needs. Falls back to safe
// no-ops when no provider is mounted so views remain renderable standalone.
const NOOP_REGISTER = (
  _viewId: string,
  _kind: string,
  _undoer: ViewActionUndoer,
) => () => {};
const NOOP_RECORD = () => {};

export function useActionLogInternals(): {
  record: ActionLog["record"];
  registerUndoer: ActionLog["registerUndoer"];
  debounceMs: number;
} {
  const ctx = useContext(ActionLogContext);
  return {
    record: ctx?.record ?? NOOP_RECORD,
    registerUndoer: ctx?.registerUndoer ?? NOOP_REGISTER,
    debounceMs: ctx?.debounceMs ?? DEFAULT_DEBOUNCE_MS,
  };
}

export const DEFAULT_DEBOUNCE_MS = 300;
