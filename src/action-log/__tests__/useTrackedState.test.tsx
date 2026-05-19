import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { ReactNode, useEffect } from "react";
import { useActionLog } from "../useActionLog";
import {
  ActionLogProvider,
  DEFAULT_DEBOUNCE_MS,
} from "../ActionLogContext";
import { useTrackedState } from "../useTrackedState";
import type { Action } from "../types";

// A tiny harness component that mounts the provider and exposes the action
// log + a tracked-state hook via callback refs to the test.
function Harness({
  onLog,
  debounce,
  children,
}: {
  onLog: (api: ReturnType<typeof useActionLog>) => void;
  debounce?: boolean;
  children: (
    value: number,
    setValue: (n: number | ((p: number) => number)) => void,
  ) => ReactNode;
}) {
  const log = useActionLog();
  useEffect(() => {
    onLog(log);
  }, [log, onLog]);
  return (
    <ActionLogProvider
      value={{
        subscribe: log.subscribe,
        getSnapshot: log.getSnapshot,
        record: log.record,
        registerUndoer: log.registerUndoer,
        undo: () => {
          const action = log.pop();
          if (action?.type === "VIEW_ACTION") {
            const undoer = log.getUndoer(action.viewId, action.kind);
            undoer?.(action.prev);
          }
        },
        debounceMs: DEFAULT_DEBOUNCE_MS,
      }}
    >
      <Probe debounce={debounce}>{children}</Probe>
    </ActionLogProvider>
  );
}

function Probe({
  debounce,
  children,
}: {
  debounce?: boolean;
  children: (
    value: number,
    setValue: (n: number | ((p: number) => number)) => void,
  ) => ReactNode;
}) {
  const [value, setValue] = useTrackedState<number>("probe", "count", 0, {
    debounce,
  });
  return <>{children(value, setValue)}</>;
}

describe("useTrackedState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records a VIEW_ACTION on every set when not debounced", () => {
    let log!: ReturnType<typeof useActionLog>;
    let setValue!: (n: number) => void;
    render(
      <Harness onLog={(l) => (log = l)}>
        {(_, set) => {
          setValue = set;
          return null;
        }}
      </Harness>,
    );

    act(() => {
      setValue(1);
    });
    act(() => {
      setValue(2);
    });

    const snapshot = log.getSnapshot();
    expect(snapshot.map((a) => [a.type, (a as { prev?: unknown }).prev, (a as { next?: unknown }).next])).toEqual([
      ["VIEW_ACTION", 0, 1],
      ["VIEW_ACTION", 1, 2],
    ]);
  });

  it("coalesces a debounced burst into one action", () => {
    let log!: ReturnType<typeof useActionLog>;
    let setValue!: (n: number) => void;
    render(
      <Harness onLog={(l) => (log = l)} debounce>
        {(_, set) => {
          setValue = set;
          return null;
        }}
      </Harness>,
    );

    act(() => {
      setValue(1);
      setValue(2);
      setValue(3);
    });
    expect(log.getSnapshot()).toHaveLength(0);
    // Advance past the debounce window.
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 1);
    });
    const snapshot = log.getSnapshot();
    expect(snapshot).toHaveLength(1);
    const action = snapshot[0];
    if (action.type !== "VIEW_ACTION") throw new Error("unreachable");
    expect(action.prev).toBe(0);
    expect(action.next).toBe(3);
  });

  it("does not record when the new value equals the previous (Object.is)", () => {
    let log!: ReturnType<typeof useActionLog>;
    let setValue!: (n: number) => void;
    render(
      <Harness onLog={(l) => (log = l)}>
        {(_, set) => {
          setValue = set;
          return null;
        }}
      </Harness>,
    );

    act(() => {
      setValue(0);
    });
    expect(log.getSnapshot()).toHaveLength(0);
  });

  it("undo via the registered undoer rewinds the state and pops the log", () => {
    let log!: ReturnType<typeof useActionLog>;
    let setValue!: (n: number) => void;
    let lastValue = -1;
    render(
      <Harness onLog={(l) => (log = l)}>
        {(value, set) => {
          lastValue = value;
          setValue = set;
          return null;
        }}
      </Harness>,
    );

    act(() => {
      setValue(7);
    });
    expect(lastValue).toBe(7);
    expect(log.getSnapshot()).toHaveLength(1);

    // Apply undo (the Harness wires undo to look up the VIEW_ACTION undoer).
    act(() => {
      const action = log.pop();
      if (action?.type === "VIEW_ACTION") {
        const undoer = log.getUndoer(action.viewId, action.kind);
        undoer?.(action.prev);
      }
    });
    expect(lastValue).toBe(0);
    expect(log.getSnapshot()).toHaveLength(0);
  });

  it("unmounting cancels a pending debounced action", () => {
    let log!: ReturnType<typeof useActionLog>;
    let setValue!: (n: number) => void;
    const { unmount } = render(
      <Harness onLog={(l) => (log = l)} debounce>
        {(_, set) => {
          setValue = set;
          return null;
        }}
      </Harness>,
    );

    act(() => {
      setValue(5);
    });
    expect(log.getSnapshot()).toHaveLength(0);
    unmount();
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 100);
    });
    expect(log.getSnapshot()).toHaveLength(0);
  });

  it("undoing a debounced gesture cancels the pending timer (no double record)", () => {
    let log!: ReturnType<typeof useActionLog>;
    let setValue!: (n: number) => void;
    render(
      <Harness onLog={(l) => (log = l)} debounce>
        {(_, set) => {
          setValue = set;
          return null;
        }}
      </Harness>,
    );

    act(() => {
      setValue(1);
    });
    // The timer is pending here. If the user undoes BEFORE the debounce
    // fires, our undoer should cancel the timer; otherwise we'd record a
    // bogus VIEW_ACTION moments later.
    act(() => {
      const undoer = log.getUndoer("probe", "count");
      undoer?.(0);
    });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS + 100);
    });
    expect(log.getSnapshot()).toHaveLength(0);
  });
});
