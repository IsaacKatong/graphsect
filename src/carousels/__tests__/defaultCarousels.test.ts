import { describe, expect, it } from "vitest";
import { MOST_CONNECTED_CAROUSEL, mostConnectedSelection } from "../defaultCarousels";
import { createCarouselTestGraph } from "../__fixtures__/mockCarouselGraph";

describe("mostConnectedSelection", () => {
  it("sorts tags by score descending, breaking ties alphabetically", () => {
    // Expected scores (see fixture comment): a=6, b=3, c=3 → a, b, c
    expect(mostConnectedSelection(createCarouselTestGraph())).toEqual([
      "tag-a",
      "tag-b",
      "tag-c",
    ]);
  });

  it("is exposed via MOST_CONNECTED_CAROUSEL.selection", () => {
    expect(MOST_CONNECTED_CAROUSEL.name).toBe("Most Connected");
    expect(MOST_CONNECTED_CAROUSEL.selection).toBe(mostConnectedSelection);
  });
});
