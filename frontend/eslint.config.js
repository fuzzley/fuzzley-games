import { scripts } from "@fz/dev/eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// The scripts in .agents/ and frontend/tools/, which belong to no workspace,
// the Yarn constraints and this config: `yarn lint` runs ESLint over them from
// the repository root with this file. Every workspace lints its own files with
// its own config, so a workspace without one finds this file, whose patterns
// ignore it, and fails rather than going unlinted.
export default defineConfig(
  globalIgnores(["**/lib/", "**/site/", "**/games/"]),
  scripts({
    files: [
      ".agents/*.mjs",
      "frontend/tools/*.mjs",
      "frontend/yarn.config.cjs",
      "frontend/eslint.config.js",
    ],
  }),
);
