import { fileURLToPath } from "node:url";
import { soundLab } from "@fz/dev/sound-lab";
import { gameConfig } from "@fz/dev/vite";
import { defineConfig, mergeConfig, searchForWorkspaceRoot } from "vite";

/** The design's sounds, outside the workspace, whose take the sound lab plays beside the game's. */
const DESIGN_SOUNDS = fileURLToPath(
  new URL("../../../docs/fuzz-flux/sound", import.meta.url),
);

export default defineConfig(
  mergeConfig(gameConfig({ port: 9008, name: "Fuzz Flux" }), {
    // The sound lab, at sound-lab/ on the dev server alone.
    plugins: [
      soundLab({ entry: "tools/sound-lab.ts", title: "Sound lab: Fuzz Flux" }),
    ],
    server: {
      fs: { allow: [searchForWorkspaceRoot(process.cwd()), DESIGN_SOUNDS] },
    },
  }),
);
