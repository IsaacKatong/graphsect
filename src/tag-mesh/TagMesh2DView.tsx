import { useMemo, useRef, useState, useEffect, useCallback } from "react";
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
  // the cursor as the user drags.
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Under preserveAspectRatio="xMidYMid meet" the SVG is uniformly scaled
  // to fit inside its element, so 1 screen pixel covers 1/scale world units.
  const scale = useMemo(() => {
    if (size.w <= 0 || size.h <= 0 || baseView.w <= 0 || baseView.h <= 0) {
      return 1;
    }
    return Math.min(size.w / baseView.w, size.h / baseView.h);
  }, [size, baseView]);

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

  const viewBox = useMemo(() => {
    const x = baseView.x - pan.x;
    const y = baseView.y - pan.y;
    return `${x} ${y} ${baseView.w} ${baseView.h}`;
  }, [baseView, pan]);

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
          {layout.links.map((l, i) => {
            const a = linkMap.get(l.source);
            const b = linkMap.get(l.target);
            if (!a || !b) return null;
            return (
              <line
                key={`link-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeOpacity={0.7}
              />
            );
          })}
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
    </div>
  );
}
