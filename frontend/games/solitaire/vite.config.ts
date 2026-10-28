import { gameConfig } from "@fz/dev/vite";
import path from "path";
import { defineConfig, mergeConfig } from "vite";

// The Docker build names the commit it builds in COMMIT_SHA, and a bug report
// names it as the build it came from.
const commit = process.env["COMMIT_SHA"];

export default defineConfig(
  mergeConfig(
    gameConfig({
      port: 9000,
      name: "Solitaire Collection",
      catalog: {
        module: "src/ui/app/provider/game_catalog.ts",
        export: "GAME_CATALOG",
      },
    }),
    {
      define: commit
        ? { "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(commit) }
        : {},
      resolve: {
        alias: {
          "@": path.resolve(import.meta.dirname, "./src"),
        },
      },
    },
  ),
);
