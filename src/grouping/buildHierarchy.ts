import { ForceGraphNode } from "../external-graph/transformGraph";
import {
  HierarchyNode,
  GroupNode,
  LeafNode,
  UNTAGGED_LABEL,
} from "./types";

function makeLeaf(datum: ForceGraphNode): LeafNode {
  return { kind: "leaf", id: datum.id, datumId: datum.id, datum };
}

function sameTagSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const bSet = new Set(b);
  for (const t of a) if (!bSet.has(t)) return false;
  return true;
}

function allSameRemainingTags(
  datums: ForceGraphNode[],
  excluded: Set<string>,
): boolean {
  const remaining = (d: ForceGraphNode) =>
    d.tags.filter((t) => !excluded.has(t));
  const first = remaining(datums[0]);
  for (let i = 1; i < datums.length; i++) {
    if (!sameTagSet(first, remaining(datums[i]))) return false;
  }
  return true;
}

function partitionOnce(
  datums: ForceGraphNode[],
  excluded: Set<string>,
): { tag: string; datums: ForceGraphNode[] }[] {
  const groups: { tag: string; datums: ForceGraphNode[] }[] = [];
  let pool = datums.slice();
  const untagged: ForceGraphNode[] = [];

  while (pool.length > 0) {
    const counts = new Map<string, number>();
    for (const d of pool) {
      for (const t of d.tags) {
        if (excluded.has(t)) continue;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }

    if (counts.size === 0) {
      untagged.push(...pool);
      pool = [];
      break;
    }

    let maxCount = 0;
    for (const c of counts.values()) if (c > maxCount) maxCount = c;
    const candidates: string[] = [];
    for (const [t, c] of counts) if (c === maxCount) candidates.push(t);
    candidates.sort();
    const chosen = candidates[0];

    const inGroup = pool.filter((d) => d.tags.includes(chosen));
    groups.push({ tag: chosen, datums: inGroup });
    pool = pool.filter((d) => !d.tags.includes(chosen));
  }

  if (untagged.length > 0) groups.push({ tag: UNTAGGED_LABEL, datums: untagged });
  return groups;
}

function buildRecursive(
  datums: ForceGraphNode[],
  path: string[],
  excluded: Set<string>,
): HierarchyNode[] {
  if (datums.length === 1) return [makeLeaf(datums[0])];
  if (allSameRemainingTags(datums, excluded))
    return datums.map(makeLeaf);

  const partitions = partitionOnce(datums, excluded);
  return partitions.map(({ tag, datums: groupDatums }): HierarchyNode => {
    if (groupDatums.length === 1) return makeLeaf(groupDatums[0]);

    const nextPath = [...path, tag];
    const nextExcluded = new Set(excluded);
    if (tag !== UNTAGGED_LABEL) nextExcluded.add(tag);

    const children =
      tag === UNTAGGED_LABEL
        ? groupDatums.map(makeLeaf)
        : buildRecursive(groupDatums, nextPath, nextExcluded);

    const group: GroupNode = {
      kind: "group",
      id: nextPath.join("/"),
      tag,
      path: nextPath,
      datumIds: groupDatums.map((d) => d.id),
      children,
    };
    return group;
  });
}

export function buildHierarchy(datums: ForceGraphNode[]): HierarchyNode[] {
  if (datums.length === 0) return [];
  return buildRecursive(datums, [], new Set());
}
