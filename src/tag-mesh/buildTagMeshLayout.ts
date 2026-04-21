import { ForceGraphData } from "../external-graph/transformGraph";

export type TagLayoutNode = {
  tag: string;
  datumCount: number;
  x: number;
  y: number;
  radius: number;
  neighbors: string[];
};

export type TagLayoutLink = {
  source: string;
  target: string;
  weight: number;
};

export type TagMeshLayout = {
  tags: TagLayoutNode[];
  links: TagLayoutLink[];
};

export type TagMeshParams = {
  maxNeighbors: number;
  sizeScale: number;
  distance: number;
  connectionDistanceGain: number;
};

const MIN_RADIUS = 10;
const TAU = Math.PI * 2;

type TreeNode = {
  tag: string;
  datumCount: number;
  parentTag: string | null;
  childTags: string[];
};

type Position = { x: number; y: number; parentAngle: number | null };

export function buildTagMeshLayout(
  data: ForceGraphData,
  params: TagMeshParams,
): TagMeshLayout {
  const { maxNeighbors, sizeScale, distance, connectionDistanceGain } = params;

  const datumTags = new Map<string, Set<string>>();
  const tagDatums = new Map<string, Set<string>>();
  for (const node of data.nodes) {
    datumTags.set(node.id, new Set(node.tags));
    for (const t of node.tags) {
      if (!tagDatums.has(t)) tagDatums.set(t, new Set());
      tagDatums.get(t)!.add(node.id);
    }
  }

  const adjacency = new Map<string, Set<string>>();
  for (const link of data.links) {
    const s =
      typeof link.source === "string" ? link.source : (link as any).source?.id;
    const t =
      typeof link.target === "string" ? link.target : (link as any).target?.id;
    if (!s || !t) continue;
    if (!adjacency.has(s)) adjacency.set(s, new Set());
    if (!adjacency.has(t)) adjacency.set(t, new Set());
    adjacency.get(s)!.add(t);
    adjacency.get(t)!.add(s);
  }

  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const connBetween = new Map<string, number>();
  for (const [datum, neighbors] of adjacency) {
    const aTags = datumTags.get(datum);
    if (!aTags) continue;
    for (const other of neighbors) {
      if (datum >= other) continue;
      const bTags = datumTags.get(other);
      if (!bTags) continue;
      for (const ta of aTags) {
        for (const tb of bTags) {
          if (ta === tb) continue;
          const k = pairKey(ta, tb);
          connBetween.set(k, (connBetween.get(k) ?? 0) + 1);
        }
      }
    }
  }

  const allTags = [...tagDatums.entries()]
    .map(([tag, set]) => ({ tag, count: set.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  if (allTags.length === 0) return { tags: [], links: [] };

  const sizeFor = (count: number) => MIN_RADIUS + sizeScale * Math.sqrt(count);
  const countOf = (tag: string) => tagDatums.get(tag)!.size;

  // ── Pass 1: build the BFS tree ────────────────────────────────────────
  const tree = new Map<string, TreeNode>();
  const orderQueue: string[] = [];
  const remaining = new Set(allTags.map((t) => t.tag));

  function addTreeNode(tag: string, parentTag: string | null) {
    tree.set(tag, {
      tag,
      datumCount: countOf(tag),
      parentTag,
      childTags: [],
    });
    remaining.delete(tag);
    orderQueue.push(tag);
    if (parentTag) tree.get(parentTag)!.childTags.push(tag);
  }

  addTreeNode(allTags[0].tag, null);

  let head = 0;
  while (head < orderQueue.length || remaining.size > 0) {
    if (head >= orderQueue.length) {
      let biggest: string | null = null;
      for (const t of remaining) {
        if (biggest === null || countOf(t) > countOf(biggest)) biggest = t;
      }
      if (!biggest) break;
      addTreeNode(biggest, null);
      continue;
    }

    const parentTag = orderQueue[head++];
    const parent = tree.get(parentTag)!;
    const existing = (parent.parentTag ? 1 : 0) + parent.childTags.length;
    const capacity = maxNeighbors - existing;
    if (capacity <= 0) continue;

    const candidates: Array<{ tag: string; conn: number }> = [];
    for (const t of remaining) {
      const c = connBetween.get(pairKey(t, parent.tag)) ?? 0;
      if (c > 0) candidates.push({ tag: t, conn: c });
    }
    candidates.sort(
      (a, b) => b.conn - a.conn || countOf(b.tag) - countOf(a.tag),
    );
    for (const c of candidates.slice(0, capacity)) {
      addTreeNode(c.tag, parent.tag);
    }
  }

  const neighborCount = (tag: string): number => {
    const n = tree.get(tag)!;
    return (n.parentTag ? 1 : 0) + n.childTags.length;
  };

  const edgeScale = (parentN: number, childN: number) =>
    1 + connectionDistanceGain * Math.max(0, parentN + childN - 2);

  // ── Pass 2: assign positions in BFS order ─────────────────────────────
  const positions = new Map<string, Position>();
  let orphanIndex = 0;

  for (const tag of orderQueue) {
    const node = tree.get(tag)!;

    if (node.parentTag === null) {
      if (positions.size === 0) {
        positions.set(tag, { x: 0, y: 0, parentAngle: null });
      } else {
        orphanIndex++;
        const a = orphanIndex * 2.399963;
        const r = distance * 5 * Math.sqrt(orphanIndex);
        positions.set(tag, {
          x: r * Math.cos(a),
          y: r * Math.sin(a),
          parentAngle: null,
        });
      }
      continue;
    }

    const parentNode = tree.get(node.parentTag)!;
    const parentPos = positions.get(node.parentTag)!;
    const siblings = parentNode.childTags;
    const i = siblings.indexOf(tag);
    const N = siblings.length;

    let angle: number;
    if (parentPos.parentAngle === null) {
      const base = -Math.PI / 2;
      const step = TAU / N;
      angle = base + i * step;
    } else {
      const step = TAU / (N + 1);
      angle = parentPos.parentAngle + (i + 1) * step;
    }

    const gap =
      distance * edgeScale(neighborCount(parentNode.tag), neighborCount(tag));
    const parentRadius = sizeFor(parentNode.datumCount);
    const childRadius = sizeFor(node.datumCount);
    const centerToCenter = parentRadius + gap + childRadius;
    positions.set(tag, {
      x: parentPos.x + centerToCenter * Math.cos(angle),
      y: parentPos.y + centerToCenter * Math.sin(angle),
      parentAngle: (angle + Math.PI) % TAU,
    });
  }

  // ── Emit tags and links ──────────────────────────────────────────────
  const tags: TagLayoutNode[] = orderQueue.map((tag) => {
    const node = tree.get(tag)!;
    const pos = positions.get(tag)!;
    const ns: string[] = [];
    if (node.parentTag) ns.push(node.parentTag);
    ns.push(...node.childTags);
    return {
      tag,
      datumCount: node.datumCount,
      x: pos.x,
      y: pos.y,
      radius: sizeFor(node.datumCount),
      neighbors: ns,
    };
  });

  const links: TagLayoutLink[] = [];
  for (const node of tree.values()) {
    if (node.parentTag) {
      links.push({
        source: node.parentTag,
        target: node.tag,
        weight: connBetween.get(pairKey(node.parentTag, node.tag)) ?? 0,
      });
    }
  }

  return { tags, links };
}
