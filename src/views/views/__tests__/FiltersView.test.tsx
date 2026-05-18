import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FiltersView from "../FiltersView";
import { createFilterTestGraph } from "../../../filtering/__fixtures__/mockFilters";
import { EMPTY_FILTER_STATE } from "../../../filtering/types";

describe("FiltersView dropdown narrowing", () => {
  it("enumerates dropdown options from the post-filter graph, not the source", () => {
    // After a filter has run upstream, the post-filter `graph` no longer
    // contains datums of every original type. The Datum Type dropdown should
    // mirror that narrower set, regardless of what's in `sourceGraph`.
    const sourceGraph = createFilterTestGraph();
    const filtered = {
      ...sourceGraph,
      datums: sourceGraph.datums.filter((d) => d.type === "MARKDOWN"),
      datumTags: sourceGraph.datumTags.filter((t) =>
        sourceGraph.datums
          .filter((d) => d.type === "MARKDOWN")
          .some((d) => d.id === t.datumID),
      ),
    };

    render(
      <FiltersView
        sourceGraph={sourceGraph}
        graph={filtered}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId={null}
        onSelectedDatumIdChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Datum Type"));
    const labels = screen
      .getAllByRole("checkbox")
      .map((cb) => cb.parentElement?.textContent?.trim());
    // sourceGraph has MARKDOWN, CODE, IMAGE; the filtered graph has only
    // MARKDOWN — so the dropdown should narrow accordingly.
    expect(labels).toContain("MARKDOWN");
    expect(labels).not.toContain("CODE");
    expect(labels).not.toContain("IMAGE");
  });

  it("recovers the full option set when the post-filter graph widens", () => {
    // Same test render but with `graph === sourceGraph` (no filters active);
    // every original type should be back in the dropdown.
    const sourceGraph = createFilterTestGraph();
    render(
      <FiltersView
        sourceGraph={sourceGraph}
        graph={sourceGraph}
        filterState={EMPTY_FILTER_STATE}
        onFilterStateChange={() => {}}
        selectedDatumId={null}
        onSelectedDatumIdChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Datum Type"));
    const labels = screen
      .getAllByRole("checkbox")
      .map((cb) => cb.parentElement?.textContent?.trim());
    expect(labels).toEqual(
      expect.arrayContaining(["MARKDOWN", "CODE", "IMAGE"]),
    );
  });
});
