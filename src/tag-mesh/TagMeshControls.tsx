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
  return (
    <label style={rowStyle}>
      <div style={labelRowStyle}>
        <span style={labelStyle}>{label}</span>
        <span style={valueStyle}>{display}</span>
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
  return (
    <div style={panelStyle}>
      <div style={titleStyle}>Tag Mesh</div>
      <SliderRow
        label="Tags around one tag"
        value={params.maxNeighbors}
        min={2}
        max={12}
        step={1}
        onChange={(v) => onChange({ ...params, maxNeighbors: v })}
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
        label="Distance between tags"
        value={params.distance}
        min={60}
        max={600}
        step={10}
        onChange={(v) => onChange({ ...params, distance: v })}
      />
      <SliderRow
        label="Distance scaling by connections"
        value={params.connectionDistanceGain}
        min={0}
        max={1000}
        step={1}
        format={(v) => v.toFixed(0)}
        onChange={(v) => onChange({ ...params, connectionDistanceGain: v })}
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
  alignItems: "baseline",
  marginBottom: "4px",
};

const labelStyle: React.CSSProperties = {
  color: "#cbd5e1",
};

const valueStyle: React.CSSProperties = {
  color: "#f8fafc",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 500,
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
  accentColor: "#6366f1",
};
