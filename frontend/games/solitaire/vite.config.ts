import { gameConfig } from "@fz/dev/vite";
import path from "path";
import { defineConfig, mergeConfig } from "vite";

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
      resolve: {
        alias: {
          "@": path.resolve(import.meta.dirname, "./src"),
        },
      },
    },
  ),
);
