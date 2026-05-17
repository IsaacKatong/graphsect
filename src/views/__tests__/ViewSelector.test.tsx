import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ViewSelector from "../ViewSelector";
import { createMockView } from "../__fixtures__/mockViews";

describe("ViewSelector", () => {
  it("renders the active count badge", () => {
    const views = [createMockView("a"), createMockView("b")];
    render(
      <ViewSelector views={views} activeIds={["a"]} onActiveIdsChange={() => {}} />,
    );
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("toggles a view on and emits a new active list", () => {
    const onChange = vi.fn();
    const views = [createMockView("a"), createMockView("b")];
    render(
      <ViewSelector views={views} activeIds={["a"]} onActiveIdsChange={onChange} />,
    );
    fireEvent.click(screen.getByText("Views"));
    fireEvent.click(screen.getByLabelText("b"));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("toggles a view off and emits the remaining ids", () => {
    const onChange = vi.fn();
    const views = [createMockView("a"), createMockView("b")];
    render(
      <ViewSelector
        views={views}
        activeIds={["a", "b"]}
        onActiveIdsChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Views"));
    fireEvent.click(screen.getByLabelText("a"));
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("preserves registry order regardless of selection order", () => {
    // The user has 'b' active; toggling 'a' on should yield ['a', 'b'] because
    // 'a' precedes 'b' in the views array, not ['b', 'a'].
    const onChange = vi.fn();
    const views = [createMockView("a"), createMockView("b"), createMockView("c")];
    render(
      <ViewSelector
        views={views}
        activeIds={["b"]}
        onActiveIdsChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Views"));
    fireEvent.click(screen.getByLabelText("a"));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });
});
