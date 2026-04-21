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
};

const MIN_RADIUS = 10;
const TAU = Math.PI * 2;

type PlacedTag = {
  tag: string;
  datumCount: number;
  x: number;
  y: number;
  radius: number;
  neighbors: string[];
  parentAngle: number | null;
};

export function buildTagMeshLayout(
  data: ForceGraphData,
  params: TagMeshParams,
): TagMeshLayout {
  const { maxNeighbors, sizeScale, distance } = params;

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

  const placed = new Map<string, PlacedTag>();
  const links: TagLayoutLink[] = [];
  const remaining = new Set(allTags.map((t) => t.tag));
  const queue: string[] = [];

  function seedRoot(tag: string, x: number, y: number) {
    placed.set(tag, {
      tag,
      datumCount: countOf(tag),
      x,
      y,
      radius: sizeFor(countOf(tag)),
      neighbors: [],
      parentAngle: null,
    });
    remaining.delete(tag);
    queue.push(tag);
  }

  function placeChild(
    parent: PlacedTag,
    childTag: string,
    angle: number,
  ) {
    const x = parent.x + distance * Math.cos(angle);
    const y = parent.y + distance * Math.sin(angle);
    placed.set(childTag, {
      tag: childTag,
      datumCount: countOf(childTag),
      x,
      y,
      radius: sizeFor(countOf(childTag)),
      neighbors: [parent.tag],
      parentAngle: (angle + Math.PI) % TAU,
    });
    parent.neighbors.push(childTag);
    links.push({
      source: parent.tag,
      target: childTag,
      weight: connBetween.get(pairKey(parent.tag, childTag)) ?? 0,
    });
    remaining.delete(childTag);
    queue.push(childTag);
  }

  seedRoot(allTags[0].tag, 0, 0);
  let orphanIndex = 0;

  while (remaining.size > 0 || queue.length > 0) {
    if (queue.length === 0) {
      let biggest: string | null = null;
      for (const t of remaining) {
        if (biggest === null || countOf(t) > countOf(biggest)) biggest = t;
      }
      if (!biggest) break;
      orphanIndex++;
      const a = orphanIndex * 2.399963;
      const r = distance * 4 * Math.sqrt(orphanIndex);
      seedRoot(biggest, r * Math.cos(a), r * Math.sin(a));
      continue;
    }

    const parentTag = queue.shift()!;
    const parent = placed.get(parentTag)!;
    const capacity = maxNeighbors - parent.neighbors.length;
    if (capacity <= 0) continue;

    const candidates: Array<{ tag: string; conn: number }> = [];
    for (const t of remaining) {
      const c = connBetween.get(pairKey(t, parent.tag)) ?? 0;
      if (c > 0) candidates.push({ tag: t, conn: c });
    }
    candidates.sort(
      (a, b) => b.conn - a.conn || countOf(b.tag) - countOf(a.tag),
    );
    const children = candidates.slice(0, capacity);
    if (children.length === 0) continue;

    const N = children.length;
    if (parent.parentAngle === null) {
      const base = -Math.PI / 2;
      const step = TAU / N;
      for (let i = 0; i < N; i++) {
        placeChild(parent, children[i].tag, base + i * step);
      }
    } else {
      const step = TAU / (N + 1);
      for (let i = 0; i < N; i++) {
        const a = parent.parentAngle + (i + 1) * step;
        placeChild(parent, children[i].tag, a);
      }
    }
  }

  const tags: TagLayoutNode[] = [...placed.values()].map(
    ({ parentAngle: _p, ...rest }) => rest,
  );
  return { tags, links };
}
