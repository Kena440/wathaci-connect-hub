import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Use relative paths for built assets so that deployments served from
  // subdirectories (for example via object storage buckets) can resolve the
  // CSS/JS bundles correctly without falling back to a blank page.  This
  // matches the structure of the previously working build where
  // dist/assets/index-BfhehJjT.css and dist/assets/index-CtanDc5o.js were
  // referenced with relative URLs.
  base: command === "serve" ? "/" : "./",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
}));

