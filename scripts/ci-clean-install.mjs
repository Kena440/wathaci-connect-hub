import { execSync } from "node:child_process";

const isCI = process.env.CI || process.env.VERCEL;
if (!isCI) process.exit(0);

try {
  execSync("npm cache clean --force", { stdio: "inherit" });
} catch (e) {
  console.log("ℹ️ npm cache clean failed (non-fatal).");
}
