import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ForceGraph3D from "3d-force-graph";
import * as THREE from "three";
import {
  ForceGraphData,
  ForceGraphNode,
} from "../external-graph/transformGraph";
import { buildHierarchy } from "../grouping/buildHierarchy";
import { buildPackedLayout3D } from "../grouping/buildPackedLayout3D";
import { buildVisibleGraph } from "../grouping/buildVisibleGraph";
import { GroupedGraphNode } from "../grouping/types";

type GroupedGraphViewProps = {
  data: ForceGraphData;
  onLeafClick: (datum: ForceGraphNode) => void;
  resetToken: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphInstance = any;

const DEPTH_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
];

function colorFor(node: GroupedGraphNode): number {
  if (node.kind === "leaf") return 0xe2e8f0;
  const hex = DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
  return parseInt(hex.slice(1), 16);
}

function buildGhostMesh(radius: number, color: number): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color });
  const tube = Math.max(0.6, radius * 0.03);
  const rotations: Array<[number, number, number]> = [
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
    [0, Math.PI / 2, 0],
  ];
  for (const [rx, ry, rz] of rotations) {
    const geometry = new THREE.TorusGeometry(radius, tube, 12, 96);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(rx, ry, rz);
    group.add(mesh);
  }
  return group;
}

export default function GroupedGraphView({
  data,
  onLeafClick,
  resetToken,
}: GroupedGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphInstance>(null);
  const didInitialFit = useRef(false);

  const hierarchy = useMemo(() => buildHierarchy(data.nodes), [data.nodes]);
  const layout = useMemo(() => buildPackedLayout3D(hierarchy), [hierarchy]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpanded(new Set());
    didInitialFit.current = false;
  }, [hierarchy, resetToken]);

  const visible = useMemo(
    () => buildVisibleGraph(hierarchy, expanded, data.links, layout),
    [hierarchy, expanded, data.links, layout],
  );

  const handleNodeClick = useCallback(
    (node: object) => {
      const g = node as GroupedGraphNode;
      if (g.kind === "leaf" && g.leafDatum) {
        onLeafClick(g.leafDatum);
        return;
      }
      if (g.kind === "ghost" && g.ghostOfId) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(g.ghostOfId!);
          return next;
        });
        return;
      }
      if (g.kind === "group" && g.hasChildren) {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(g.id)) next.delete(g.id);
          else next.add(g.id);
          return next;
        });
      }
    },
    [onLeafClick],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const init = ForceGraph3D as unknown as (
      ...args: unknown[]
    ) => (el: HTMLElement) => ForceGraphInstance;

    const graph = init({
      rendererConfig: { antialias: true },
      controlType: "orbit",
    })(
      containerRef.current,
    )
      .nodeLabel((n: GroupedGraphNode) => n.name)
      .nodeThreeObject((n: GroupedGraphNode) => {
        if (n.kind === "ghost") {
          return buildGhostMesh(n.radius, colorFor(n));
        }
        const geometry = new THREE.SphereGeometry(n.radius, 32, 32);
        const material = new THREE.MeshLambertMaterial({ color: colorFor(n) });
        return new THREE.Mesh(geometry, material);
      })
      .linkColor(() => "#cbd5e1")
      .linkLabel((l: { tags: string[] }) => l.tags.join(", "))
      .linkOpacity(0.8)
      .linkWidth(1.5)
      .linkCurvature(0.5)
      .linkCurveRotation((l: { curveRotation: number }) => l.curveRotation)
      .onNodeClick(handleNodeClick)
      .enableNodeDrag(false)
      .backgroundColor("#0f172a")
      .warmupTicks(1)
      .cooldownTicks(0);

    const controls = graph.controls?.();
    if (controls) controls.zoomToCursor = true;

    graph.d3Force("charge", null);
    graph.d3Force("center", null);
    const linkForce = graph.d3Force("link");
    if (linkForce) linkForce.strength(0);

    graphRef.current = graph;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        graph.width(containerRef.current.clientWidth);
        graph.height(containerRef.current.clientHeight);
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      graph._destructor?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.graphData(visible);
    if (!didInitialFit.current && visible.nodes.length > 0) {
      didInitialFit.current = true;
      requestAnimationFrame(() => {
        graphRef.current?.zoomToFit(0, 40);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (graphRef.current) graphRef.current.onNodeClick(handleNodeClick);
  }, [handleNodeClick]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", backgroundColor: "#0f172a" }}
    />
  );
}
