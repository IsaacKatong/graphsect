import {
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceCenter,
} from "d3-force-3d";
import { HierarchyNode } from "./types";

export type Position3D = { x: number; y: number; z: number; r: number };

const LEAF_RADIUS = 5;
const PADDING = 1;
const TICKS = 250;
const CHARGE = -2;

type SimNode = { id: string; r: number; x: number; y: number; z: number };

function layoutSiblings(
  siblings: Array<{ id: string; r: number }>,
): Map<string, { x: number; y: number; z: number }> {
  const out = new Map<string, { x: number; y: number; z: number }>();
  if (siblings.length === 0) return out;
  if (siblings.length === 1) {
    out.set(siblings[0].id, { x: 0, y: 0, z: 0 });
    return out;
  }

  const maxR = siblings.reduce((m, s) => Math.max(m, s.r), 0);
  const nodes: SimNode[] = siblings.map((s) => ({
    id: s.id,
    r: s.r,
    x: (Math.random() - 0.5) * maxR * 4,
    y: (Math.random() - 0.5) * maxR * 4,
    z: (Math.random() - 0.5) * maxR * 4,
  }));

  const sim = forceSimulation(nodes, 3)
    .force("charge", forceManyBody().strength(CHARGE))
    .force("collide", forceCollide(maxR + PADDING))
    .force("center", forceCenter(0, 0, 0))
    .alphaDecay(0.03)
    .stop();

  for (let i = 0; i < TICKS; i++) sim.tick();

  for (const n of nodes) out.set(n.id, { x: n.x, y: n.y, z: n.z });
  return out;
}

type PartialLayout = {
  radius: number;
  positions: Map<string, Position3D>;
};

function layoutNode(node: HierarchyNode): PartialLayout {
  if (node.kind === "leaf") {
    const positions = new Map<string, Position3D>();
    positions.set(node.id, { x: 0, y: 0, z: 0, r: LEAF_RADIUS });
    return { radius: LEAF_RADIUS, positions };
  }

  const childLayouts = node.children.map((c) => ({
    node: c,
    layout: layoutNode(c),
  }));

  const forLayout = childLayouts.map((cl) => ({
    id: cl.node.id,
    r: cl.layout.radius,
  }));

  const centers = layoutSiblings(forLayout);

  const positions = new Map<string, Position3D>();
  let groupRadius = 0;

  for (const { node: child, layout: childLayout } of childLayouts) {
    const c = centers.get(child.id) ?? { x: 0, y: 0, z: 0 };
    for (const [id, p] of childLayout.positions) {
      positions.set(id, {
        x: p.x + c.x,
        y: p.y + c.y,
        z: p.z + c.z,
        r: p.r,
      });
    }
    const dist = Math.sqrt(c.x * c.x + c.y * c.y + c.z * c.z);
    groupRadius = Math.max(groupRadius, dist + childLayout.radius);
  }
  groupRadius += PADDING;

  positions.set(node.id, { x: 0, y: 0, z: 0, r: groupRadius });
  return { radius: groupRadius, positions };
}

export function buildPackedLayout3D(
  roots: HierarchyNode[],
): Map<string, Position3D> {
  const out = new Map<string, Position3D>();
  if (roots.length === 0) return out;

  const rootLayouts = roots.map((r) => ({ node: r, layout: layoutNode(r) }));
  const centers = layoutSiblings(
    rootLayouts.map((rl) => ({ id: rl.node.id, r: rl.layout.radius })),
  );

  for (const { node, layout } of rootLayouts) {
    const c = centers.get(node.id) ?? { x: 0, y: 0, z: 0 };
    for (const [id, p] of layout.positions) {
      out.set(id, {
        x: p.x + c.x,
        y: p.y + c.y,
        z: p.z + c.z,
        r: p.r,
      });
    }
  }

  return out;
}
