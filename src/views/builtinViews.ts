import { GraphView } from "./types";
import TagMeshView from "./views/TagMeshView";
import PlotGraphView from "./views/PlotGraphView";
import { createCarouselsView } from "./views/CarouselsView";
import DatumListView from "./views/DatumListView";

export const TAG_MESH_VIEW: GraphView = {
  id: "tag-mesh",
  name: "Tag Mesh",
  minHeight: 240,
  Component: TagMeshView,
};

export const PLOT_VIEW: GraphView = {
  id: "plot",
  name: "Plot",
  minHeight: 240,
  Component: PlotGraphView,
};

export const CAROUSELS_VIEW: GraphView = createCarouselsView();

export const DATUM_LIST_VIEW: GraphView = {
  id: "datum-list",
  name: "Datum List",
  minHeight: 200,
  Component: DatumListView,
};

export const BUILTIN_VIEWS: GraphView[] = [
  TAG_MESH_VIEW,
  PLOT_VIEW,
  CAROUSELS_VIEW,
  DATUM_LIST_VIEW,
];
