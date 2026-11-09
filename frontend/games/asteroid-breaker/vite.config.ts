import { soundLab } from "@fz/dev/sound-lab";
import { gameConfig } from "@fz/dev/vite";
import { defineConfig, mergeConfig } from "vite";

export default defineConfig(
  mergeConfig(gameConfig({ port: 9005, name: "Asteroid Breaker" }), {
    // The sound lab, at sound-lab/ on the dev server alone.
    plugins: [
      soundLab({
        entry: "tools/sound-lab.ts",
        title: "Sound lab: Asteroid Breaker",
      }),
    ],
  }),
);
