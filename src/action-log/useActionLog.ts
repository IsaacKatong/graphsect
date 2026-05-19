import { useCallback, useMemo, useRef } from "react";
import { Action } from "./types";

type ActionInput =
  | Omit<Extract<Action, { type: "FILTER_CHANGED" }>, "seq" | "timestamp">
  | Omit<Extract<Action, { type: "VIEWS_CHANGED" }>, "seq" | "timestamp">
  | Omit<Extract<Action, { type: "SELECTION_CHANGED" }>, "seq" | "timestamp">;

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
};

// Single chokepoint that every action-worthy state setter funnels through.
// Stored in refs (not React state) so recording never triggers a re-render of
// the host; subscribers opt in to re-rendering via useSyncExternalStore.
export function useActionLog(): ActionLog {
  const logRef = useRef<readonly Action[]>([]);
  const seqRef = useRef(0);
  const listenersRef = useRef<Set<() => void>>(new Set());

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

  return useMemo(
    () => ({ record, pop, subscribe, getSnapshot }),
    [record, pop, subscribe, getSnapshot],
  );
}
