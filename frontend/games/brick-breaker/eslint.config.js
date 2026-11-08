import {
  angular,
  phaser,
  phaserGameLayers,
  scripts,
  templates,
  tests,
  typescript,
} from "@fz/dev/eslint";
import { defineConfig } from "eslint/config";

// The specs' helpers the scripts under tools/ load through Vite, and what
// they import of src/testing/, which Node runs as it runs the rules, and the
// report and the screenshots count on playing the same from a seed. A file
// of src/testing/ off this list is held to no fence, and may take Angular,
// so one they import is flagged until it joins the list.
const SCRIPT_HELPERS = ["src/testing/autopilot.ts", "src/testing/kept_run.ts"];

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: [
      "src/**/*.ts",
      "tools/**/*.ts",
      "vite.config.ts",
      "vitest.config.ts",
    ],
  }),
  angular({ files: ["src/**/*.ts"], prefix: "app" }),
  templates({ files: ["src/**/*.html"] }),
  tests({
    files: [
      "src/**/*.spec.ts",
      "src/testing/**/*.ts",
      "src/test-setup.ts",
      "tools/**/*.spec.ts",
    ],
  }),
  phaser({ files: ["src/scene/**/*.ts"] }),
  scripts({
    files: ["tools/**/*.mjs", "eslint.config.js", "stylelint.config.js"],
  }),
  // Each layer imports only the layers below it, and the rules and the view
  // read only what they are handed. The helpers the scripts load are held
  // as the rules are, though the messages speak of the rules and the view
  // alone.
  phaserGameLayers({
    heldAsRules: { root: import.meta.dirname, files: SCRIPT_HELPERS },
  }),
);
