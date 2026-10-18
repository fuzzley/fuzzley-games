import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";

// The scripts in .agents/, which belong to no workspace, and the Yarn
// constraints: `yarn lint` runs ESLint over them from the repository root
// with this file. Every workspace lints its own files with its own config, so
// a workspace without one finds this file, whose patterns ignore it, and
// fails rather than going unlinted.
export default defineConfig(
  {
    ignores: ["**/site/", "**/games/"],
  },
  // The scripts are plain JavaScript, so JSDoc is the only place a type can
  // go: every parameter and every returned value carries one, and
  // tsconfig.scripts.json checks them.
  {
    files: [".agents/*.mjs", "frontend/yarn.config.cjs"],
    extends: [
      eslint.configs.recommended,
      jsdoc.configs["flat/recommended-typescript-flavor-error"],
    ],
    rules: {
      // tsc reports an undefined name, and knows Node's globals.
      "no-undef": "off",
      // A function that takes and returns nothing may go without a comment;
      // any other needs one to carry its types.
      "jsdoc/require-jsdoc": ["error", { exemptEmptyFunctions: true }],
      // A tag is described only when the description adds something.
      "jsdoc/require-param-description": "off",
      "jsdoc/require-property-description": "off",
      "jsdoc/require-returns-description": "off",
      // One blank line after the summary, none between the tags.
      "jsdoc/tag-lines": ["error", "never", { startLines: 1 }],
    },
  },
);
