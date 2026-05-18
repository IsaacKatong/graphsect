import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterButton from "../FilterButton";

describe("FilterButton dropdown contents", () => {
  it("always lists the currently-selected option, even if it is no longer in `options`", () => {
    // Regression: another filter narrowed the post-filter graph so the
    // available option set is empty, but the user still has one option
    // selected. The dropdown used to be gated on `options.length > 0`,
    // which left an active selection with no way to uncheck it.
    render(
      <FilterButton
        label="Edges"
        options={[]}
        selected={["A->B"]}
        onSelectionChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText(/Edges/));
    const cb = screen.getByLabelText("A->B") as HTMLInputElement;
    expect(cb).toBeTruthy();
    expect(cb.checked).toBe(true);
  });

  it("appends selected items that aren't in options to the end of the list", () => {
    render(
      <FilterButton
        label="Edges"
        options={["A->B", "B->C"]}
        selected={["X->Y"]}
        onSelectionChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText(/Edges/));
    const labels = screen.getAllByRole("checkbox").map((cb) => cb.parentElement?.textContent?.trim());
    expect(labels).toEqual(["A->B", "B->C", "X->Y"]);
  });

  it("uncheck on a ghost selection clears it from the parent", () => {
    const onSelectionChange = vi.fn();
    render(
      <FilterButton
        label="Edges"
        options={[]}
        selected={["A->B"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(screen.getByText(/Edges/));
    fireEvent.click(screen.getByLabelText("A->B"));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it("does not show the dropdown when there are no options and no selection", () => {
    render(
      <FilterButton
        label="Edges"
        options={[]}
        selected={[]}
        onSelectionChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText(/Edges/));
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
});
