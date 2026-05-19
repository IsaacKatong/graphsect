import { useEffect, useRef, useState } from "react";
import { GraphView } from "./types";

type AddViewMenuProps = {
  /** View types that can be added (everything except the pinned filters view). */
  addableTypes: GraphView[];
  /** Append one new instance of the given view type. */
  onAdd: (typeId: string) => void;
};

/**
 * "Add view" button + menu. Each click appends a new instance, so the same
 * view type can be added multiple times — every instance carries its own
 * independent state. Reorder/close happens through each instance's header.
 */
export default function AddViewMenu({ addableTypes, onAdd }: AddViewMenuProps) {
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

  return (
    <div ref={containerRef} style={containerStyle}>
      <button
        onClick={() => setOpen(!open)}
        style={buttonStyle}
        data-testid="add-view-button"
      >
        + Add view
      </button>
      {open && (
        <div style={dropdownStyle}>
          {addableTypes.map((view) => (
            <button
              key={view.id}
              onClick={() => {
                onAdd(view.id);
                setOpen(false);
              }}
              style={optionStyle}
              data-testid={`add-view-${view.id}`}
            >
              {view.name}
            </button>
          ))}
          {addableTypes.length === 0 && (
            <div style={emptyOptionStyle}>No view types available</div>
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
  backgroundColor: "#4f46e5",
  color: "#e2e8f0",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#6366f1",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: "4px",
  backgroundColor: "#1e293b",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#475569",
  borderRadius: "6px",
  padding: "6px 0",
  minWidth: "200px",
  maxHeight: "280px",
  overflowY: "auto",
  zIndex: 100,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  display: "flex",
  flexDirection: "column",
};

const optionStyle: React.CSSProperties = {
  display: "block",
  textAlign: "left",
  padding: "6px 12px",
  fontSize: "13px",
  color: "#e2e8f0",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  backgroundColor: "transparent",
  border: "none",
  width: "100%",
};

const emptyOptionStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: "12px",
  color: "#64748b",
  fontFamily: "system-ui, sans-serif",
};
