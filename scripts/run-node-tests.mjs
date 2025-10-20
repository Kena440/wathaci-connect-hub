import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

async function collectTestFiles(startDir) {
  const directoryPath = resolve(startDir);
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = [];

  for (const entry of entries) {
    const fullPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(fullPath)));
      continue;
    }

    if (/\.test\.(?:[cm]?js|[cm]?ts)$/u.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const cliTargets = process.argv.slice(2);
const discoveredTargets = cliTargets.length > 0 ? cliTargets : await collectTestFiles("src/test");

if (discoveredTargets.length === 0) {
  console.warn("No test files found in src/test. Skipping test run.");
  process.exit(0);
}

const args = ["--test", ...discoveredTargets];

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "test",
    ALLOW_IN_MEMORY_REGISTRATION: "true",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
