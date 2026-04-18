import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const isLib = process.env.BUILD_TARGET === "lib";

export default defineConfig({
  plugins: [react()],
  build: isLib
    ? {
        lib: {
          entry: resolve(__dirname, "src/index.ts"),
          name: "GraphSect",
          formats: ["es", "cjs"],
          fileName: (format) => `graphsect.${format === "es" ? "mjs" : "cjs"}`,
        },
        rollupOptions: {
          external: ["react", "react-dom", "react/jsx-runtime"],
          output: {
            globals: {
              react: "React",
              "react-dom": "ReactDOM",
              "react/jsx-runtime": "jsxRuntime",
            },
          },
        },
        sourcemap: true,
        emptyOutDir: true,
      }
    : undefined,
});
