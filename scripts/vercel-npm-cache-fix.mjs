import { execSync } from "node:child_process";

const isVercel = !!process.env.VERCEL;
if (!isVercel) process.exit(0);

try {
  console.log("ℹ️ Vercel detected — cleaning npm cache to avoid EINTEGRITY issues...");
  execSync("npm cache clean --force", { stdio: "inherit" });
} catch {
  console.log("⚠️ npm cache clean failed (non-fatal). Continuing install...");
}
