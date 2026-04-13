import { useState, useRef, useEffect } from "react";
import { DimensionValuesFilter } from "../filtering/types";

type DimensionRangeFilterProps = {
  availableDimensions: { name: string; min: number; max: number }[];
  filter: DimensionValuesFilter | null;
  onFilterChange: (filter: DimensionValuesFilter | null) => void;
};

export default function DimensionRangeFilter({
  availableDimensions,
  filter,
  onFilterChange,
}: DimensionRangeFilterProps) {
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

  const activeCount = filter?.ranges.length ?? 0;

  function updateRange(
    dimensionName: string,
    field: "min" | "max",
    value: number,
  ) {
    const existingRanges = filter?.ranges ?? [];
    const existing = existingRanges.find(
      (r) => r.dimensionName === dimensionName,
    );
    const dimInfo = availableDimensions.find((d) => d.name === dimensionName);
    if (!dimInfo) return;

    let updatedRange;
    if (existing) {
      updatedRange = { ...existing, [field]: value };
    } else {
      updatedRange = {
        dimensionName,
        min: field === "min" ? value : dimInfo.min,
        max: field === "max" ? value : dimInfo.max,
      };
    }

    const newRanges = existing
      ? existingRanges.map((r) =>
          r.dimensionName === dimensionName ? updatedRange : r,
        )
      : [...existingRanges, updatedRange];

    onFilterChange({ ranges: newRanges });
  }

  function removeRange(dimensionName: string) {
    const newRanges = (filter?.ranges ?? []).filter(
      (r) => r.dimensionName !== dimensionName,
    );
    onFilterChange(newRanges.length > 0 ? { ranges: newRanges } : null);
  }

  function getRange(dimensionName: string) {
    return filter?.ranges.find((r) => r.dimensionName === dimensionName);
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...buttonStyle,
          ...(activeCount > 0 ? activeButtonStyle : {}),
        }}
      >
        Dimensions
        {activeCount > 0 && <span style={badgeStyle}>{activeCount}</span>}
      </button>
      {open && availableDimensions.length > 0 && (
        <div style={dropdownStyle}>
          {availableDimensions.map((dim) => {
            const range = getRange(dim.name);
            const isActive = !!range;
            return (
              <div key={dim.name} style={dimensionRowStyle}>
                <div style={dimensionHeaderStyle}>
                  <label style={dimensionLabelStyle}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => {
                        if (isActive) {
                          removeRange(dim.name);
                        } else {
                          updateRange(dim.name, "min", dim.min);
                        }
                      }}
                      style={checkboxStyle}
                    />
                    {dim.name}
                  </label>
                </div>
                {isActive && (
                  <div style={rangeInputsStyle}>
                    <label style={inputLabelStyle}>
                      Min
                      <input
                        type="number"
                        value={range.min}
                        min={dim.min}
                        max={dim.max}
                        onChange={(e) =>
                          updateRange(dim.name, "min", Number(e.target.value))
                        }
                        style={inputStyle}
                      />
                    </label>
                    <label style={inputLabelStyle}>
                      Max
                      <input
                        type="number"
                        value={range.max}
                        min={dim.min}
                        max={dim.max}
                        onChange={(e) =>
                          updateRange(dim.name, "max", Number(e.target.value))
                        }
                        style={inputStyle}
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
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
  left: 0,
  marginTop: "4px",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "6px",
  padding: "8px",
  minWidth: "220px",
  maxHeight: "300px",
  overflowY: "auto",
  zIndex: 100,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
};

const dimensionRowStyle: React.CSSProperties = {
  marginBottom: "8px",
};

const dimensionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const dimensionLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  color: "#e2e8f0",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const checkboxStyle: React.CSSProperties = {
  accentColor: "#6366f1",
};

const rangeInputsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginTop: "4px",
  paddingLeft: "24px",
};

const inputLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  fontSize: "11px",
  color: "#94a3b8",
  fontFamily: "system-ui, sans-serif",
};

const inputStyle: React.CSSProperties = {
  width: "70px",
  padding: "4px 6px",
  backgroundColor: "#0f172a",
  color: "#e2e8f0",
  border: "1px solid #475569",
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: "system-ui, sans-serif",
};
