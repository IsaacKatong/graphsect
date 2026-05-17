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

  it("adds the clicked tag to datumTags when no filter is set yet", () => {
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

  it("appends to an existing datumTags selection rather than replacing it", () => {
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
      datumTags: { selectedTags: ["tag-a", "tag-c"] },
    });
  });

  it("removes a tag from the selection when it is clicked again", () => {
    const onFilterStateChange = vi.fn();
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={{
          ...EMPTY_FILTER_STATE,
          datumTags: { selectedTags: ["tag-a", "tag-c"] },
        }}
        onFilterStateChange={onFilterStateChange}
        carousels={[mostConnected]}
      />,
    );
    fireEvent.click(screen.getByTitle("tag-a"));
    expect(onFilterStateChange).toHaveBeenCalledWith({
      ...EMPTY_FILTER_STATE,
      datumTags: { selectedTags: ["tag-c"] },
    });
  });

  it("clears datumTags when removing the last selected tag", () => {
    const onFilterStateChange = vi.fn();
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={{
          ...EMPTY_FILTER_STATE,
          datumTags: { selectedTags: ["tag-b"] },
        }}
        onFilterStateChange={onFilterStateChange}
        carousels={[mostConnected]}
      />,
    );
    fireEvent.click(screen.getByTitle("tag-b"));
    expect(onFilterStateChange).toHaveBeenCalledWith({
      ...EMPTY_FILTER_STATE,
      datumTags: null,
    });
  });

  it("highlights every tag present in filterState.datumTags (set elsewhere too)", () => {
    // The carousel highlight is driven entirely by filterState.datumTags, so
    // a tag picked in the Filters bar (or programmatically) is reflected
    // here without any extra wiring.
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={{
          ...EMPTY_FILTER_STATE,
          datumTags: { selectedTags: ["tag-a", "tag-c"] },
        }}
        onFilterStateChange={() => {}}
        carousels={[mostConnected]}
      />,
    );
    const highlighted = (title: string) =>
      getComputedStyle(screen.getByTitle(title)).backgroundColor;
    // tag-a and tag-c selected → highlighted; tag-b not selected → plain.
    expect(highlighted("tag-a")).not.toEqual(highlighted("tag-b"));
    expect(highlighted("tag-c")).not.toEqual(highlighted("tag-b"));
    expect(highlighted("tag-a")).toEqual(highlighted("tag-c"));
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

  it("runs each Carousel.selection against the filtered graph, not the source", () => {
    // The Carousels view should call selection() with the post-filter graph
    // that the ViewManager passes in as `graph`, so re-filtering re-renders
    // the sections with whatever tags remain.
    const seenGraphs: number[] = [];
    const probe: Carousel = {
      name: "Probe",
      selection: (g) => {
        seenGraphs.push(g.datums.length);
        return g.datums.flatMap((d) =>
          g.datumTags.filter((t) => t.datumID === d.id).map((t) => t.name),
        );
      },
    };
    const filtered = {
      ...sourceGraph,
      datums: sourceGraph.datums.slice(0, 1),
      datumTags: sourceGraph.datumTags.filter((t) => t.datumID === "datum-1"),
    };
    render(
      <CarouselsView
        sourceGraph={sourceGraph}
        graph={filtered}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        carousels={[probe]}
      />,
    );
    // The probe should have seen the filtered (1-datum) graph, not the source.
    expect(seenGraphs).toContain(1);
    expect(seenGraphs).not.toContain(sourceGraph.datums.length);
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
