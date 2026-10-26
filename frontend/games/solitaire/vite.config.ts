import { defineConfig } from "vite";
import path from "path";
import angular from "@analogjs/vite-plugin-angular";
import { fuzzleyStyle } from "@fz/style/vite";

// The Docker build names the commit it builds in COMMIT_SHA, and a bug report
// names it as the build it came from.
const commit = process.env["COMMIT_SHA"];

export default defineConfig({
  base: "./",
  plugins: [angular(), fuzzleyStyle()],
  define: commit
    ? { "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(commit) }
    : {},
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 9000,
    open: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks(id) {
          return id.includes("node_modules/phaser") ? "phaser" : undefined;
        },
      },
    },
  },
});
