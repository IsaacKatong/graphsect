import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
  type ReactElement,
} from "react";
import { ForceGraphData } from "../external-graph/transformGraph";
import {
  buildTagMeshLayout,
  TagMeshParams,
} from "./buildTagMeshLayout";

type TagMesh2DViewProps = {
  data: ForceGraphData;
  params: TagMeshParams;
};

const PADDING = 40;

// Root (orphan main) → red, non-root main → green, sub → yellow.
const COLOR_ROOT = "#ef4444";
const COLOR_MAIN = "#22c55e";
const COLOR_SUB = "#eab308";

function colorForNode(role: "main" | "sub", parent: string | null): string {
  if (role === "sub") return COLOR_SUB;
  return parent === null ? COLOR_ROOT : COLOR_MAIN;
}

export default function TagMesh2DView({ data, params }: TagMesh2DViewProps) {
  const layout = useMemo(() => buildTagMeshLayout(data, params), [data, params]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setSize({ w: Math.max(100, width), h: Math.max(100, height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bounds = useMemo(() => {
    if (layout.tags.length === 0) {
      return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const t of layout.tags) {
      minX = Math.min(minX, t.x - t.radius);
      minY = Math.min(minY, t.y - t.radius);
      maxX = Math.max(maxX, t.x + t.radius);
      maxY = Math.max(maxY, t.y + t.radius);
    }
    return { minX, minY, maxX, maxY };
  }, [layout]);

  // Base (unpanned) viewBox rectangle in world coordinates.
  const baseView = useMemo(() => {
    const w = bounds.maxX - bounds.minX + PADDING * 2;
    const h = bounds.maxY - bounds.minY + PADDING * 2;
    return { x: bounds.minX - PADDING, y: bounds.minY - PADDING, w, h };
  }, [bounds]);

  const linkMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const t of layout.tags) m.set(t.tag, { x: t.x, y: t.y });
    return m;
  }, [layout.tags]);

  // Pan is in world units; shifts the viewBox origin so the scene follows
  // the cursor as the user drags. Zoom scales the viewBox around its center.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 20;

  // Effective viewBox (zoomed + panned) in world coordinates. Zooming shrinks
  // the viewBox around baseView's center; pan shifts it.
  const view = useMemo(() => {
    const w = baseView.w / zoom;
    const h = baseView.h / zoom;
    const x = baseView.x + (baseView.w - w) / 2 - pan.x;
    const y = baseView.y + (baseView.h - h) / 2 - pan.y;
    return { x, y, w, h };
  }, [baseView, zoom, pan]);

  // Under preserveAspectRatio="xMidYMid meet" the SVG is uniformly scaled
  // to fit the viewBox inside its element, so 1 screen pixel covers 1/scale
  // world units. Grows with zoom.
  const scale = useMemo(() => {
    if (size.w <= 0 || size.h <= 0 || view.w <= 0 || view.h <= 0) return 1;
    return Math.min(size.w / view.w, size.h / view.h);
  }, [size, view]);

  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return; // left click only
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const basePan = pan;
      const s = scale > 0 ? scale : 1;
      setIsDragging(true);

      const onMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startX) / s;
        const dy = (ev.clientY - startY) / s;
        setPan({ x: basePan.x + dx, y: basePan.y + dy });
      };
      const onUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [pan, scale],
  );

  const viewBox = useMemo(
    () => `${view.x} ${view.y} ${view.w} ${view.h}`,
    [view],
  );

  // Wheel zoom with cursor as the pivot point. React's onWheel is passive by
  // default, so we attach a native listener with { passive: false } to be
  // able to preventDefault. The handler reads the latest state via refs so
  // we don't rebind on every pan/zoom change.
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  const baseViewRef = useRef(baseView);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  useEffect(() => {
    baseViewRef.current = baseView;
  }, [baseView]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const v = viewRef.current;
      const sz = sizeRef.current;
      const bv = baseViewRef.current;
      const z = zoomRef.current;

      if (sz.w <= 0 || sz.h <= 0 || v.w <= 0 || v.h <= 0) return;

      // World point under the cursor, accounting for xMidYMid-meet padding.
      const s = Math.min(sz.w / v.w, sz.h / v.h);
      const actualW = v.w * s;
      const actualH = v.h * s;
      const mx = (sz.w - actualW) / 2;
      const my = (sz.h - actualH) / 2;
      const worldCx = v.x + (cx - mx) / s;
      const worldCy = v.y + (cy - my) / s;

      // Exponential zoom so each notch feels consistent regardless of level.
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor));
      if (newZoom === z) return;

      // Solve for new pan such that (worldCx, worldCy) stays under the cursor.
      const vwNew = bv.w / newZoom;
      const vhNew = bv.h / newZoom;
      const sNew = Math.min(sz.w / vwNew, sz.h / vhNew);
      const mxNew = (sz.w - vwNew * sNew) / 2;
      const myNew = (sz.h - vhNew * sNew) / 2;
      const vxNew = worldCx - (cx - mxNew) / sNew;
      const vyNew = worldCy - (cy - myNew) / sNew;
      const panX = bv.x + (bv.w - vwNew) / 2 - vxNew;
      const panY = bv.y + (bv.h - vhNew) / 2 - vyNew;

      setZoom(newZoom);
      setPan({ x: panX, y: panY });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const [hovered, setHovered] = useState<string | null>(null);

  const onNodeEnter = useCallback(
    (tag: string) => {
      // Suppress hover while dragging so the highlight doesn't flicker on
      // every node the cursor passes over mid-pan.
      if (!isDragging) setHovered(tag);
    },
    [isDragging],
  );
  const onNodeLeave = useCallback(() => setHovered(null), []);

  const stepZoom = useCallback((factor: number) => {
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#0f172a",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
    >
      <svg
        width={size.w}
        height={size.h}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        <g>
          {/* Render non-incident edges first, then incident ones on top so
              the highlight isn't overdrawn by later non-incident lines. */}
          {(() => {
            const base: ReactElement[] = [];
            const hi: ReactElement[] = [];
            layout.links.forEach((l, i) => {
              const a = linkMap.get(l.source);
              const b = linkMap.get(l.target);
              if (!a || !b) return;
              const incident =
                hovered !== null &&
                (l.source === hovered || l.target === hovered);
              const el = (
                <line
                  key={`link-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={incident ? "#f8fafc" : "#64748b"}
                  strokeWidth={incident ? 3 : 1.5}
                  strokeOpacity={
                    hovered === null ? 0.7 : incident ? 0.95 : 0.2
                  }
                />
              );
              (incident ? hi : base).push(el);
            });
            return [...base, ...hi];
          })()}
        </g>
        <g>
          {layout.tags.map((t) => {
            const isHover = hovered === t.tag;
            const isSub = t.role === "sub";
            const baseOpacity = isSub ? 0.45 : 0.75;
            const hoverOpacity = isSub ? 0.75 : 0.95;
            return (
              <g
                key={t.tag}
                onMouseEnter={() => onNodeEnter(t.tag)}
                onMouseLeave={onNodeLeave}
              >
                <circle
                  cx={t.x}
                  cy={t.y}
                  r={t.radius}
                  fill={colorForNode(t.role, t.parent)}
                  fillOpacity={isHover ? hoverOpacity : baseOpacity}
                  stroke={
                    isHover ? "#f8fafc" : isSub ? "#334155" : "#1e293b"
                  }
                  strokeWidth={isHover ? 2 : 1}
                  strokeDasharray={isSub ? "3 2" : undefined}
                />
                <text
                  x={t.x}
                  y={t.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(10, Math.min(t.radius * 0.5, 18))}
                  fill="#0f172a"
                  fontFamily="system-ui, sans-serif"
                  fontWeight={600}
                  pointerEvents="none"
                >
                  {t.tag}
                </text>
                <text
                  x={t.x}
                  y={t.y + Math.max(10, Math.min(t.radius * 0.5, 18)) * 0.9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.max(8, Math.min(t.radius * 0.35, 12))}
                  fill="#0f172a"
                  fontFamily="system-ui, sans-serif"
                  pointerEvents="none"
                  opacity={0.7}
                >
                  {t.datumCount}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid #334155",
          borderRadius: 6,
          padding: 4,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => stepZoom(1.25)}
          title="Zoom in"
          style={zoomBtnStyle}
        >
          +
        </button>
        <button
          onClick={() => stepZoom(1 / 1.25)}
          title="Zoom out"
          style={zoomBtnStyle}
        >
          −
        </button>
        <button
          onClick={resetView}
          title="Reset view to fit"
          style={{ ...zoomBtnStyle, fontSize: 10 }}
        >
          Reset
        </button>
        <div style={zoomReadoutStyle}>{Math.round(zoom * 100)}%</div>
      </div>
    </div>
  );
}

const zoomReadoutStyle: CSSProperties = {
  width: 28,
  height: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  fontFamily: "system-ui, sans-serif",
  fontSize: 9,
  lineHeight: 1,
  userSelect: "none",
};

const zoomBtnStyle: CSSProperties = {
  width: 28,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1e293b",
  color: "#e2e8f0",
  border: "1px solid #475569",
  borderRadius: 4,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
};
