import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(() => ({
  // Use an absolute base so that asset URLs remain stable across all routes
  // (including deep links like /marketplace). Relative bases caused Vite to
  // emit bundle paths such as "./assets/..." which resolved to
  // "/marketplace/assets" in production and resulted in 404s/blank screens.
  // Vercel serves the app from the root, so "/" is the correct base for both
  // preview and production builds.
  base: "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
}));

