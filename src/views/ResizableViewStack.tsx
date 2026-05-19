import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GraphView, ViewInstance } from "./types";
import { clampDragHeight } from "./resize";
import { useTrackedState } from "../action-log/useTrackedState";
import { useViewSelector } from "./ViewSelectorContext";

const DEFAULT_MIN_HEIGHT = 200;

export type StackEntry = { instance: ViewInstance; view: GraphView };

type ResizableViewStackProps = {
  entries: StackEntry[];
  renderView: (entry: StackEntry) => ReactNode;
};

export default function ResizableViewStack({
  entries,
  renderView,
}: ResizableViewStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setContainerHeight] = useState(0);
  // Drags are continuous (mousemove per pixel), so debounce to one action
  // per gesture. The third tuple slot, `seedHeights`, updates without
  // recording — used by the init effect that seeds new instances' starting
  // heights so initialization doesn't show up in undo.
  const [heights, setHeights, seedHeights] = useTrackedState<
    Record<string, number>
  >("view-stack", "heights", {}, { debounce: true });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const selector = useViewSelector();
  const pinnedInstanceId = selector?.pinnedInstanceId;
  const onClose = selector?.onClose;

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

  // Initialize each non-last instance to its declared minHeight. The last
  // instance is flex:1, so it absorbs whatever space the non-last instances
  // haven't claimed. Heights are keyed by INSTANCE id, so two instances of
  // the same view type get independent heights.
  useEffect(() => {
    if (entries.length === 0) return;
    seedHeights((prev) => {
      const nonLast = entries.slice(0, -1);
      const unsized = nonLast.filter((e) => prev[e.instance.id] === undefined);
      if (unsized.length === 0) return prev;
      const next = { ...prev };
      for (const e of unsized) {
        next[e.instance.id] = e.view.minHeight ?? DEFAULT_MIN_HEIGHT;
      }
      return next;
    });
  }, [entries, seedHeights]);

  const startResize = useCallback(
    (instanceId: string, minH: number, e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = heights[instanceId] ?? minH;
      setDraggingId(instanceId);

      const onMove = (ev: MouseEvent) => {
        const next = clampDragHeight(startH, ev.clientY - startY, minH);
        setHeights((prev) => ({ ...prev, [instanceId]: next }));
      };
      const onUp = () => {
        setDraggingId(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [heights, setHeights],
  );

  return (
    <div ref={containerRef} style={containerStyle}>
      {entries.map((entry, i) => {
        const { instance, view } = entry;
        const isLast = i === entries.length - 1;
        const minH = view.minHeight ?? DEFAULT_MIN_HEIGHT;
        const h = heights[instance.id] ?? minH;
        const flex = isLast ? "1 1 0" : `0 0 ${h}px`;
        const isDragging = draggingId === instance.id;
        const isPinned = instance.id === pinnedInstanceId;
        return (
          <Fragment key={instance.id}>
            <div
              data-testid={`view-instance-${instance.id}`}
              style={{
                flex,
                minHeight: minH,
                position: "relative",
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {!isPinned && (
                <div style={headerStyle}>
                  <span style={headerNameStyle}>{view.name}</span>
                  {onClose && (
                    <button
                      onClick={() => onClose(instance.id)}
                      title="Close view"
                      style={closeButtonStyle}
                      data-testid={`close-${instance.id}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <div style={bodyStyle}>{renderView(entry)}</div>
            </div>
            {!isLast && (
              <div
                onMouseDown={(e) => startResize(instance.id, minH, e)}
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

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "4px 12px",
  backgroundColor: "#1e293b",
  borderBottom: "1px solid #334155",
  fontFamily: "system-ui, sans-serif",
  fontSize: 12,
  color: "#94a3b8",
  flexShrink: 0,
};

const headerNameStyle: React.CSSProperties = {
  fontWeight: 600,
};

const closeButtonStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "#94a3b8",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#475569",
  borderRadius: 4,
  width: 20,
  height: 20,
  lineHeight: "16px",
  textAlign: "center",
  fontSize: 14,
  cursor: "pointer",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

const bodyStyle: React.CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  position: "relative",
  width: "100%",
};
