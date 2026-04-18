import { useMemo, useState } from "react";
import GraphSect from "./App";
import { ExternalGraph } from "./external-graph/types";

const exampleModules = import.meta.glob<ExternalGraph>("../examples/*.json", {
  eager: true,
  import: "default",
});

type Example = { name: string; graph: ExternalGraph };

const examples: Example[] = Object.entries(exampleModules)
  .map(([path, graph]) => {
    const name = path.split("/").pop()!.replace(/\.json$/, "");
    return { name, graph };
  })
  .filter((e) => !e.name.startsWith("_"))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function ShowcaseApp() {
  const [selectedName, setSelectedName] = useState<string>(
    examples[0]?.name ?? "",
  );

  const selected = useMemo(
    () => examples.find((e) => e.name === selectedName),
    [selectedName],
  );

  if (examples.length === 0) {
    return (
      <div style={emptyStyle}>
        No example graphs found.
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      <div style={headerStyle}>
        <span style={brandStyle}>graphsect</span>
        <label style={labelStyle}>
          Example:
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            style={selectStyle}
          >
            {examples.map((e) => (
              <option key={e.name} value={e.name}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={graphContainerStyle}>
        {selected && <GraphSect key={selected.name} graph={selected.graph} />}
      </div>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "#0b0b0f",
  color: "#eaeaea",
  fontFamily: "system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "10px 16px",
  borderBottom: "1px solid #222",
  background: "#111",
  zIndex: 100,
};

const brandStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 15,
  letterSpacing: 0.3,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#bbb",
};

const selectStyle: React.CSSProperties = {
  background: "#1a1a20",
  color: "#eaeaea",
  border: "1px solid #333",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 13,
};

const graphContainerStyle: React.CSSProperties = {
  flex: 1,
  position: "relative",
  minHeight: 0,
};

const emptyStyle: React.CSSProperties = {
  padding: 24,
  fontFamily: "system-ui, sans-serif",
};
