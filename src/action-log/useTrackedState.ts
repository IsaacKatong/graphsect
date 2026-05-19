import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useActionLogInternals } from "./ActionLogContext";

type Options = {
  /**
   * When true, multiple sets within the global `debounceMs` window collapse
   * into a single recorded action. The recorded `prev` is the value at the
   * start of the window; `next` is the value at the end. Use for continuous
   * gestures (drag, scroll, wheel zoom). Discrete actions (button clicks at
   * human speed) work fine either way — debounced clicks made in rapid
   * succession will coalesce into one undo step, which is usually desired.
   *
   * @default false
   */
  debounce?: boolean;
};

/**
 * Drop-in replacement for `useState` that participates in the action log:
 * every committed change is recorded as a `VIEW_ACTION` and an undoer for
 * `(viewId, kind)` is registered so the host's Undo button can rewind the
 * state via the hook's own setter.
 *
 * View-local state that is NOT user-driven or NOT meaningful for undo should
 * continue to use plain `useState` (transient UI flicker, hover, etc.).
 *
 * Outside of an ActionLogProvider, the hook degrades into a plain `useState`:
 * setting works but nothing is recorded.
 */
export function useTrackedState<T>(
  viewId: string,
  kind: string,
  initial: T | (() => T),
  options: Options = {},
): [T, Dispatch<SetStateAction<T>>, Dispatch<SetStateAction<T>>] {
  const { debounce = false } = options;
  const { record, registerUndoer, debounceMs } = useActionLogInternals();

  const [value, setValue] = useState<T>(initial);

  // `baseline` is the value as of the last recorded action — i.e. the value
  // a subsequent undo would target as `prev`. `live` mirrors React state for
  // synchronous reads inside callbacks.
  const baselineRef = useRef<T>(value);
  const liveRef = useRef<T>(value);
  liveRef.current = value;

  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The undoer applies `prev` to the same React state. Cancel any pending
  // debounce so we don't re-record the undone value when the timer fires.
  useEffect(() => {
    const unregister = registerUndoer(viewId, kind, (prev) => {
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      baselineRef.current = prev as T;
      liveRef.current = prev as T;
      setValue(prev as T);
    });
    return unregister;
  }, [registerUndoer, viewId, kind]);

  // Cancel any pending debounce on unmount. We deliberately do NOT flush —
  // a half-completed gesture in an unmounted view isn't recoverable anyway.
  useEffect(
    () => () => {
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    },
    [],
  );

  const set = useCallback(
    (update: SetStateAction<T>) => {
      const prev = liveRef.current;
      const next =
        typeof update === "function"
          ? (update as (p: T) => T)(prev)
          : update;
      if (Object.is(prev, next)) return;
      // Keep liveRef in sync immediately so back-to-back calls compose; the
      // React state catches up on the next commit.
      liveRef.current = next;
      setValue(next);

      if (debounce) {
        if (pendingTimerRef.current !== null) {
          clearTimeout(pendingTimerRef.current);
        }
        pendingTimerRef.current = setTimeout(() => {
          pendingTimerRef.current = null;
          const baseline = baselineRef.current;
          const current = liveRef.current;
          if (Object.is(baseline, current)) return;
          record({
            type: "VIEW_ACTION",
            viewId,
            kind,
            prev: baseline,
            next: current,
          });
          baselineRef.current = current;
        }, debounceMs);
      } else {
        const baseline = baselineRef.current;
        record({
          type: "VIEW_ACTION",
          viewId,
          kind,
          prev: baseline,
          next,
        });
        baselineRef.current = next;
      }
    },
    [debounce, debounceMs, record, viewId, kind],
  );

  // Update state + baseline without recording an action. Useful for
  // initializing or syncing to external defaults (e.g. when a new view is
  // added to a resizable stack, the host needs to seed its starting height
  // without that initialization showing up in undo). Cancels any pending
  // debounce so a half-formed gesture isn't recorded against the new
  // baseline.
  const setUntracked = useCallback((update: SetStateAction<T>) => {
    const prev = liveRef.current;
    const next =
      typeof update === "function"
        ? (update as (p: T) => T)(prev)
        : update;
    if (Object.is(prev, next)) return;
    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    liveRef.current = next;
    baselineRef.current = next;
    setValue(next);
  }, []);

  return [value, set, setUntracked];
}
