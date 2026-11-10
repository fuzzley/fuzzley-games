import { soundLab } from "@fz/dev/sound-lab";
import { gameConfig } from "@fz/dev/vite";
import { defineConfig, mergeConfig } from "vite";

export default defineConfig(
  mergeConfig(gameConfig({ port: 9006, name: "Brick Fuzz Pop" }), {
    // The sound lab, at sound-lab/ on the dev server alone.
    plugins: [
      soundLab({
        entry: "tools/sound-lab.ts",
        title: "Sound lab: Brick Fuzz Pop",
      }),
    ],
  }),
);
