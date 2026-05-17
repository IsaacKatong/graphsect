import { GraphView, GraphViewProps } from "../types";

export function createMockView(
  id: string,
  overrides: Partial<GraphView> = {},
): GraphView {
  return {
    id,
    name: id,
    minHeight: 100,
    Component: (props: GraphViewProps) => (
      <div data-testid={`view-${id}`}>
        view:{id} datums:{props.graph.datums.length}
      </div>
    ),
    ...overrides,
  };
}
