import { useEffect, useRef, useState } from "react";

type GroupedViewControlsProps = {
  enabled: boolean;
  onToggle: () => void;
  onReset: () => void;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function GroupedViewControls({
  enabled,
  onToggle,
  onReset,
  disabled,
  open,
  onOpenChange,
}: GroupedViewControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  return (
    <div ref={containerRef} style={containerStyle}>
      <button
        onClick={() => !disabled && onOpenChange(!open)}
        style={{
          ...buttonStyle,
          ...(enabled && !disabled ? activeButtonStyle : {}),
          ...(disabled ? disabledStyle : {}),
        }}
      >
        Grouped View
      </button>
      {open && !disabled && (
        <div style={dropdownStyle}>
          <button
            onClick={() => {
              onToggle();
              onOpenChange(false);
            }}
            onMouseEnter={() => setHovered("toggle")}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...actionButtonStyle,
              ...(hovered === "toggle" ? actionButtonHoverStyle : {}),
            }}
          >
            {enabled ? "Disable" : "Enable"}
          </button>
          <div style={dividerStyle} />
          <button
            onClick={() => {
              onReset();
              onOpenChange(false);
            }}
            onMouseEnter={() => setHovered("reset")}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...actionButtonStyle,
              ...(hovered === "reset" ? actionButtonHoverStyle : {}),
            }}
          >
            Reset
          </button>
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
};

const activeButtonStyle: React.CSSProperties = {
  backgroundColor: "#4f46e5",
  borderColor: "#6366f1",
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.4,
  cursor: "not-allowed",
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
  minWidth: "160px",
  zIndex: 100,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
};

const actionButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  backgroundColor: "transparent",
  color: "#e2e8f0",
  border: "none",
  fontSize: "13px",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const actionButtonHoverStyle: React.CSSProperties = {
  backgroundColor: "#334155",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #334155",
  margin: "4px 0",
};
