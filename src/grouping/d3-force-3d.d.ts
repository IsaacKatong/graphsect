declare module "d3-force-3d" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Node = any;
  interface Simulation {
    force(name: string, force: unknown): Simulation;
    alphaDecay(v: number): Simulation;
    stop(): Simulation;
    tick(n?: number): Simulation;
    nodes(): Node[];
  }
  export function forceSimulation(nodes: Node[], dimensions?: number): Simulation;
  export function forceManyBody(): { strength(v: number | ((d: Node) => number)): unknown };
  export function forceCollide(
    radius: number | ((d: Node) => number),
  ): { strength(v: number): unknown; iterations(n: number): unknown };
  export function forceCenter(
    x?: number,
    y?: number,
    z?: number,
  ): { strength(v: number): unknown };
}
