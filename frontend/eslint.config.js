import { scripts } from "@fz/dev/eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// The scripts in .agents/, which belong to no workspace, and the Yarn
// constraints: `yarn lint` runs ESLint over them from the repository root
// with this file. Every workspace lints its own files with its own config, so
// a workspace without one finds this file, whose patterns ignore it, and
// fails rather than going unlinted.
export default defineConfig(
  globalIgnores(["**/lib/", "**/site/", "**/games/"]),
  scripts({ files: [".agents/*.mjs", "frontend/yarn.config.cjs"] }),
);
