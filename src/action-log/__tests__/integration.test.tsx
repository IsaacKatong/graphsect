import { beforeAll, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import GraphSect from "../../App";
import { createMockGraph } from "../../external-graph/__fixtures__/mockGraph";
import { GraphView, GraphViewProps } from "../../views/types";
import { FILTERS_VIEW } from "../../views/builtinViews";
import { useViewSelector } from "../../views/ViewSelectorContext";
import { EMPTY_FILTER_STATE, FilterState } from "../../filtering/types";
import { useActionLogSnapshot } from "../ActionLogContext";
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
