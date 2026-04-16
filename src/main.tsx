import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GraphSect from "./App";
import { ExternalGraph } from "./external-graph/types";

const exampleModules = import.meta.glob<ExternalGraph>("../examples/*.json", {
  eager: true,
  import: "default",
});

const selectedName = import.meta.env.VITE_EXAMPLE_GRAPH;
const graphJson = Object.entries(exampleModules).find(
  ([path]) => path.includes(`/${selectedName}.json`),
)?.[1];

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      {graphJson ? (
        <div style={{ width: "100vw", height: "100vh" }}>
          <GraphSect graph={graphJson} />
        </div>
      ) : (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          No example graph loaded.
        </div>
      )}
    </StrictMode>,
  );
}
