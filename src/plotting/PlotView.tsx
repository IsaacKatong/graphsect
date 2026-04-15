import { useMemo } from "react";
import Plot from "react-plotly.js";
import { ExternalGraph } from "../external-graph/types";

type PlotViewProps = {
  graph: ExternalGraph;
  dimensions: string[];
  showEdges?: boolean;
};

type DatumPlotData = {
  datumId: string;
  name: string;
  values: Record<string, number>;
};

function extractPlotData(
  graph: ExternalGraph,
  dimensions: string[],
): DatumPlotData[] {
  const dimsByDatum = new Map<string, Record<string, number>>();
  for (const dim of graph.datumDimensions) {
    if (!dimensions.includes(dim.name)) continue;
    let record = dimsByDatum.get(dim.datumID);
    if (!record) {
      record = {};
      dimsByDatum.set(dim.datumID, record);
    }
    record[dim.name] = dim.value;
  }

  const result: DatumPlotData[] = [];
  for (const datum of graph.datums) {
    const values = dimsByDatum.get(datum.id);
    if (!values) continue;
    const hasAtLeastOne = dimensions.some((d) => d in values);
    if (!hasAtLeastOne) continue;
    result.push({
      datumId: datum.id,
      name: datum.name,
      values: Object.fromEntries(
        dimensions.map((d) => [d, values[d] ?? 0]),
      ),
    });
  }
  return result;
}

type EdgePlotData = {
  fromId: string;
  toId: string;
};

function extractEdges(
  graph: ExternalGraph,
  datumIds: Set<string>,
): EdgePlotData[] {
  return graph.edges
    .filter((e) => datumIds.has(e.fromDatumID) && datumIds.has(e.toDatumID))
    .map((e) => ({ fromId: e.fromDatumID, toId: e.toDatumID }));
}

function buildEdgeTraces2D(
  data: DatumPlotData[],
  edges: EdgePlotData[],
  xDim: string,
  yDim: string,
): Plotly.Data[] {
  const byId = new Map(data.map((d) => [d.datumId, d]));
  const x: (number | null)[] = [];
  const y: (number | null)[] = [];
  for (const edge of edges) {
    const from = byId.get(edge.fromId);
    const to = byId.get(edge.toId);
    if (!from || !to) continue;
    x.push(from.values[xDim], to.values[xDim], null);
    y.push(from.values[yDim], to.values[yDim], null);
  }
  return [{
    x, y,
    type: "scatter" as const,
    mode: "lines" as const,
    line: { color: "#94a3b8", width: 1 },
    opacity: 0.4,
    hoverinfo: "skip" as const,
    showlegend: false,
  }];
}

function buildEdgeTraces3D(
  data: DatumPlotData[],
  edges: EdgePlotData[],
  xDim: string,
  yDim: string,
  zDim: string,
): Plotly.Data[] {
  const byId = new Map(data.map((d) => [d.datumId, d]));
  const x: (number | null)[] = [];
  const y: (number | null)[] = [];
  const z: (number | null)[] = [];
  for (const edge of edges) {
    const from = byId.get(edge.fromId);
    const to = byId.get(edge.toId);
    if (!from || !to) continue;
    x.push(from.values[xDim], to.values[xDim], null);
    y.push(from.values[yDim], to.values[yDim], null);
    z.push(from.values[zDim], to.values[zDim], null);
  }
  return [{
    x, y, z,
    type: "scatter3d" as const,
    mode: "lines" as const,
    line: { color: "#94a3b8", width: 2 },
    opacity: 0.4,
    hoverinfo: "skip" as const,
    showlegend: false,
  }];
}

export default function PlotView({ graph, dimensions, showEdges }: PlotViewProps) {
  const plotData = useMemo(
    () => extractPlotData(graph, dimensions),
    [graph, dimensions],
  );

  const edges = useMemo(() => {
    if (!showEdges) return [];
    const datumIds = new Set(plotData.map((d) => d.datumId));
    return extractEdges(graph, datumIds);
  }, [graph, plotData, showEdges]);

  const count = dimensions.length;

  if (count === 1) {
    return <Plot1D data={plotData} edges={edges} dimension={dimensions[0]} />;
  }
  if (count === 2) {
    return (
      <Plot2D data={plotData} edges={edges} xDim={dimensions[0]} yDim={dimensions[1]} />
    );
  }
  return (
    <Plot3D
      data={plotData}
      edges={edges}
      xDim={dimensions[0]}
      yDim={dimensions[1]}
      zDim={dimensions[2]}
    />
  );
}

