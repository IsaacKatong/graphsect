import { useState, useRef, useEffect, useMemo } from "react";
import { ExternalGraph } from "../external-graph/types";

const MAX_DIMENSIONS = 3;

type DimensionSelectorProps = {
  graph: ExternalGraph;
  selected: string[];
  onSelectionChange: (dimensions: string[]) => void;
  showEdges: boolean;
  onShowEdgesChange: (showEdges: boolean) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function DimensionSelector({
  graph,
  selected,
  onSelectionChange,
  showEdges,
  onShowEdgesChange,
  open: openProp,
  onOpenChange,
}: DimensionSelectorProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;
  const containerRef = useRef<HTMLDivElement>(null);

  const availableDimensions = useMemo(() => {
    const names = new Set<string>();
    for (const dim of graph.datumDimensions) {
      names.add(dim.name);
    }
    return [...names].sort();
  }, [graph]);

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

  function toggleDimension(name: string) {
    if (selected.includes(name)) {
      onSelectionChange(selected.filter((d) => d !== name));
    } else if (selected.length < MAX_DIMENSIONS) {
      onSelectionChange([...selected, name]);
    }
  }

  const activeCount = selected.length;

  return (
    <div ref={containerRef} style={containerStyle}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...buttonStyle,
          ...(activeCount > 0 ? activeButtonStyle : {}),
        }}
      >
        Plot Axes
        {activeCount > 0 && <span style={badgeStyle}>{activeCount}</span>}
      </button>
      {open && availableDimensions.length > 0 && (
        <div style={dropdownStyle}>
          <div style={headerStyle}>
            Select up to {MAX_DIMENSIONS} dimensions
          </div>
          {availableDimensions.map((name) => {
            const isSelected = selected.includes(name);
            const isDisabled = !isSelected && selected.length >= MAX_DIMENSIONS;
            return (
              <label
                key={name}
                style={{
                  ...optionStyle,
                  ...(isDisabled ? disabledOptionStyle : {}),
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggleDimension(name)}
                  style={checkboxStyle}
                />
                {name}
              </label>
            );
          })}
          {selected.length > 0 && (
            <>
              <div style={dividerStyle} />
              <label style={optionStyle}>
                <input
                  type="checkbox"
                  checked={showEdges}
                  onChange={() => onShowEdgesChange(!showEdges)}
                  style={checkboxStyle}
                />
                Show edges
              </label>
              <button
                onClick={() => onSelectionChange([])}
                style={clearStyle}
              >
                Clear
              </button>
            </>
          )}
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

const headerStyle: React.CSSProperties = {
  padding: "4px 12px 8px",
  fontSize: "11px",
  color: "#94a3b8",
  fontFamily: "system-ui, sans-serif",
  borderBottom: "1px solid #334155",
  marginBottom: "4px",
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

const disabledOptionStyle: React.CSSProperties = {
  opacity: 0.4,
  cursor: "not-allowed",
};

const checkboxStyle: React.CSSProperties = {
  accentColor: "#6366f1",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #334155",
  margin: "4px 0",
};

const clearStyle: React.CSSProperties = {
  display: "block",
  width: "calc(100% - 16px)",
  margin: "6px 8px 4px",
  padding: "4px 0",
  backgroundColor: "transparent",
  color: "#94a3b8",
  border: "1px solid #475569",
  borderRadius: "4px",
  fontSize: "12px",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};
