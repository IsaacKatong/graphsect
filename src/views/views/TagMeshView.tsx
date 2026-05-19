import { useMemo } from "react";
import TagMesh2DView from "../../tag-mesh/TagMesh2DView";
import TagMeshControls from "../../tag-mesh/TagMeshControls";
import { transformGraph } from "../../external-graph/transformGraph";
import { TagMeshParams } from "../../tag-mesh/buildTagMeshLayout";
import { computeTagScores } from "../../carousels/scoreTag";
import { GraphViewProps } from "../types";
import { useTrackedState } from "../../action-log/useTrackedState";

const DEFAULT_PARAMS: TagMeshParams = {
  mainNeighbors: 6,
  subNeighbors: 12,
  sizeScale: 10,
  distance: 40,
  hierarchyDistance: 100,
};

export default function TagMeshView({ graph, instanceId }: GraphViewProps) {
  // Sliders fire many setParams calls per drag; debounce so one drag gesture
  // collapses into one undoable action. Keyed by the per-instance id so
  // multiple tag-mesh views on screen have independent sliders.
  const [params, setParams] = useTrackedState<TagMeshParams>(
    instanceId,
    "params",
    DEFAULT_PARAMS,
    { debounce: true },
  );
  const data = useMemo(() => transformGraph(graph), [graph]);
  const scores = useMemo(() => computeTagScores(graph), [graph]);

  return (
    <div style={containerStyle}>
      <TagMesh2DView
        data={data}
        params={params}
        scores={scores}
        instanceId={instanceId}
      />
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
