import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { delimiter, resolve } from "node:path";

const [, , ...cliArgs] = process.argv;
const vendorPath = resolve("vendor");
const existingNodePath = process.env.NODE_PATH;
const nodePath = existingNodePath ? `${vendorPath}${delimiter}${existingNodePath}` : vendorPath;

const stubPackages = [
  {
    name: "lodash.castarray",
    target: resolve(vendorPath, "lodash.castarray"),
  },
  {
    name: "lodash.isplainobject",
    target: resolve(vendorPath, "lodash.isplainobject"),
  },
  {
    name: "isows",
    target: resolve(vendorPath, "isows"),
  },
];

async function ensureStubPackages() {
  await Promise.all(
    stubPackages.map(async ({ name, target }) => {
      const packageRoot = resolve("node_modules", name);
      const indexPath = resolve(packageRoot, "index.js");

      if (existsSync(indexPath)) {
        return;
      }

      await mkdir(packageRoot, { recursive: true });
      const relativeTarget = target;
      const content = `module.exports = require(${JSON.stringify(relativeTarget)});`;
      await writeFile(indexPath, `${content}\n`, "utf8");
      await writeFile(
        resolve(packageRoot, "package.json"),
        `${JSON.stringify({ name, main: "./index.js", module: "./index.js" }, null, 2)}\n`,
        "utf8"
      );
    })
  );
}

await ensureStubPackages();

const child = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), ...cliArgs], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_PATH: nodePath,
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
