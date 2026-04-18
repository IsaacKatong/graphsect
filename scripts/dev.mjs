#!/usr/bin/env node
import { readdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(__filename), "..");
const examplesDir = resolve(packageRoot, "examples");

const args = process.argv.slice(2);
const graphIdx = args.findIndex((a) => a === "--graph" || a === "-g");
const customGraphArg = graphIdx >= 0 ? args[graphIdx + 1] : undefined;

const CUSTOM_NAME = "_custom";
const customDest = resolve(examplesDir, `${CUSTOM_NAME}.json`);

function cleanup() {
  if (existsSync(customDest)) {
    try { rmSync(customDest); } catch {}
  }
}
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });
process.on("SIGTERM", () => { cleanup(); process.exit(143); });

async function pickExample() {
  const examples = readdirSync(examplesDir)
    .filter((f) => f.endsWith(".json") && f !== `${CUSTOM_NAME}.json`)
    .map((f) => f.replace(".json", ""));

  if (examples.length === 0) {
    console.error("No JSON files found in examples/");
    process.exit(1);
  }
  if (examples.length === 1) {
    console.log(`Using example: ${examples[0]}`);
    return examples[0];
  }

  console.log("\nAvailable example graphs:\n");
  examples.forEach((name, i) => console.log(`  ${i + 1}) ${name}`));
  console.log();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Select an example (number): ", (answer) => {
      rl.close();
      const index = parseInt(answer, 10) - 1;
      if (index >= 0 && index < examples.length) {
        resolve(examples[index]);
      } else {
        console.error("Invalid selection");
        process.exit(1);
      }
    });
  });
}

let selected;
if (customGraphArg) {
  const src = isAbsolute(customGraphArg)
    ? customGraphArg
    : resolve(process.cwd(), customGraphArg);
  if (!existsSync(src)) {
    console.error(`Graph file not found: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, customDest);
  console.log(`Using custom graph: ${src}`);
  selected = CUSTOM_NAME;
} else {
  selected = await pickExample();
}

const child = spawn("npx", ["vite"], {
  stdio: "inherit",
  cwd: packageRoot,
  env: { ...process.env, VITE_EXAMPLE_GRAPH: selected },
});

child.on("exit", (code) => process.exit(code ?? 0));
