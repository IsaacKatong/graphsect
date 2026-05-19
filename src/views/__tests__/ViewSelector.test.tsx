import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddViewMenu from "../ViewSelector";
import { createMockView } from "../__fixtures__/mockViews";

describe("AddViewMenu", () => {
  it("renders an Add view button", () => {
    render(<AddViewMenu addableTypes={[]} onAdd={() => {}} />);
    expect(screen.getByTestId("add-view-button")).toBeTruthy();
  });

  it("opens a dropdown listing every addable view type", () => {
    const onAdd = vi.fn();
    const types = [createMockView("a"), createMockView("b")];
    render(<AddViewMenu addableTypes={types} onAdd={onAdd} />);
    fireEvent.click(screen.getByTestId("add-view-button"));
    expect(screen.getByTestId("add-view-a")).toBeTruthy();
    expect(screen.getByTestId("add-view-b")).toBeTruthy();
  });

  it("clicking an option calls onAdd with the type id", () => {
    const onAdd = vi.fn();
    const types = [createMockView("a"), createMockView("b")];
    render(<AddViewMenu addableTypes={types} onAdd={onAdd} />);
    fireEvent.click(screen.getByTestId("add-view-button"));
    fireEvent.click(screen.getByTestId("add-view-b"));
    expect(onAdd).toHaveBeenCalledWith("b");
  });

  it("the same type can be added multiple times — each click emits a fresh onAdd", () => {
    const onAdd = vi.fn();
    const types = [createMockView("a")];
    render(<AddViewMenu addableTypes={types} onAdd={onAdd} />);
    fireEvent.click(screen.getByTestId("add-view-button"));
    fireEvent.click(screen.getByTestId("add-view-a"));
    fireEvent.click(screen.getByTestId("add-view-button"));
    fireEvent.click(screen.getByTestId("add-view-a"));
    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd).toHaveBeenNthCalledWith(1, "a");
    expect(onAdd).toHaveBeenNthCalledWith(2, "a");
  });

  it("shows an empty-state message when nothing is addable", () => {
    render(<AddViewMenu addableTypes={[]} onAdd={() => {}} />);
    fireEvent.click(screen.getByTestId("add-view-button"));
    expect(screen.getByText(/no view types available/i)).toBeTruthy();
  });
});
