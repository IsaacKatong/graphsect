import { useMemo } from "react";
import Plot from "react-plotly.js";
import { ExternalGraph } from "../external-graph/types";

type PlotViewProps = {
  graph: ExternalGraph;
  dimensions: string[];
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

export default function PlotView({ graph, dimensions }: PlotViewProps) {
  const plotData = useMemo(
    () => extractPlotData(graph, dimensions),
    [graph, dimensions],
  );

  const count = dimensions.length;

  if (count === 1) {
    return <Plot1D data={plotData} dimension={dimensions[0]} />;
  }
  if (count === 2) {
    return (
      <Plot2D data={plotData} xDim={dimensions[0]} yDim={dimensions[1]} />
    );
  }
  return (
    <Plot3D
      data={plotData}
      xDim={dimensions[0]}
      yDim={dimensions[1]}
      zDim={dimensions[2]}
    />
  );
}

function Plot1D({
  data,
  dimension,
}: {
  data: DatumPlotData[];
  dimension: string;
}) {
  return (
    <Plot
      data={[
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
  xDim,
  yDim,
}: {
  data: DatumPlotData[];
  xDim: string;
  yDim: string;
}) {
  return (
    <Plot
      data={[
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
  xDim,
  yDim,
  zDim,
}: {
  data: DatumPlotData[];
  xDim: string;
  yDim: string;
  zDim: string;
}) {
  return (
    <Plot
      data={[
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
};

const axisStyle = {
  color: "#94a3b8",
  gridcolor: "#334155",
  zerolinecolor: "#475569",
};

const sceneAxisStyle = {
  color: "#94a3b8",
  gridcolor: "#334155",
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
