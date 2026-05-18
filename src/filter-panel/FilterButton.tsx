import { useEffect, useMemo, useRef, useState } from "react";

type FilterButtonProps = {
  label: string;
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
};

export default function FilterButton({
  label,
  options,
  selected,
  onSelectionChange,
}: FilterButtonProps) {
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

  // Always include the user's current selection in the dropdown, even when
  // another filter has narrowed it out of the post-filter graph — otherwise
  // the user can land in a state with an active selection but no way to
  // uncheck it (badge shows the count, dropdown shows nothing).
  const displayOptions = useMemo(() => {
    const out = [...options];
    const seen = new Set(options);
    for (const s of selected) {
      if (!seen.has(s)) {
        out.push(s);
        seen.add(s);
      }
    }
    return out;
  }, [options, selected]);

  const activeCount = selected.length;

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onSelectionChange(selected.filter((s) => s !== option));
    } else {
      onSelectionChange([...selected, option]);
    }
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
        {label}
        {activeCount > 0 && <span style={badgeStyle}>{activeCount}</span>}
      </button>
      {open && displayOptions.length > 0 && (
        <div style={dropdownStyle}>
          {displayOptions.map((option) => (
            <label key={option} style={optionStyle}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
                style={checkboxStyle}
              />
              {option}
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
  padding: "6px 0",
  minWidth: "180px",
  maxHeight: "240px",
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
