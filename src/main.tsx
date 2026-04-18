import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import GraphSect from "./App";
import ShowcaseApp from "./ShowcaseApp";
import { ExternalGraph } from "./external-graph/types";

const exampleModules = import.meta.glob<ExternalGraph>("../examples/*.json", {
  eager: true,
  import: "default",
});

const selectedName = import.meta.env.VITE_EXAMPLE_GRAPH;
const graphJson = selectedName
  ? Object.entries(exampleModules).find(([path]) =>
      path.includes(`/${selectedName}.json`),
    )?.[1]
  : undefined;

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      {graphJson ? (
        <div style={{ width: "100vw", height: "100vh" }}>
          <GraphSect graph={graphJson} />
        </div>
      ) : (
        <ShowcaseApp />
      )}
    </StrictMode>,
  );
}
