import { describe, it, expect } from "vitest";
import { transformGraph } from "../../external-graph/transformGraph";
import { ExternalGraph } from "../../external-graph/types";
import { buildTagMeshLayout, TagMeshParams } from "../buildTagMeshLayout";
import advancedGraph from "../../../examples/advanced-graph.json";

function distPointToSegment(
  ox: number,
  oy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-9) return Math.hypot(ox - ax, oy - ay);
  let t = ((ox - ax) * dx + (oy - ay) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return Math.hypot(ox - (ax + t * dx), oy - (ay + t * dy));
}

type Issue = {
  kind: string;
  deficit: number;
  detail: string;
};

function collectCollisions(
  graph: ExternalGraph,
  params: TagMeshParams,
  tolerance = 0.5,
): Issue[] {
  const data = transformGraph(graph);
  const layout = buildTagMeshLayout(data, params);
  const byTag = new Map(layout.tags.map((t) => [t.tag, t]));
  const mains = layout.tags.filter((t) => t.role === "main");
  const subs = layout.tags.filter((t) => t.role === "sub");
  const D = params.distance;
  const issues: Issue[] = [];

  for (let i = 0; i < mains.length; i++) {
    for (let j = i + 1; j < mains.length; j++) {
      const a = mains[i];
      const b = mains[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const need = a.radius + b.radius + D;
      if (d < need - tolerance) {
        issues.push({
          kind: "main-main",
          deficit: need - d,
          detail: `${a.tag} ↔ ${b.tag}: d=${d.toFixed(1)} need≥${need.toFixed(1)}`,
        });
      }
    }
  }

  for (const link of layout.links) {
    const src = byTag.get(link.source);
    const tgt = byTag.get(link.target);
    if (!src || !tgt) continue;
    if (src.role !== "main" || tgt.role !== "main") continue;
    for (const other of mains) {
      if (other.tag === src.tag || other.tag === tgt.tag) continue;
      const d = distPointToSegment(
        other.x,
        other.y,
        src.x,
        src.y,
        tgt.x,
        tgt.y,
      );
      const need = other.radius + D;
      if (d < need - tolerance) {
        issues.push({
          kind: "link-crosses-main",
          deficit: need - d,
          detail: `${src.tag}→${tgt.tag} crosses ${other.tag}: d=${d.toFixed(1)} need≥${need.toFixed(1)}`,
        });
      }
    }
  }

  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const a = subs[i];
      const b = subs[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const need = a.radius + b.radius + D;
      if (d < need - tolerance) {
        issues.push({
          kind: "sub-sub",
          deficit: need - d,
          detail: `${a.tag}(${a.parent}) ↔ ${b.tag}(${b.parent}): d=${d.toFixed(1)} need≥${need.toFixed(1)}`,
        });
      }
    }
  }

  for (const s of subs) {
    for (const m of mains) {
      if (m.tag === s.parent) continue;
      const d = Math.hypot(s.x - m.x, s.y - m.y);
      const need = s.radius + m.radius + D;
      if (d < need - tolerance) {
        issues.push({
          kind: "sub-main",
          deficit: need - d,
          detail: `${s.tag}(${s.parent}) ↔ ${m.tag}: d=${d.toFixed(1)} need≥${need.toFixed(1)}`,
        });
      }
    }
  }

  return issues.sort((a, b) => b.deficit - a.deficit);
}

describe("tag-mesh layout collisions (advanced graph)", () => {
  const BASE: TagMeshParams = {
    mainNeighbors: 6,
    subNeighbors: 12,
    sizeScale: 10,
    distance: 40,
    hierarchyDistance: 100,
  };

  const cases: Array<[string, TagMeshParams]> = [
    ["default X=6, Y=12", BASE],
    ["X=4, Y=8", { ...BASE, mainNeighbors: 4, subNeighbors: 8 }],
    ["X=8, Y=16", { ...BASE, mainNeighbors: 8, subNeighbors: 16 }],
    ["no subs (Y=0)", { ...BASE, subNeighbors: 0 }],
    ["tight D=20", { ...BASE, distance: 20 }],
  ];

  for (const [label, params] of cases) {
    it(`has no geometric collisions: ${label}`, () => {
      const issues = collectCollisions(
        advancedGraph as unknown as ExternalGraph,
        params,
      );
      if (issues.length > 0) {
        const countsByKind = new Map<string, number>();
        for (const i of issues)
          countsByKind.set(i.kind, (countsByKind.get(i.kind) ?? 0) + 1);
        const summary = [...countsByKind.entries()]
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        const preview = issues
          .slice(0, 10)
          .map((i) => `[${i.kind}] ${i.detail}`);
        throw new Error(
          `Found ${issues.length} collisions (${summary}). Top offenders:\n${preview.join("\n")}`,
        );
      }
      expect(issues).toHaveLength(0);
    });
  }
});
