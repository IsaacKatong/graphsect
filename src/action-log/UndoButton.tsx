import { useUndo } from "./ActionLogContext";

export default function UndoButton() {
  const { undo, canUndo } = useUndo();
  return (
    <button
      onClick={undo}
      disabled={!canUndo}
      title={canUndo ? "Undo last action" : "Nothing to undo"}
      style={{
        ...buttonStyle,
        ...(canUndo ? {} : disabledStyle),
      }}
      data-testid="undo-button"
    >
      Undo
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#334155",
  color: "#e2e8f0",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#475569",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexShrink: 0,
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.4,
  cursor: "not-allowed",
};
