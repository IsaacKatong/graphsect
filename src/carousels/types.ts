import { ExternalGraph } from "../external-graph/types";

export type CarouselDatumTagSelection = (graph: ExternalGraph) => string[];

export type Carousel = {
  name: string;
  selection: CarouselDatumTagSelection;
};
