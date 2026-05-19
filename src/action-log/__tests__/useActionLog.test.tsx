import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useActionLog } from "../useActionLog";
import { EMPTY_FILTER_STATE, FilterState } from "../../filtering/types";

describe("useActionLog", () => {
  it("assigns a strictly increasing seq to every action", () => {
    const { result } = renderHook(() => useActionLog());

    act(() => {
      result.current.record({
        type: "SELECTION_CHANGED",
        prev: null,
        next: "a",
      });
      result.current.record({
        type: "SELECTION_CHANGED",
        prev: "a",
        next: "b",
      });
      result.current.record({
        type: "VIEWS_CHANGED",
        prev: ["filters"],
        next: ["filters", "tag-mesh"],
        added: ["tag-mesh"],
        removed: [],
      });
    });

    const log = result.current.getSnapshot();
    expect(log.map((a) => a.seq)).toEqual([1, 2, 3]);
    expect(log.map((a) => a.type)).toEqual([
      "SELECTION_CHANGED",
      "SELECTION_CHANGED",
      "VIEWS_CHANGED",
    ]);
  });

  it("notifies subscribers on each record", () => {
    const { result } = renderHook(() => useActionLog());
    let calls = 0;
    const unsubscribe = result.current.subscribe(() => {
      calls += 1;
    });

    act(() => {
      result.current.record({
        type: "SELECTION_CHANGED",
        prev: null,
        next: "a",
      });
      result.current.record({
        type: "SELECTION_CHANGED",
        prev: "a",
        next: null,
      });
    });

    expect(calls).toBe(2);
    unsubscribe();
    act(() => {
      result.current.record({
        type: "SELECTION_CHANGED",
        prev: null,
        next: "c",
      });
    });
    expect(calls).toBe(2);
  });

  it("pop() removes and returns the most recent action, or null when empty", () => {
    const { result } = renderHook(() => useActionLog());

    expect(result.current.pop()).toBeNull();

    act(() => {
      result.current.record({
        type: "SELECTION_CHANGED",
        prev: null,
        next: "a",
      });
      result.current.record({
        type: "SELECTION_CHANGED",
        prev: "a",
        next: "b",
      });
    });

    // Note: no `= null` initializer — TS narrows that to the literal `null`,
    // and since the reassignment happens inside an `act()` callback the
    // compiler can't see it widen back, leaving `popped` as `never` after
    // the not-null check. The definite-assignment `!` keeps the declared
    // `Action | null` type.
    let popped!: ReturnType<typeof result.current.pop>;
    act(() => {
      popped = result.current.pop();
    });
    if (!popped) throw new Error("expected an action");
    expect(popped.seq).toBe(2);
    if (popped.type === "SELECTION_CHANGED") {
      expect(popped.next).toBe("b");
    }
    expect(result.current.getSnapshot()).toHaveLength(1);

    act(() => {
      popped = result.current.pop();
    });
    expect(result.current.getSnapshot()).toHaveLength(0);
    act(() => {
      popped = result.current.pop();
    });
    expect(popped).toBeNull();
  });

  it("undoer registry: register, lookup, unregister, replace-on-same-key", () => {
    const { result } = renderHook(() => useActionLog());
    const undoer1 = vi.fn();
    const undoer2 = vi.fn();

    expect(result.current.getUndoer("v", "k")).toBeNull();

    const unreg1 = result.current.registerUndoer("v", "k", undoer1);
    expect(result.current.getUndoer("v", "k")).toBe(undoer1);

    // Re-registering with the same key replaces (mimics a remount).
    const unreg2 = result.current.registerUndoer("v", "k", undoer2);
    expect(result.current.getUndoer("v", "k")).toBe(undoer2);

    // Cleanup of the OLD instance must not clobber the new registration.
    unreg1();
    expect(result.current.getUndoer("v", "k")).toBe(undoer2);

    unreg2();
    expect(result.current.getUndoer("v", "k")).toBeNull();
  });

  it("pop() notifies subscribers", () => {
    const { result } = renderHook(() => useActionLog());
    let calls = 0;
    result.current.subscribe(() => {
      calls += 1;
    });

    act(() => {
      result.current.record({
        type: "SELECTION_CHANGED",
        prev: null,
        next: "a",
      });
    });
    expect(calls).toBe(1);

    act(() => {
      result.current.pop();
    });
    expect(calls).toBe(2);
  });

  it("preserves the original prev/next FilterState on a recorded filter change", () => {
    const { result } = renderHook(() => useActionLog());
    const prev: FilterState = EMPTY_FILTER_STATE;
    const next: FilterState = {
      ...EMPTY_FILTER_STATE,
      datumType: { selectedTypes: ["MARKDOWN"] },
    };

    act(() => {
      result.current.record({
        type: "FILTER_CHANGED",
        prev,
        next,
        changedKeys: ["datumType"],
      });
    });

    const [action] = result.current.getSnapshot();
    expect(action.type).toBe("FILTER_CHANGED");
    if (action.type === "FILTER_CHANGED") {
      expect(action.prev).toBe(prev);
      expect(action.next).toBe(next);
      expect(action.changedKeys).toEqual(["datumType"]);
    }
  });
});
