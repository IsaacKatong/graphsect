/// <reference types="vite/client" />

declare module "plotly.js-dist-min" {
  const Plotly: unknown;
  export default Plotly;
}

declare module "react-plotly.js/factory" {
  import type { Component } from "react";
  type PlotParams = import("react-plotly.js").PlotParams;
  export default function createPlotlyComponent(
    plotly: unknown,
  ): new (props: PlotParams) => Component<PlotParams>;
}
