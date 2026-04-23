import { ForceGraphData } from "../external-graph/transformGraph";

export type TagLayoutNode = {
  tag: string;
  score: number;
  datumCount: number;
  role: "main" | "sub";
  parent: string | null;
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
  mainNeighbors: number; // X — main tags around a tag
  subNeighbors: number; // Y — sub tags around a tag (must be multiple of X)
  sizeScale: number;
  distance: number; // D — minimum edge-to-edge gap
  hierarchyDistance: number; // A — extra padding between main clusters
};

const MIN_RADIUS = 10;
const TAU = Math.PI * 2;
const EPS = 0.001;

type TreeNode = {
  tag: string;
  score: number;
  datumCount: number;
  role: "main" | "sub";
  parent: string | null;
  mainChildren: string[];
  subChildren: string[];
  angleFromParent: number; // global angle of this node as seen from its parent
  parentRefAngle: number; // global angle of this node's parent as seen from this node
  mainSlotAngles: number[];
  subSlotAngles: number[];
  subOffsets: Map<string, { angle: number; dist: number }>;
  trueSize: number;
  x: number;
  y: number;
};

function angleDiff(a: number, b: number): number {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function buildTagMeshLayout(
  data: ForceGraphData,
  params: TagMeshParams,
): TagMeshLayout {
  const {
    mainNeighbors: X,
    subNeighbors: Yraw,
    sizeScale,
    distance: D,
    hierarchyDistance: A,
  } = params;
  // Snap Y to a multiple of X defensively.
  const Y = X > 0 ? X * Math.max(0, Math.round(Yraw / X)) : 0;
  const subsPerGap = X > 0 ? Y / X : 0;

  // ── Phase 1: datum/tag maps and per-datum degree ──────────────────────
  const tagDatums = new Map<string, Set<string>>();
  const datumTags = new Map<string, Set<string>>();
  for (const node of data.nodes) {
    datumTags.set(node.id, new Set(node.tags));
    for (const t of node.tags) {
      if (!tagDatums.has(t)) tagDatums.set(t, new Set());
      tagDatums.get(t)!.add(node.id);
    }
  }

  const datumDegree = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  for (const link of data.links) {
    const s =
      typeof link.source === "string" ? link.source : (link as any).source?.id;
    const t =
      typeof link.target === "string" ? link.target : (link as any).target?.id;
    if (!s || !t) continue;
    datumDegree.set(s, (datumDegree.get(s) ?? 0) + 1);
    datumDegree.set(t, (datumDegree.get(t) ?? 0) + 1);
    if (!adjacency.has(s)) adjacency.set(s, new Set());
    if (!adjacency.has(t)) adjacency.set(t, new Set());
    adjacency.get(s)!.add(t);
    adjacency.get(t)!.add(s);
  }

  // Score = |datums(T)| + Σ deg(d) for d ∈ datums(T)
  const scoreOf = (tag: string): number => {
    const datums = tagDatums.get(tag);
    if (!datums) return 0;
    let s = datums.size;
    for (const d of datums) s += datumDegree.get(d) ?? 0;
    return s;
  };
  const countOf = (tag: string) => tagDatums.get(tag)?.size ?? 0;

  // Tag-pair edge counts (shared-datum-pair edges) — symmetric.
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const tagPairEdges = new Map<string, number>();
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
          tagPairEdges.set(k, (tagPairEdges.get(k) ?? 0) + 1);
        }
      }
    }
  }
  const pairCount = (a: string, b: string) =>
    tagPairEdges.get(pairKey(a, b)) ?? 0;

  // Tags that share any pair-edge with a given tag.
  const tagConnections = new Map<string, Set<string>>();
  for (const key of tagPairEdges.keys()) {
    const [a, b] = key.split("|");
    if (!tagConnections.has(a)) tagConnections.set(a, new Set());
    if (!tagConnections.has(b)) tagConnections.set(b, new Set());
    tagConnections.get(a)!.add(b);
    tagConnections.get(b)!.add(a);
  }

  const allTags = [...tagDatums.keys()].sort(
    (a, b) => scoreOf(b) - scoreOf(a) || a.localeCompare(b),
  );

  if (allTags.length === 0) return { tags: [], links: [] };

  const sizeFor = (score: number) => MIN_RADIUS + sizeScale * Math.sqrt(score);

  // ── Phase 2: role assignment ──────────────────────────────────────────
  const tree = new Map<string, TreeNode>();
  const placedMains: string[] = [];
  const placedSubs: string[] = [];
  const orphanMains: string[] = [];
  const remaining = new Set(allTags);

  function makeNode(
    tag: string,
    role: "main" | "sub",
    parent: string | null,
  ): TreeNode {
    return {
      tag,
      score: scoreOf(tag),
      datumCount: countOf(tag),
      role,
      parent,
      mainChildren: [],
      subChildren: [],
      angleFromParent: 0,
      parentRefAngle: 0,
      mainSlotAngles: [],
      subSlotAngles: [],
      subOffsets: new Map(),
      trueSize: 0,
      x: 0,
      y: 0,
    };
  }

  function addNode(
    tag: string,
    role: "main" | "sub",
    parent: string | null,
  ): void {
    const n = makeNode(tag, role, parent);
    tree.set(tag, n);
    remaining.delete(tag);
    if (parent) {
      const p = tree.get(parent)!;
      if (role === "main") p.mainChildren.push(tag);
      else p.subChildren.push(tag);
    }
    if (role === "main") {
      placedMains.push(tag);
      if (parent === null) orphanMains.push(tag);
    } else {
      placedSubs.push(tag);
    }
  }

  const mainCapOf = (m: TreeNode) => (m.parent === null ? X : X - 1);

  function bestConnectedCandidates(
    parentTag: string,
    limit: number,
  ): string[] {
    const cands: Array<{ tag: string; count: number }> = [];
    for (const t of remaining) {
      const c = pairCount(t, parentTag);
      if (c > 0) cands.push({ tag: t, count: c });
    }
    cands.sort(
      (a, b) =>
        b.count - a.count ||
        scoreOf(b.tag) - scoreOf(a.tag) ||
        a.tag.localeCompare(b.tag),
    );
    return cands.slice(0, limit).map((c) => c.tag);
  }

  // Root: highest-score tag, with its X best-connected neighbors as main children.
  addNode(allTags[0], "main", null);
  for (const t of bestConnectedCandidates(allTags[0], X)) {
    addNode(t, "main", allTags[0]);
  }

  while (remaining.size > 0) {
    // Find (u, m): unplaced u with the strongest pair-edge to any placed main m.
    let bestTag: string | null = null;
    let bestMain: string | null = null;
    let bestCount = 0;
    let bestScore = -1;
    for (const u of remaining) {
      const uScore = scoreOf(u);
      for (const m of placedMains) {
        const c = pairCount(u, m);
        if (c <= 0) continue;
        if (
          c > bestCount ||
          (c === bestCount &&
            (uScore > bestScore ||
              (uScore === bestScore &&
                bestTag !== null &&
                u.localeCompare(bestTag) < 0)))
        ) {
          bestTag = u;
          bestMain = m;
          bestCount = c;
          bestScore = uScore;
        }
      }
    }

    if (bestTag === null || bestMain === null || bestCount === 0) {
      // Remaining tags have no edges to anything placed — start a fresh root.
      let next: string | null = null;
      let nextScore = -1;
      for (const u of remaining) {
        const s = scoreOf(u);
        if (
          s > nextScore ||
          (s === nextScore && next !== null && u.localeCompare(next) < 0)
        ) {
          next = u;
          nextScore = s;
        }
      }
      if (!next) break;
      addNode(next, "main", null);
      for (const t of bestConnectedCandidates(next, X)) {
        addNode(t, "main", next);
      }
      continue;
    }

    const conns = tagConnections.get(bestTag) ?? new Set<string>();
    let canBeSub = true;
    for (const v of conns) {
      if (!tree.has(v)) {
        canBeSub = false;
        break;
      }
    }

    const bestMainNode = tree.get(bestMain)!;

    if (canBeSub && bestMainNode.subChildren.length < Y) {
      addNode(bestTag, "sub", bestMain);
      continue;
    }

    // Fall back to main-child — prefer bestMain if it has main capacity, else try
    // the next main (by pair-edge count) that still has room for a main child.
    if (bestMainNode.mainChildren.length < mainCapOf(bestMainNode)) {
      addNode(bestTag, "main", bestMain);
      continue;
    }

    let fallback: string | null = null;
    let fallbackCount = -1;
    for (const m of placedMains) {
      if (m === bestMain) continue;
      const mNode = tree.get(m)!;
      if (mNode.mainChildren.length >= mainCapOf(mNode)) continue;
      const c = pairCount(bestTag, m);
      if (c > fallbackCount) {
        fallback = m;
        fallbackCount = c;
      }
    }
    if (fallback) {
      addNode(bestTag, "main", fallback);
    } else {
      addNode(bestTag, "main", null);
    }
  }

  // ── Phase 3a: angular slot assignment (BFS down from each root) ──────
  function layoutAngles(m: TreeNode): void {
    const slotStep = X > 0 ? TAU / X : 0;
    const hasParent = m.parent !== null;
    // Slot 0 is the parent direction for non-roots; for roots we start at -π/2
    // so the first main child sits at the top.
    const base = hasParent ? m.parentRefAngle : -Math.PI / 2;
    const slots: number[] = [];
    for (let i = 0; i < X; i++) slots.push(base + i * slotStep);

    // Main child slots: all slots except slot 0 for non-roots.
    m.mainSlotAngles = hasParent ? slots.slice(1) : slots.slice();
    for (let i = 0; i < m.mainChildren.length; i++) {
      const child = tree.get(m.mainChildren[i])!;
      const a = m.mainSlotAngles[i] ?? 0;
      child.angleFromParent = a;
      child.parentRefAngle = a + Math.PI;
    }

    // Sub slots: k subs per gap between consecutive main slots.
    const subAngles: number[] = [];
    for (let i = 0; i < X; i++) {
      const start = slots[i];
      for (let j = 0; j < subsPerGap; j++) {
        subAngles.push(start + ((j + 1) / (subsPerGap + 1)) * slotStep);
      }
    }
    m.subSlotAngles = subAngles;
    for (let i = 0; i < m.subChildren.length; i++) {
      const sub = tree.get(m.subChildren[i])!;
      const a =
        subAngles[i] ??
        subAngles[subAngles.length - 1] ??
        (m.mainSlotAngles[0] ?? 0);
      sub.angleFromParent = a;
      sub.parentRefAngle = a + Math.PI;
    }
  }

  for (const root of orphanMains) {
    const queue: string[] = [root];
    while (queue.length) {
      const tag = queue.shift()!;
      const n = tree.get(tag)!;
      layoutAngles(n);
      for (const c of n.mainChildren) queue.push(c);
    }
  }

  // ── Phase 3b: sub radial offsets, reverse placement order ─────────────
  // Find the *minimum* dist ≥ parentR + D + subR that sits outside every
  // processed sibling's forbidden interval on the radial axis. Each sibling
  // contributes [forbiddenLow, forbiddenHigh] = d2·cos(Δθ) ∓ √(needed² −
  // d2²·sin²(Δθ)); discriminant < 0 means angularly out of reach.
  const processedSubs = new Set<string>();
  for (let i = placedSubs.length - 1; i >= 0; i--) {
    const subTag = placedSubs[i];
    const sub = tree.get(subTag)!;
    const parent = tree.get(sub.parent!)!;
    const parentR = sizeFor(parent.score);
    const subR = sizeFor(sub.score);
    const floor = parentR + D + subR;

    const forbidden: Array<{ lo: number; hi: number }> = [];
    for (const siblingTag of parent.subChildren) {
      if (siblingTag === subTag) continue;
      if (!processedSubs.has(siblingTag)) continue;
      const sibling = tree.get(siblingTag)!;
      const siblingOffset = parent.subOffsets.get(siblingTag)!;
      const siblingR = sizeFor(sibling.score);
      const needed = subR + siblingR + D;
      const d2 = siblingOffset.dist;
      const delta = angleDiff(sub.angleFromParent, siblingOffset.angle);
      const cosD = Math.cos(delta);
      const sinD = Math.sin(delta);
      const discr = needed * needed - d2 * d2 * sinD * sinD;
      if (discr < 0) continue; // sibling is angularly out of reach at any dist
      const sqrtDiscr = Math.sqrt(discr);
      const hi = d2 * cosD + sqrtDiscr;
      if (hi <= 0) continue; // forbidden region entirely behind the parent
      const lo = Math.max(0, d2 * cosD - sqrtDiscr);
      forbidden.push({ lo, hi });
    }

    // Sort by lower bound and walk once: stay at floor if below the next
    // interval, jump past hi if inside, skip if already past.
    forbidden.sort((a, b) => a.lo - b.lo);
    let dist = floor;
    for (const { lo, hi } of forbidden) {
      if (dist < lo - EPS) continue; // below this interval → below all later ones too
      if (dist > hi + EPS) continue; // already past
      dist = hi + EPS;
    }

    parent.subOffsets.set(subTag, { angle: sub.angleFromParent, dist });
    processedSubs.add(subTag);
  }

  // ── Phase 3c: compute trueSize for each main ──────────────────────────
  // Post-order traversal (leaves first) so each parent can fold in its
  // main-children's already-computed trueSize.
  const mainPostOrder: string[] = [];
  {
    type Frame = { tag: string; visitedChildren: boolean };
    const stack: Frame[] = [];
    for (const rootTag of orphanMains) {
      stack.push({ tag: rootTag, visitedChildren: false });
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (!top.visitedChildren) {
          top.visitedChildren = true;
          const n = tree.get(top.tag)!;
          for (const c of n.mainChildren) {
            stack.push({ tag: c, visitedChildren: false });
          }
        } else {
          mainPostOrder.push(top.tag);
          stack.pop();
        }
      }
    }
  }

  for (const tag of mainPostOrder) {
    const n = tree.get(tag)!;
    const mainR = sizeFor(n.score);
    let reach = mainR;
    for (const subTag of n.subChildren) {
      const off = n.subOffsets.get(subTag)!;
      const sR = sizeFor(tree.get(subTag)!.score);
      const r = off.dist + sR;
      if (r > reach) reach = r;
    }
    // Main children: each child C is placed at mainR + C.trueSize along
    // angleFromParent, and C's cloud extends another C.trueSize outward,
    // so the farthest point of C's cloud from n's center is
    // mainR + 2 * C.trueSize.
    for (const childTag of n.mainChildren) {
      const child = tree.get(childTag)!;
      const r = mainR + 2 * child.trueSize;
      if (r > reach) reach = r;
    }
    n.trueSize = reach + D + A;
  }

  // ── Phase 3d: place mains in the global frame (forward BFS) ───────────
  const placedMainsGlobal: string[] = [];
  for (let ri = 0; ri < orphanMains.length; ri++) {
    const rootTag = orphanMains[ri];
    const rootNode = tree.get(rootTag)!;
    if (ri === 0) {
      rootNode.x = 0;
      rootNode.y = 0;
    } else {
      const a = ri * 2.399963;
      const r = (rootNode.trueSize + D + A) * 2 * Math.sqrt(ri);
      rootNode.x = r * Math.cos(a);
      rootNode.y = r * Math.sin(a);
    }

    const queue: string[] = [rootTag];
    while (queue.length) {
      const tag = queue.shift()!;
      const n = tree.get(tag)!;
      if (n.parent !== null) {
        const parent = tree.get(n.parent)!;
        const ang = n.angleFromParent;
        let dist = sizeFor(parent.score) + n.trueSize;
        let x = parent.x + dist * Math.cos(ang);
        let y = parent.y + dist * Math.sin(ang);

        // Ancestors of n (parent, grandparent, …). Their trueSize disks
        // are *supposed* to contain n's subtree — bumping against them
        // would push n outside its own ancestors, which is nonsense. The
        // cousins/siblings (non-ancestor placed mains) are the real
        // keep-out set.
        const ancestors = new Set<string>();
        {
          let cur: string | null = n.parent;
          while (cur !== null) {
            ancestors.add(cur);
            cur = tree.get(cur)!.parent;
          }
        }

        let bumped = true;
        let safety = 0;
        while (bumped && safety < 64) {
          safety++;
          bumped = false;
          for (const otherTag of placedMainsGlobal) {
            if (ancestors.has(otherTag)) continue;
            const o = tree.get(otherTag)!;
            const dx = x - o.x;
            const dy = y - o.y;
            const dd = Math.sqrt(dx * dx + dy * dy);
            const need = o.trueSize + n.trueSize;
            if (dd < need - EPS) {
              dist += need - dd + EPS;
              x = parent.x + dist * Math.cos(ang);
              y = parent.y + dist * Math.sin(ang);
              bumped = true;
            }
          }
        }
        n.x = x;
        n.y = y;
      }
      placedMainsGlobal.push(tag);
      for (const c of n.mainChildren) queue.push(c);
    }
  }

  // ── Phase 3e: translate sub offsets to global positions ──────────────
  for (const subTag of placedSubs) {
    const sub = tree.get(subTag)!;
    const parent = tree.get(sub.parent!)!;
    const off = parent.subOffsets.get(subTag)!;
    sub.x = parent.x + off.dist * Math.cos(off.angle);
    sub.y = parent.y + off.dist * Math.sin(off.angle);
  }

  // ── Emit ──────────────────────────────────────────────────────────────
  const emitOrder = [...placedMains, ...placedSubs];
  const tags: TagLayoutNode[] = emitOrder.map((tag) => {
    const n = tree.get(tag)!;
    const ns: string[] = [];
    if (n.parent) ns.push(n.parent);
    ns.push(...n.mainChildren);
    ns.push(...n.subChildren);
    return {
      tag,
      score: n.score,
      datumCount: n.datumCount,
      role: n.role,
      parent: n.parent,
      x: n.x,
      y: n.y,
      radius: sizeFor(n.score),
      neighbors: ns,
    };
  });

  const links: TagLayoutLink[] = [];
  for (const n of tree.values()) {
    if (n.parent) {
      links.push({
        source: n.parent,
        target: n.tag,
        weight: pairCount(n.parent, n.tag),
      });
    }
  }

  return { tags, links };
}
