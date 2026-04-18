import { HierarchyNode } from "./types";

export function allGroupIds(roots: HierarchyNode[]): string[] {
  const ids: string[] = [];
  function walk(nodes: HierarchyNode[]) {
    for (const n of nodes) {
      if (n.kind === "group") {
        ids.push(n.id);
        walk(n.children);
      }
    }
  }
  walk(roots);
  return ids;
}

export function findGroup(
  roots: HierarchyNode[],
  id: string,
): HierarchyNode | null {
  for (const n of roots) {
    if (n.id === id) return n;
    if (n.kind === "group") {
      const found = findGroup(n.children, id);
      if (found) return found;
    }
  }
  return null;
}
