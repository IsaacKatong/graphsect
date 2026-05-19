import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GraphView } from "./types";
import { clampDragHeight } from "./resize";
import { useTrackedState } from "../action-log/useTrackedState";

const DEFAULT_MIN_HEIGHT = 200;

type ResizableViewStackProps = {
  views: GraphView[];
  renderView: (view: GraphView) => ReactNode;
};

export default function ResizableViewStack({
  views,
  renderView,
}: ResizableViewStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  // Drags are continuous (mousemove per pixel), so debounce to one action
  // per gesture. The third tuple slot, `seedHeights`, updates without
  // recording — used by the init effect that seeds new views' starting
  // heights so initialization doesn't show up in undo.
  const [heights, setHeights, seedHeights] = useTrackedState<
    Record<string, number>
  >("view-stack", "heights", {}, { debounce: true });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerHeight(e.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initialize each non-last view to its declared minHeight. The last view is
  // flex:1, so it absorbs whatever space the non-last views haven't claimed —
  // this means a heavy visualization placed last gets the bulk of the space by
  // default, while compact views like a filter row sit at their minimum.
  useEffect(() => {
    if (views.length === 0) return;
    seedHeights((prev) => {
      const nonLast = views.slice(0, -1);
      const unsized = nonLast.filter((v) => prev[v.id] === undefined);
      if (unsized.length === 0) return prev;
      const next = { ...prev };
      for (const v of unsized) {
        next[v.id] = v.minHeight ?? DEFAULT_MIN_HEIGHT;
      }
      return next;
    });
  }, [views, seedHeights]);

  const startResize = useCallback(
    (viewAboveId: string, minH: number, e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = heights[viewAboveId] ?? minH;
      setDraggingId(viewAboveId);

      const onMove = (ev: MouseEvent) => {
        const next = clampDragHeight(startH, ev.clientY - startY, minH);
        setHeights((prev) => ({ ...prev, [viewAboveId]: next }));
      };
      const onUp = () => {
        setDraggingId(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [heights],
  );

  return (
    <div ref={containerRef} style={containerStyle}>
      {views.map((view, i) => {
        const isLast = i === views.length - 1;
        const minH = view.minHeight ?? DEFAULT_MIN_HEIGHT;
        const h = heights[view.id] ?? minH;
        const flex = isLast ? "1 1 0" : `0 0 ${h}px`;
        const isDragging = draggingId === view.id;
        return (
          <Fragment key={view.id}>
            <div
              style={{
                flex,
                minHeight: minH,
                position: "relative",
                width: "100%",
              }}
            >
              {renderView(view)}
            </div>
            {!isLast && (
              <div
                onMouseDown={(e) => startResize(view.id, minH, e)}
                style={{
                  ...handleStyle,
                  background: isDragging ? "#6366f1" : "#1e293b",
                }}
                title="Drag to resize"
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: 0,
};

const handleStyle: React.CSSProperties = {
  flex: "0 0 6px",
  cursor: "row-resize",
  borderTop: "1px solid #334155",
  borderBottom: "1px solid #334155",
  transition: "background 0.1s ease",
};
