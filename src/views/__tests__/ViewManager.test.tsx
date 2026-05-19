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
  it("renders one entry per active instance, in active-list order", () => {
    const views = [createMockView("a"), createMockView("b"), createMockView("c")];
    const graph = createMockGraph();
    // Two instances of "a" plus one of "c", in the order the user added them.
    render(
      <ViewManager
        views={views}
        activeViews={[
          { id: "a-1", typeId: "a" },
          { id: "c-1", typeId: "c" },
          { id: "a-2", typeId: "a" },
        ]}
        sourceGraph={graph}
        filteredGraph={graph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId={null}
        onSelectedDatumIdChange={() => {}}
      />,
    );

    const rendered = screen.queryAllByTestId(/^view-instance-/);
    expect(rendered.map((el) => el.getAttribute("data-testid"))).toEqual([
      "view-instance-a-1",
      "view-instance-c-1",
      "view-instance-a-2",
    ]);
  });

  it("renders an empty-state message when no views are active", () => {
    const views = [createMockView("a")];
    const graph = createMockGraph();
    render(
      <ViewManager
        views={views}
        activeViews={[]}
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

  it("passes the filtered graph to each active instance", () => {
    const views = [createMockView("a")];
    const sourceGraph = createMockGraph();
    const filteredGraph = { ...sourceGraph, datums: sourceGraph.datums.slice(0, 1) };
    render(
      <ViewManager
        views={views}
        activeViews={[{ id: "a-1", typeId: "a" }]}
        sourceGraph={sourceGraph}
        filteredGraph={filteredGraph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId={null}
        onSelectedDatumIdChange={() => {}}
      />,
    );
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
        activeViews={[{ id: "a-1", typeId: "a" }]}
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

  it("threads the global selection state through to every instance", () => {
    const onSelectedDatumIdChange = vi.fn();
    const views = [
      createMockView("a", {
        Component: ({ selectedDatumId, onSelectedDatumIdChange, instanceId }) => (
          <div data-testid={`view-${instanceId}`}>
            <span data-testid={`sel-${instanceId}`}>
              {selectedDatumId ?? "none"}
            </span>
            <button
              data-testid={`pick-${instanceId}`}
              onClick={() => onSelectedDatumIdChange("from-" + instanceId)}
            >
              pick
            </button>
          </div>
        ),
      }),
    ];
    const graph = createMockGraph();
    render(
      <ViewManager
        views={views}
        activeViews={[
          { id: "a-1", typeId: "a" },
          { id: "a-2", typeId: "a" },
        ]}
        sourceGraph={graph}
        filteredGraph={graph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId="seed"
        onSelectedDatumIdChange={onSelectedDatumIdChange}
      />,
    );

    // Both instances observe the same shared selection.
    expect(screen.getByTestId("sel-a-1").textContent).toBe("seed");
    expect(screen.getByTestId("sel-a-2").textContent).toBe("seed");

    // The clicker reports its own instance id, demonstrating instances are
    // distinct components even when they share a view type.
    screen.getByTestId("pick-a-2").click();
    expect(onSelectedDatumIdChange).toHaveBeenCalledWith("from-a-2");
  });
});
