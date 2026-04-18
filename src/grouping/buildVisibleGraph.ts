import { ForceGraphLink } from "../external-graph/transformGraph";
import {
  HierarchyNode,
  GroupedGraphData,
  GroupedGraphNode,
  GroupedGraphLink,
  UNTAGGED_LABEL,
} from "./types";
import { Position3D } from "./buildPackedLayout3D";

function collectVisible(
  nodes: HierarchyNode[],
  expanded: Set<string>,
  depth: number,
  out: HierarchyNode[],
  depths: Map<string, number>,
  ghosts: HierarchyNode[],
): void {
  for (const node of nodes) {
    if (node.kind === "leaf" || !expanded.has(node.id)) {
      out.push(node);
      depths.set(node.id, depth);
    } else {
      ghosts.push(node);
      depths.set(node.id, depth);
      collectVisible(node.children, expanded, depth + 1, out, depths, ghosts);
    }
  }
}

function buildDatumIndex(
  visible: HierarchyNode[],
): Map<string, HierarchyNode> {
  const index = new Map<string, HierarchyNode>();
  for (const node of visible) {
    if (node.kind === "leaf") {
      index.set(node.datumId, node);
    } else {
      for (const did of node.datumIds) index.set(did, node);
    }
  }
  return index;
}

export function buildVisibleGraph(
  hierarchy: HierarchyNode[],
  expanded: Set<string>,
  links: ForceGraphLink[],
  layout: Map<string, Position3D>,
): GroupedGraphData {
  const visible: HierarchyNode[] = [];
  const ghosts: HierarchyNode[] = [];
  const depths = new Map<string, number>();
  collectVisible(hierarchy, expanded, 0, visible, depths, ghosts);

  const nodes: GroupedGraphNode[] = visible.map((node) => {
    const pos = layout.get(node.id) ?? { x: 0, y: 0, z: 0, r: 4 };
    const depth = depths.get(node.id) ?? 0;
    const base = {
      fx: pos.x,
      fy: pos.y,
      fz: pos.z,
      radius: pos.r,
      depth,
    };
    if (node.kind === "leaf") {
      return {
        ...base,
        id: node.id,
        name: node.datum.name,
        kind: "leaf",
        count: 1,
        hasChildren: false,
        leafDatum: node.datum,
      };
    }
    return {
      ...base,
      id: node.id,
      name: `${node.tag} (${node.datumIds.length})`,
      kind: "group",
      count: node.datumIds.length,
      hasChildren: node.children.length > 0,
    };
  });

  for (const node of ghosts) {
    if (node.kind !== "group") continue;
    const pos = layout.get(node.id) ?? { x: 0, y: 0, z: 0, r: 4 };
    nodes.push({
      id: `ghost:${node.id}`,
      name: `${node.tag} (${node.datumIds.length})`,
      kind: "ghost",
      count: node.datumIds.length,
      depth: depths.get(node.id) ?? 0,
      hasChildren: true,
      fx: pos.x,
      fy: pos.y,
      fz: pos.z,
      radius: pos.r,
      ghostOfId: node.id,
    });
  }

  const datumToVisible = buildDatumIndex(visible);

  const linkEndpointId = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && "id" in v) {
      return String((v as { id: unknown }).id);
    }
    return "";
  };

  const byPair = new Map<string, GroupedGraphLink>();
  for (const link of links) {
    const a = datumToVisible.get(linkEndpointId(link.source));
    const b = datumToVisible.get(linkEndpointId(link.target));
    if (!a || !b || a.id === b.id) continue;
    const key = `${a.id}->${b.id}`;
    let entry = byPair.get(key);
    if (!entry) {
      let h = 0;
      for (let i = 0; i < key.length; i++) {
        h = (h * 31 + key.charCodeAt(i)) | 0;
      }
      const curveRotation = ((h >>> 0) / 0xffffffff) * Math.PI * 2;
      entry = { source: a.id, target: b.id, tags: [], curveRotation };
      byPair.set(key, entry);
    }
    const tagList = link.tags.length > 0 ? link.tags : [UNTAGGED_LABEL];
    for (const tag of tagList) {
      if (!entry.tags.includes(tag)) entry.tags.push(tag);
    }
  }

  return { nodes, links: [...byPair.values()] };
}
