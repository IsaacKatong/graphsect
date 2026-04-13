import { ForceGraphNode } from "../external-graph/transformGraph";

type NodeDetailPanelProps = {
  node: ForceGraphNode | null;
  onClose: () => void;
};

export default function NodeDetailPanel({
  node,
  onClose,
}: NodeDetailPanelProps) {
  if (!node) return null;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>{node.name}</h2>
        <button onClick={onClose} style={closeButtonStyle}>
          &times;
        </button>
      </div>

      <div style={sectionStyle}>
        <span style={labelStyle}>Type</span>
        <span>{node.type}</span>
      </div>

      {node.tags.length > 0 && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Tags</span>
          <div style={tagContainerStyle}>
            {node.tags.map((tag) => (
              <span key={tag} style={tagStyle}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(node.dimensions).length > 0 && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Dimensions</span>
          {Object.entries(node.dimensions).map(([name, value]) => (
            <div key={name}>
              {name}: {value}
            </div>
          ))}
        </div>
      )}

      <div style={sectionStyle}>
        <span style={labelStyle}>Content</span>
        <pre style={contentStyle}>{node.content}</pre>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  width: "360px",
  height: "100%",
  backgroundColor: "#1e293b",
  color: "#e2e8f0",
  padding: "20px",
  overflowY: "auto",
  boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.3)",
  fontFamily: "system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 600,
};

const closeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontSize: "24px",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  color: "#94a3b8",
  fontWeight: 600,
  letterSpacing: "0.05em",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const tagContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const tagStyle: React.CSSProperties = {
  backgroundColor: "#334155",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "13px",
};

const contentStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: "13px",
  backgroundColor: "#0f172a",
  padding: "12px",
  borderRadius: "6px",
  margin: 0,
};
