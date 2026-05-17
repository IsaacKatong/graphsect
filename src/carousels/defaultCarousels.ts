import { ExternalGraph } from "../external-graph/types";
import { computeTagScores } from "./scoreTag";
import { Carousel, CarouselDatumTagSelection } from "./types";

export const mostConnectedSelection: CarouselDatumTagSelection = (
  graph: ExternalGraph,
) => {
  const scores = computeTagScores(graph);
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
};

export const MOST_CONNECTED_CAROUSEL: Carousel = {
  name: "Most Connected",
  selection: mostConnectedSelection,
};

export const DEFAULT_CAROUSELS: Carousel[] = [MOST_CONNECTED_CAROUSEL];
