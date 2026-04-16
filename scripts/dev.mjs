import { readdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";

const examples = readdirSync("examples")
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

if (examples.length === 0) {
  console.error("No JSON files found in examples/");
  process.exit(1);
}

async function pick() {
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

const selected = await pick();

const child = spawn("npx", ["vite"], {
  stdio: "inherit",
  env: { ...process.env, VITE_EXAMPLE_GRAPH: selected },
});

child.on("exit", (code) => process.exit(code ?? 0));
