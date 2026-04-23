import { useEffect, useState } from "react";
import { TagMeshParams } from "./buildTagMeshLayout";

type TagMeshControlsProps = {
  params: TagMeshParams;
  onChange: (next: TagMeshParams) => void;
};

type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderRowProps) {
  const display = format ? format(value) : String(value);
  const [draft, setDraft] = useState(display);

  useEffect(() => {
    setDraft(display);
  }, [display]);

  function commit(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(display);
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
  }

  return (
    <label style={rowStyle}>
      <div style={labelRowStyle}>
        <span style={labelStyle}>{label}</span>
        <input
          type="number"
          value={draft}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            }
          }}
          style={numberInputStyle}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={sliderStyle}
      />
    </label>
  );
}

export default function TagMeshControls({
  params,
  onChange,
}: TagMeshControlsProps) {
  const X = params.mainNeighbors;

  function snapY(y: number, xAxis: number) {
    if (xAxis <= 0) return 0;
    return xAxis * Math.max(0, Math.round(y / xAxis));
  }

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>Tag Mesh</div>
      <SliderRow
        label="Main tags around a tag"
        value={params.mainNeighbors}
        min={2}
        max={10}
        step={1}
        onChange={(v) => {
          const newX = Math.max(2, Math.round(v));
          onChange({
            ...params,
            mainNeighbors: newX,
            subNeighbors: snapY(params.subNeighbors, newX),
          });
        }}
      />
      <SliderRow
        label="Sub tags per main"
        value={params.subNeighbors}
        min={0}
        max={40}
        step={Math.max(1, X)}
        onChange={(v) => onChange({ ...params, subNeighbors: snapY(v, X) })}
      />
      <SliderRow
        label="Tag size scale"
        value={params.sizeScale}
        min={0}
        max={30}
        step={0.5}
        format={(v) => v.toFixed(1)}
        onChange={(v) => onChange({ ...params, sizeScale: v })}
      />
      <SliderRow
        label="Min distance (D)"
        value={params.distance}
        min={0}
        max={600}
        step={10}
        onChange={(v) => onChange({ ...params, distance: v })}
      />
      <SliderRow
        label="Hierarchy distance (A)"
        value={params.hierarchyDistance}
        min={0}
        max={1000}
        step={1}
        format={(v) => v.toFixed(0)}
        onChange={(v) => onChange({ ...params, hierarchyDistance: v })}
      />
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "12px",
  right: "12px",
  width: "260px",
  backgroundColor: "rgba(30, 41, 59, 0.92)",
  color: "#e2e8f0",
  border: "1px solid #475569",
  borderRadius: "8px",
  padding: "12px 14px",
  fontFamily: "system-ui, sans-serif",
  fontSize: "12px",
  pointerEvents: "auto",
  zIndex: 60,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  marginBottom: "10px",
  letterSpacing: "0.02em",
};

const rowStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "10px",
};

const labelRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  marginBottom: "4px",
};

const labelStyle: React.CSSProperties = {
  color: "#cbd5e1",
};

const numberInputStyle: React.CSSProperties = {
  width: "72px",
  padding: "2px 6px",
  backgroundColor: "#0f172a",
  color: "#f8fafc",
  border: "1px solid #475569",
  borderRadius: "4px",
  fontFamily: "inherit",
  fontSize: "12px",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 500,
  textAlign: "right",
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
  accentColor: "#6366f1",
};
