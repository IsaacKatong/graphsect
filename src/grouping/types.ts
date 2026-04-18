import { ForceGraphNode } from "../external-graph/transformGraph";

export type GroupNode = {
  kind: "group";
  id: string;
  tag: string;
  path: string[];
  datumIds: string[];
  children: HierarchyNode[];
};

export type LeafNode = {
  kind: "leaf";
  id: string;
  datumId: string;
  datum: ForceGraphNode;
};

export type HierarchyNode = GroupNode | LeafNode;

export type GroupedGraphNode = {
  id: string;
  name: string;
  kind: "group" | "leaf" | "ghost";
  count: number;
  depth: number;
  hasChildren: boolean;
  leafDatum?: ForceGraphNode;
  fx: number;
  fy: number;
  fz: number;
  radius: number;
  ghostOfId?: string;
};

export type GroupedGraphLink = {
  source: string;
  target: string;
  tags: string[];
  curveRotation: number;
};

export type GroupedGraphData = {
  nodes: GroupedGraphNode[];
  links: GroupedGraphLink[];
};

export const UNTAGGED_LABEL = "(untagged)";
