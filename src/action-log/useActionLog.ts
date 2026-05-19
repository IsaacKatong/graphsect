import { useCallback, useMemo, useRef } from "react";
import { Action } from "./types";

type ActionInput =
  | Omit<Extract<Action, { type: "FILTER_CHANGED" }>, "seq" | "timestamp">
  | Omit<Extract<Action, { type: "VIEWS_CHANGED" }>, "seq" | "timestamp">
  | Omit<Extract<Action, { type: "SELECTION_CHANGED" }>, "seq" | "timestamp">
  | Omit<Extract<Action, { type: "VIEW_ACTION" }>, "seq" | "timestamp">;

/**
 * Receives the `prev` value from a VIEW_ACTION when undoing. The view is
 * responsible for applying it to its own state.
 */
export type ViewActionUndoer = (prev: unknown) => void;

export type ActionLog = {
  record: (input: ActionInput) => void;
  /**
   * Remove and return the most recent action, or null if the log is empty.
   * Used to drive undo. Popping does not append a new action — undo rewinds
   * the log rather than extending it.
   */
  pop: () => Action | null;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly Action[];
  /**
   * Register an undoer for a `(viewId, kind)` pair. Returns an unregister
   * function. If the pair is already registered the new undoer replaces the
   * previous one — re-mounting a view with the same id is fine.
   */
  registerUndoer: (
    viewId: string,
    kind: string,
    undoer: ViewActionUndoer,
  ) => () => void;
  /** Look up an undoer by `(viewId, kind)`, or `null` if none registered. */
  getUndoer: (viewId: string, kind: string) => ViewActionUndoer | null;
};

function undoerKey(viewId: string, kind: string): string {
  return `${viewId}\x00${kind}`;
}

// Single chokepoint that every action-worthy state setter funnels through.
// Stored in refs (not React state) so recording never triggers a re-render of
// the host; subscribers opt in to re-rendering via useSyncExternalStore.
export function useActionLog(): ActionLog {
  const logRef = useRef<readonly Action[]>([]);
  const seqRef = useRef(0);
  const listenersRef = useRef<Set<() => void>>(new Set());
  const undoersRef = useRef<Map<string, ViewActionUndoer>>(new Map());

  const record = useCallback((input: ActionInput) => {
    seqRef.current += 1;
    const action = {
      ...input,
      seq: seqRef.current,
      timestamp: Date.now(),
    } as Action;
    logRef.current = [...logRef.current, action];
    for (const listener of listenersRef.current) listener();
  }, []);

  const pop = useCallback((): Action | null => {
    const current = logRef.current;
    if (current.length === 0) return null;
    const action = current[current.length - 1];
    logRef.current = current.slice(0, -1);
    for (const listener of listenersRef.current) listener();
    return action;
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getSnapshot = useCallback(() => logRef.current, []);

  const registerUndoer = useCallback(
    (viewId: string, kind: string, undoer: ViewActionUndoer) => {
      const key = undoerKey(viewId, kind);
      undoersRef.current.set(key, undoer);
      return () => {
        // Only delete if it's still our undoer — guards against the unmount
        // cleanup of an older instance overwriting a freshly-mounted one.
        if (undoersRef.current.get(key) === undoer) {
          undoersRef.current.delete(key);
        }
      };
    },
    [],
  );

  const getUndoer = useCallback(
    (viewId: string, kind: string) =>
      undoersRef.current.get(undoerKey(viewId, kind)) ?? null,
    [],
  );

  return useMemo(
    () => ({
      record,
      pop,
      subscribe,
      getSnapshot,
      registerUndoer,
      getUndoer,
    }),
    [record, pop, subscribe, getSnapshot, registerUndoer, getUndoer],
  );
}