function Plot1D({
  data,
  edges,
  dimension,
}: {
  data: DatumPlotData[];
  edges: EdgePlotData[];
  dimension: string;
}) {
  const edgeTraces = useMemo(() => {
    if (edges.length === 0) return [];
    const byId = new Map(data.map((d) => [d.datumId, d]));
    const x: (number | null)[] = [];
    const y: (string | null)[] = [];
    for (const edge of edges) {
      const from = byId.get(edge.fromId);
      const to = byId.get(edge.toId);
      if (!from || !to) continue;
      x.push(from.values[dimension], to.values[dimension], null);
      y.push(from.name, to.name, null);
    }
    return [{
      x, y,
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#94a3b8", width: 1 },
      opacity: 0.4,
      hoverinfo: "skip" as const,
      showlegend: false,
    }];
  }, [data, edges, dimension]);

  return (
    <Plot
      data={[
        ...edgeTraces,
        {
          x: data.map((d) => d.values[dimension]),
          y: data.map((d) => d.name),
          text: data.map((d) => d.name),
          type: "scatter",
          mode: "markers" as const,
          marker: { color: "#6366f1", size: 12 },
          hoverinfo: "x+text" as const,
        },
      ]}
      layout={{
        ...baseLayout,
        xaxis: { ...axisStyle, title: { text: dimension, font: { color: "#94a3b8" } } },
        yaxis: { ...axisStyle, title: { text: "Datum", font: { color: "#94a3b8" } } },
      }}
      config={plotConfig}
      style={plotStyle}
      useResizeHandler
    />
  );
}

function Plot2D({
  data,
  edges,
  xDim,
  yDim,
}: {
  data: DatumPlotData[];
  edges: EdgePlotData[];
  xDim: string;
  yDim: string;
}) {
  const edgeTraces = useMemo(
    () => edges.length > 0 ? buildEdgeTraces2D(data, edges, xDim, yDim) : [],
    [data, edges, xDim, yDim],
  );

  return (
    <Plot
      data={[
        ...edgeTraces,
        {
          x: data.map((d) => d.values[xDim]),
          y: data.map((d) => d.values[yDim]),
          text: data.map((d) => d.name),
          type: "scatter",
          mode: "text+markers" as const,
          textposition: "top center" as const,
          textfont: { color: "#e2e8f0", size: 11 },
          marker: { color: "#6366f1", size: 12 },
          hoverinfo: "x+y+text" as const,
        },
      ]}
      layout={{
        ...baseLayout,
        xaxis: { ...axisStyle, title: { text: xDim, font: { color: "#94a3b8" } } },
        yaxis: { ...axisStyle, title: { text: yDim, font: { color: "#94a3b8" } } },
      }}
      config={plotConfig}
      style={plotStyle}
      useResizeHandler
    />
  );
}

function Plot3D({
  data,
  edges,
  xDim,
  yDim,
  zDim,
}: {
  data: DatumPlotData[];
  edges: EdgePlotData[];
  xDim: string;
  yDim: string;
  zDim: string;
}) {
  const edgeTraces = useMemo(
    () => edges.length > 0 ? buildEdgeTraces3D(data, edges, xDim, yDim, zDim) : [],
    [data, edges, xDim, yDim, zDim],
  );

  return (
    <Plot
      data={[
        ...edgeTraces,
        {
          x: data.map((d) => d.values[xDim]),
          y: data.map((d) => d.values[yDim]),
          z: data.map((d) => d.values[zDim]),
          text: data.map((d) => d.name),
          type: "scatter3d",
          mode: "text+markers" as const,
          textposition: "top center" as const,
          textfont: { color: "#e2e8f0", size: 11 },
          marker: { color: "#6366f1", size: 6 },
          hoverinfo: "x+y+z+text" as const,
        },
      ]}
      layout={{
        ...baseLayout,
        scene: {
          xaxis: { ...sceneAxisStyle, title: { text: xDim, font: { color: "#94a3b8" } } },
          yaxis: { ...sceneAxisStyle, title: { text: yDim, font: { color: "#94a3b8" } } },
          zaxis: { ...sceneAxisStyle, title: { text: zDim, font: { color: "#94a3b8" } } },
          bgcolor: "#0f172a",
        },
      }}
      config={plotConfig}
      style={plotStyle}
      useResizeHandler
    />
  );
}

const baseLayout: Partial<Plotly.Layout> = {
  paper_bgcolor: "#0f172a",
  plot_bgcolor: "#0f172a",
  font: { color: "#e2e8f0", family: "system-ui, sans-serif" },
  margin: { l: 60, r: 30, t: 30, b: 60 },
  autosize: true,
  showlegend: false,
};

const axisStyle = {
  color: "#94a3b8",
  showgrid: false,
  zeroline: false,
};

const sceneAxisStyle = {
  color: "#94a3b8",
  showgrid: false,
  backgroundcolor: "#0f172a",
};

const plotConfig: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

const plotStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
};
