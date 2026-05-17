import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ViewManager from "../ViewManager";
import { createMockView } from "../__fixtures__/mockViews";
import { createMockGraph } from "../../external-graph/__fixtures__/mockGraph";
import { EMPTY_FILTER_STATE } from "../../filtering/types";

beforeAll(() => {
  // jsdom doesn't ship ResizeObserver; ResizableViewStack uses it to react
  // to container resizes. A no-op stub is enough for these tests.
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

describe("ViewManager", () => {
  it("renders only the active views, in registry order", () => {
    const views = [createMockView("a"), createMockView("b"), createMockView("c")];
    const graph = createMockGraph();
    // Active list passed out-of-order; manager should still render in registry order.
    render(
      <ViewManager
        views={views}
        activeIds={["c", "a"]}
        sourceGraph={graph}
        filteredGraph={graph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId={null}
        onSelectedDatumIdChange={() => {}}
      />,
    );

    const rendered = screen.queryAllByTestId(/^view-/);
    expect(rendered.map((el) => el.getAttribute("data-testid"))).toEqual([
      "view-a",
      "view-c",
    ]);
  });

  it("renders an empty-state message when no views are active", () => {
    const views = [createMockView("a")];
    const graph = createMockGraph();
    render(
      <ViewManager
        views={views}
        activeIds={[]}
        sourceGraph={graph}
        filteredGraph={graph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId={null}
        onSelectedDatumIdChange={() => {}}
      />,
    );
    expect(screen.getByText(/no views selected/i)).toBeTruthy();
  });

  it("passes the filtered graph to each active view", () => {
    const views = [createMockView("a")];
    const sourceGraph = createMockGraph();
    const filteredGraph = { ...sourceGraph, datums: sourceGraph.datums.slice(0, 1) };
    render(
      <ViewManager
        views={views}
        activeIds={["a"]}
        sourceGraph={sourceGraph}
        filteredGraph={filteredGraph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId={null}
        onSelectedDatumIdChange={() => {}}
      />,
    );
    // mockView prints `datums:<count>` from the `graph` prop (filtered graph).
    expect(screen.getByTestId("view-a").textContent).toContain("datums:1");
  });

  it("forwards filter state mutations from views", () => {
    const onFilterStateChange = vi.fn();
    const views = [
      createMockView("a", {
        Component: ({ onFilterStateChange }) => (
          <button
            data-testid="trigger-a"
            onClick={() =>
              onFilterStateChange({
                ...EMPTY_FILTER_STATE,
                datumType: { selectedTypes: ["CODE"] },
              })
            }
          >
            update
          </button>
        ),
      }),
    ];
    const graph = createMockGraph();
    render(
      <ViewManager
        views={views}
        activeIds={["a"]}
        sourceGraph={graph}
        filteredGraph={graph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={onFilterStateChange}
        selectedDatumId={null}
        onSelectedDatumIdChange={() => {}}
      />,
    );
    screen.getByTestId("trigger-a").click();
    expect(onFilterStateChange).toHaveBeenCalledWith({
      ...EMPTY_FILTER_STATE,
      datumType: { selectedTypes: ["CODE"] },
    });
  });

  it("threads the global selection state through to every view", () => {
    // Two views both look at the same selectedDatumId and call the same
    // setter. That's how the App-level NodeDetailPanel ends up with one
    // detail panel shared across all views.
    const onSelectedDatumIdChange = vi.fn();
    const views = [
      createMockView("a", {
        Component: ({ selectedDatumId, onSelectedDatumIdChange }) => (
          <div data-testid="view-a">
            <span data-testid="sel-a">{selectedDatumId ?? "none"}</span>
            <button
              data-testid="pick-a"
              onClick={() => onSelectedDatumIdChange("from-view-a")}
            >
              pick
            </button>
          </div>
        ),
      }),
      createMockView("b", {
        Component: ({ selectedDatumId }) => (
          <span data-testid="sel-b">{selectedDatumId ?? "none"}</span>
        ),
      }),
    ];
    const graph = createMockGraph();
    render(
      <ViewManager
        views={views}
        activeIds={["a", "b"]}
        sourceGraph={graph}
        filteredGraph={graph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId="seed"
        onSelectedDatumIdChange={onSelectedDatumIdChange}
      />,
    );

    // Both views observe the same selection prop.
    expect(screen.getByTestId("sel-a").textContent).toBe("seed");
    expect(screen.getByTestId("sel-b").textContent).toBe("seed");

    // A click in view A bubbles the new id back through the manager.
    screen.getByTestId("pick-a").click();
    expect(onSelectedDatumIdChange).toHaveBeenCalledWith("from-view-a");
  });
});
