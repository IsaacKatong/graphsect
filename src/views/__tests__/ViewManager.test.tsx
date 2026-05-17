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
      />,
    );
    screen.getByTestId("trigger-a").click();
    expect(onFilterStateChange).toHaveBeenCalledWith({
      ...EMPTY_FILTER_STATE,
      datumType: { selectedTypes: ["CODE"] },
    });
  });
});
