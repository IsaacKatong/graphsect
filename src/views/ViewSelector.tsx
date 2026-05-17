import { useEffect, useRef, useState } from "react";
import { GraphView } from "./types";

type ViewSelectorProps = {
  views: GraphView[];
  activeIds: string[];
  onActiveIdsChange: (next: string[]) => void;
};

export default function ViewSelector({
  views,
  activeIds,
  onActiveIdsChange,
}: ViewSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle(id: string) {
    if (activeIds.includes(id)) {
      onActiveIdsChange(activeIds.filter((x) => x !== id));
    } else {
      // Preserve registry order so the stack render order is stable.
      const next = views
        .filter((v) => v.id === id || activeIds.includes(v.id))
        .map((v) => v.id);
      onActiveIdsChange(next);
    }
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...buttonStyle,
          ...(activeIds.length > 0 ? activeButtonStyle : {}),
        }}
      >
        Views
        {activeIds.length > 0 && (
          <span style={badgeStyle}>{activeIds.length}</span>
        )}
      </button>
      {open && (
        <div style={dropdownStyle}>
          {views.map((view) => (
            <label key={view.id} style={optionStyle}>
              <input
                type="checkbox"
                checked={activeIds.includes(view.id)}
                onChange={() => toggle(view.id)}
                style={checkboxStyle}
              />
              {view.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
  pointerEvents: "auto",
  flexShrink: 0,
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#334155",
  color: "#e2e8f0",
  border: "1px solid #475569",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const activeButtonStyle: React.CSSProperties = {
  backgroundColor: "#4f46e5",
  borderColor: "#6366f1",
};

const badgeStyle: React.CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  borderRadius: "10px",
  padding: "0 6px",
  fontSize: "11px",
  fontWeight: 600,
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: "4px",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "6px",
  padding: "6px 0",
  minWidth: "200px",
  maxHeight: "280px",
  overflowY: "auto",
  zIndex: 100,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
};

const optionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 12px",
  fontSize: "13px",
  color: "#e2e8f0",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const checkboxStyle: React.CSSProperties = {
  accentColor: "#6366f1",
};
