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

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vite.config.ts", "vitest.config.ts"],
  }),
  angular({ files: ["src/**/*.ts"], prefix: "app" }),
  templates({ files: ["src/**/*.html"] }),
  tests({
    files: ["src/**/*.spec.ts", "src/testing/**/*.ts", "src/test-setup.ts"],
  }),
  scripts({
    files: ["tools/**/*.mjs", "eslint.config.js", "stylelint.config.js"],
  }),
  phaser({ files: ["src/scene/**/*.ts"] }),
  // Each layer imports only the layers below it, and the rules and the view
  // read only what they are handed.
  phaserGameLayers(),
);
