import { GraphView } from "./types";
import FiltersView from "./views/FiltersView";
import TagMeshView from "./views/TagMeshView";
import PlotGraphView from "./views/PlotGraphView";

export const FILTERS_VIEW: GraphView = {
  id: "filters",
  name: "Filters",
  minHeight: 90,
  Component: FiltersView,
};

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

export const BUILTIN_VIEWS: GraphView[] = [
  FILTERS_VIEW,
  TAG_MESH_VIEW,
  PLOT_VIEW,
];
