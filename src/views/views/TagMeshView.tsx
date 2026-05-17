import { useMemo, useState } from "react";
import TagMesh2DView from "../../tag-mesh/TagMesh2DView";
import TagMeshControls from "../../tag-mesh/TagMeshControls";
import { transformGraph } from "../../external-graph/transformGraph";
import { TagMeshParams } from "../../tag-mesh/buildTagMeshLayout";
import { computeTagScores } from "../../carousels/scoreTag";
import { GraphViewProps } from "../types";

const DEFAULT_PARAMS: TagMeshParams = {
  mainNeighbors: 6,
  subNeighbors: 12,
  sizeScale: 10,
  distance: 40,
  hierarchyDistance: 100,
};

export default function TagMeshView({ graph }: GraphViewProps) {
  const [params, setParams] = useState<TagMeshParams>(DEFAULT_PARAMS);
  const data = useMemo(() => transformGraph(graph), [graph]);
  const scores = useMemo(() => computeTagScores(graph), [graph]);

  return (
    <div style={containerStyle}>
      <TagMesh2DView data={data} params={params} scores={scores} />
      <TagMeshControls params={params} onChange={setParams} />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  backgroundColor: "#0f172a",
};
