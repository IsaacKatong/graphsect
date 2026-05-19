import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import GraphSect from "../../App";
import { createMockGraph } from "../../external-graph/__fixtures__/mockGraph";
import { GraphView, GraphViewProps } from "../../views/types";
import { FILTERS_VIEW } from "../../views/builtinViews";
import { useViewSelector } from "../../views/ViewSelectorContext";
import { EMPTY_FILTER_STATE, FilterState } from "../../filtering/types";
import { useActionLogSnapshot } from "../ActionLogContext";
import { useTrackedState } from "../useTrackedState";
import type { Action } from "../types";

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

// Captures the props the host hands to a view so the test can drive setters
// directly without simulating real UI events.
type Captured = {
  props: GraphViewProps | null;
};

function makeCapturingView(id: string, captured: Captured): GraphView {
  return {
    id,
    name: id,
    minHeight: 100,
    Component: (props: GraphViewProps) => {
      captured.props = props;
      return <div data-testid={`view-${id}`} />;
    },
  };
}

describe("GraphSect action pipeline", () => {
  it("emits FILTER, VIEWS, and SELECTION actions in source order via onAction", () => {
    const captured: Captured = { props: null };
    const probe = makeCapturingView("probe", captured);
    const other = makeCapturingView("other", { props: null });
    const actions: Action[] = [];

    render(
      <GraphSect
        graph={createMockGraph()}
        views={[FILTERS_VIEW, probe, other]}
        defaultActiveViewIds={["probe"]}
        onAction={(a) => actions.push(a)}
      />,
    );

    const props = captured.props!;
    expect(props).not.toBeNull();

    act(() => {
      props.onFilterStateChange({
        ...EMPTY_FILTER_STATE,
        datumType: { selectedTypes: ["MARKDOWN"] },
      });
    });
    act(() => {
      props.onSelectedDatumIdChange("node-1");
    });
    act(() => {
      props.onSelectedDatumIdChange("node-2");
    });

    expect(actions.map((a) => [a.seq, a.type])).toEqual([
      [1, "FILTER_CHANGED"],
      [2, "SELECTION_CHANGED"],
      [3, "SELECTION_CHANGED"],
    ]);

    const filterAction = actions[0];
    if (filterAction.type !== "FILTER_CHANGED") throw new Error("unreachable");
    expect(filterAction.changedKeys).toEqual(["datumType"]);
    expect(filterAction.prev).toEqual(EMPTY_FILTER_STATE);

    const selAction = actions[1];
    if (selAction.type !== "SELECTION_CHANGED") throw new Error("unreachable");
    expect(selAction.prev).toBeNull();
    expect(selAction.next).toBe("node-1");
  });

  it("ignores no-op setter calls (same value in, no action out)", () => {
    const captured: Captured = { props: null };
    const probe = makeCapturingView("probe", captured);
    const actions: Action[] = [];

    render(
      <GraphSect
        graph={createMockGraph()}
        views={[FILTERS_VIEW, probe]}
        defaultActiveViewIds={["probe"]}
        onAction={(a) => actions.push(a)}
      />,
    );

    act(() => {
      captured.props!.onSelectedDatumIdChange(null);
      captured.props!.onFilterStateChange(EMPTY_FILTER_STATE);
    });

    expect(actions).toEqual([]);
  });

  it("records VIEWS_CHANGED with added/removed when the active view set changes", () => {
    let selector: ReturnType<typeof useViewSelector> = null;
    const Probe: GraphView = {
      id: "probe",
      name: "probe",
      minHeight: 100,
      Component: () => {
        selector = useViewSelector();
        return <div data-testid="view-probe" />;
      },
    };
    const other: GraphView = {
      id: "other",
      name: "other",
      minHeight: 100,
      Component: () => <div data-testid="view-other" />,
    };
    const actions: Action[] = [];

    render(
      <GraphSect
        graph={createMockGraph()}
        views={[FILTERS_VIEW, Probe, other]}
        defaultActiveViewIds={["probe"]}
        onAction={(a) => actions.push(a)}
      />,
    );

    expect(selector).not.toBeNull();

    act(() => {
      // Add "other" to the active list.
      selector!.onActiveIdsChange(["probe", "other"]);
    });
    act(() => {
      // Remove "probe" — the host re-pins "filters" automatically.
      selector!.onActiveIdsChange(["other"]);
    });

    const viewActions = actions.filter((a) => a.type === "VIEWS_CHANGED");
    expect(viewActions).toHaveLength(2);

    const [add, remove] = viewActions;
    if (add.type !== "VIEWS_CHANGED" || remove.type !== "VIEWS_CHANGED") {
      throw new Error("unreachable");
    }
    expect(add.added).toEqual(["other"]);
    expect(add.removed).toEqual([]);
    expect(remove.added).toEqual([]);
    expect(remove.removed).toEqual(["probe"]);
    // The pinned filters view stays in `next` across both transitions.
    expect(remove.next).toContain("filters");
  });

  it("Undo button rewinds each action type, pops the log, and does not fire onAction", () => {
    const captured: Captured = { props: null };
    const probe = makeCapturingView("probe", captured);
    const other: GraphView = {
      id: "other",
      name: "other",
      minHeight: 100,
      Component: () => <div data-testid="view-other" />,
    };
    const actions: Action[] = [];
    let logFromInsideAView: readonly Action[] = [];

    // A view that reports the live snapshot to the test scope.
    const inspector: GraphView = {
      id: "inspector",
      name: "inspector",
      minHeight: 100,
      Component: () => {
        logFromInsideAView = useActionLogSnapshot();
        return <div data-testid="view-inspector" />;
      },
    };

    let selector: ReturnType<typeof useViewSelector> = null;
    const probeWithSelector: GraphView = {
      ...probe,
      Component: (props: GraphViewProps) => {
        captured.props = props;
        selector = useViewSelector();
        return <div data-testid={`view-${probe.id}`} />;
      },
    };

    render(
      <GraphSect
        graph={createMockGraph()}
        views={[FILTERS_VIEW, probeWithSelector, other, inspector]}
        defaultActiveViewIds={["probe", "inspector"]}
        onAction={(a) => actions.push(a)}
      />,
    );

    const props = captured.props!;
    expect(props).not.toBeNull();

    // 1) Filter change.
    const filtered: FilterState = {
      ...EMPTY_FILTER_STATE,
      datumType: { selectedTypes: ["MARKDOWN"] },
    };
    act(() => {
      props.onFilterStateChange(filtered);
    });
    // 2) Selection change.
    act(() => {
      props.onSelectedDatumIdChange("node-1");
    });
    // 3) Views change.
    act(() => {
      selector!.onActiveIdsChange(["probe", "inspector", "other"]);
    });

    expect(actions.map((a) => a.type)).toEqual([
      "FILTER_CHANGED",
      "SELECTION_CHANGED",
      "VIEWS_CHANGED",
    ]);
    expect(logFromInsideAView).toHaveLength(3);

    const undoBtn = screen.getByTestId("undo-button");
    expect((undoBtn as HTMLButtonElement).disabled).toBe(false);

    // Undo views → selection → filter, verifying each rewind.
    act(() => {
      fireEvent.click(undoBtn);
    });
    expect(logFromInsideAView).toHaveLength(2);
    // After undoing the views change, the "other" view should be gone.
    expect(screen.queryByTestId("view-other")).toBeNull();
    expect(screen.getByTestId("view-probe")).toBeTruthy();

    act(() => {
      fireEvent.click(undoBtn);
    });
    expect(logFromInsideAView).toHaveLength(1);
    // Selection is back to null — the captured view receives it via props.
    expect(captured.props!.selectedDatumId).toBeNull();

    act(() => {
      fireEvent.click(undoBtn);
    });
    expect(logFromInsideAView).toHaveLength(0);
    // Filter is back to empty.
    expect(captured.props!.filterState).toEqual(EMPTY_FILTER_STATE);

    // Button now disabled.
    expect((screen.getByTestId("undo-button") as HTMLButtonElement).disabled).toBe(true);

    // onAction was only called for the original three actions; undo did not
    // emit anything.
    expect(actions).toHaveLength(3);

    // Clicking undo with an empty log is a no-op.
    act(() => {
      fireEvent.click(screen.getByTestId("undo-button"));
    });
    expect(actions).toHaveLength(3);
  });

  it("VIEW_ACTION: a tracked-state set is recorded and undo routes to the view's setter", () => {
    let setLocal!: (n: number) => void;
    let observed = -1;
    const Tracked: GraphView = {
      id: "tracked-probe",
      name: "tracked",
      minHeight: 100,
      Component: () => {
        const [v, set] = useTrackedState<number>(
          "tracked-probe",
          "count",
          0,
        );
        observed = v;
        setLocal = set;
        return <div data-testid="view-tracked-probe">{v}</div>;
      },
    };
    const actions: Action[] = [];
    render(
      <GraphSect
        graph={createMockGraph()}
        views={[FILTERS_VIEW, Tracked]}
        defaultActiveViewIds={["tracked-probe"]}
        onAction={(a) => actions.push(a)}
      />,
    );

    act(() => {
      setLocal(42);
    });
    expect(observed).toBe(42);
    expect(actions).toHaveLength(1);
    const recorded = actions[0];
    if (recorded.type !== "VIEW_ACTION") throw new Error("unreachable");
    expect(recorded.viewId).toBe("tracked-probe");
    expect(recorded.kind).toBe("count");
    expect(recorded.prev).toBe(0);
    expect(recorded.next).toBe(42);

    // Click Undo — value should rewind to 0, log empty.
    act(() => {
      fireEvent.click(screen.getByTestId("undo-button"));
    });
    expect(observed).toBe(0);
    expect((screen.getByTestId("undo-button") as HTMLButtonElement).disabled).toBe(true);
    // Undo did not emit a new action.
    expect(actions).toHaveLength(1);
  });

  it("Resize: dragging a stack handle records one VIEW_ACTION and undo reverts it", async () => {
    vi.useFakeTimers();
    try {
      const captured: Captured = { props: null };
      const probe = makeCapturingView("probe", captured);
      const second: GraphView = {
        id: "second",
        name: "second",
        minHeight: 100,
        Component: () => <div data-testid="view-second" />,
      };
      const actions: Action[] = [];
      const { container } = render(
        <GraphSect
          graph={createMockGraph()}
          views={[FILTERS_VIEW, probe, second]}
          defaultActiveViewIds={["probe", "second"]}
          onAction={(a) => actions.push(a)}
        />,
      );

      // Two resize handles exist (between filters/probe and probe/second).
      // Grab the second one and drag.
      const handles = container.querySelectorAll('[title="Drag to resize"]');
      expect(handles.length).toBeGreaterThan(0);
      const handle = handles[handles.length - 1] as HTMLElement;

      act(() => {
        fireEvent.mouseDown(handle, { clientY: 400 });
      });
      act(() => {
        fireEvent.mouseMove(window, { clientY: 450 });
        fireEvent.mouseMove(window, { clientY: 500 });
      });
      act(() => {
        fireEvent.mouseUp(window);
      });

      // No action yet — still in debounce window.
      expect(actions.filter((a) => a.type === "VIEW_ACTION")).toHaveLength(0);

      act(() => {
        vi.advanceTimersByTime(400);
      });

      const viewActions = actions.filter((a) => a.type === "VIEW_ACTION");
      expect(viewActions).toHaveLength(1);
      const action = viewActions[0];
      if (action.type !== "VIEW_ACTION") throw new Error("unreachable");
      expect(action.viewId).toBe("view-stack");
      expect(action.kind).toBe("heights");

      // Undo rewinds heights to the pre-drag baseline.
      act(() => {
        fireEvent.click(screen.getByTestId("undo-button"));
      });
      expect((screen.getByTestId("undo-button") as HTMLButtonElement).disabled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a fresh GraphSect has the Undo button disabled", () => {
    const captured: Captured = { props: null };
    const probe = makeCapturingView("probe", captured);
    render(
      <GraphSect
        graph={createMockGraph()}
        views={[FILTERS_VIEW, probe]}
        defaultActiveViewIds={["probe"]}
      />,
    );
    expect((screen.getByTestId("undo-button") as HTMLButtonElement).disabled).toBe(true);
  });
});
