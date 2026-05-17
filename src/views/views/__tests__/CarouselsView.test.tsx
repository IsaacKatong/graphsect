import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CarouselsView from "../CarouselsView";
import { createCarouselTestGraph } from "../../../carousels/__fixtures__/mockCarouselGraph";
import { mostConnectedSelection } from "../../../carousels/defaultCarousels";
import { EMPTY_FILTER_STATE } from "../../../filtering/types";
import { Carousel } from "../../../carousels/types";

describe("CarouselsView", () => {
  const sourceGraph = createCarouselTestGraph();
  const mostConnected: Carousel = {
    name: "Most Connected",
    selection: mostConnectedSelection,
  };

  it("renders one section per carousel with the right tags in order", () => {
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        carousels={[mostConnected]}
      />,
    );
    expect(screen.getByText("Most Connected")).toBeTruthy();
    const tagButtons = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("title"));
    expect(tagButtons).toEqual(["tag-a", "tag-b", "tag-c"]);
  });

  it("rewrites filterState.datumTags to a single-element list when a tag is clicked", () => {
    const onFilterStateChange = vi.fn();
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={onFilterStateChange}
        carousels={[mostConnected]}
      />,
    );
    fireEvent.click(screen.getByTitle("tag-b"));
    expect(onFilterStateChange).toHaveBeenCalledWith({
      ...EMPTY_FILTER_STATE,
      datumTags: { selectedTags: ["tag-b"] },
    });
  });

  it("replaces an existing datumTags selection rather than appending", () => {
    const onFilterStateChange = vi.fn();
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={{
          ...EMPTY_FILTER_STATE,
          datumTags: { selectedTags: ["tag-a"] },
        }}
        onFilterStateChange={onFilterStateChange}
        carousels={[mostConnected]}
      />,
    );
    fireEvent.click(screen.getByTitle("tag-c"));
    expect(onFilterStateChange).toHaveBeenCalledWith({
      ...EMPTY_FILTER_STATE,
      datumTags: { selectedTags: ["tag-c"] },
    });
  });

  it("renders multiple carousel sections in the supplied order", () => {
    const custom: Carousel = {
      name: "Reverse alpha",
      selection: () => ["zeta", "alpha"],
    };
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        carousels={[custom, mostConnected]}
      />,
    );
    const headings = screen
      .getAllByRole("heading")
      .map((h) => h.textContent);
    expect(headings).toEqual(["Reverse alpha", "Most Connected"]);
  });

  it("falls back to an empty state when a carousel produces no tags", () => {
    const blank: Carousel = { name: "Blank", selection: () => [] };
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        carousels={[blank]}
      />,
    );
    expect(screen.getByText(/no tags/i)).toBeTruthy();
  });
});
