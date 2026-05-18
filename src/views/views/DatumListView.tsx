import { useMemo, useRef, type CSSProperties } from "react";
import { GraphViewProps } from "../types";

export default function DatumListView({
  graph,
  selectedDatumId,
  onSelectedDatumIdChange,
}: GraphViewProps) {
  // Each datum.id is assigned a random sort key the first time we see it
  // and keeps that key for the lifetime of this view instance. The list
  // order is therefore stable as filters add or remove datums: filtered
  // rows just disappear from their positions, and reappearing rows slot
  // back in where they were.
  const sortKeys = useRef<Map<string, number>>(new Map());

  const datums = useMemo(() => {
    const keys = sortKeys.current;
    for (const d of graph.datums) {
      if (!keys.has(d.id)) keys.set(d.id, Math.random());
    }
    return [...graph.datums].sort(
      (a, b) => (keys.get(a.id) ?? 0) - (keys.get(b.id) ?? 0),
    );
  }, [graph.datums]);

  return (
    <div style={containerStyle}>
      {datums.length === 0 ? (
        <div style={emptyStyle}>No datums.</div>
      ) : (
        <ul style={listStyle}>
          {datums.map((d) => {
            const selected = d.id === selectedDatumId;
            return (
              <li key={d.id} style={listItemStyle}>
                <button
                  onClick={() => onSelectedDatumIdChange(d.id)}
                  style={{
                    ...rowStyle,
                    ...(selected ? selectedRowStyle : null),
                  }}
                  title={d.name}
                >
                  <span style={nameStyle}>{d.name}</span>
                  <span style={typeStyle}>{d.type}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const containerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  padding: "12px 16px",
  overflowY: "auto",
  backgroundColor: "#0f172a",
  boxSizing: "border-box",
};

const emptyStyle: CSSProperties = {
  color: "#64748b",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
};

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const listItemStyle: CSSProperties = {
  display: "block",
};

const rowStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 12px",
  background: "#1e293b",
  color: "#e2e8f0",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#334155",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  fontSize: 14,
  textAlign: "left",
  boxSizing: "border-box",
};

const selectedRowStyle: CSSProperties = {
  background: "#4f46e5",
  borderColor: "#6366f1",
  color: "#ffffff",
};

const nameStyle: CSSProperties = {
  flex: "1 1 auto",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const typeStyle: CSSProperties = {
  flex: "0 0 auto",
  fontSize: 12,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
