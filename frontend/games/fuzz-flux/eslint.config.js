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

// The specs' helpers held as the rules are: the players and the checks the
// certificates and the floors are found with, and what the scripts load
// through Vite. Node runs them as it runs the rules, and a certificate found
// in Node holds in every browser only if they keep to the same exact
// arithmetic. Each is named by the change that writes it, since the list
// takes no glob and refuses a file that isn't there, and vitest.config.ts
// holds each at the rules' floor. A file of src/testing/ off this list is
// held only to the helpers' fence below.
/** @type {readonly string[]} */
export const HELD_AS_RULES = [
  "src/testing/dice.ts",
  "src/testing/play_out.ts",
  "src/testing/casual.ts",
  "src/testing/careful.ts",
];

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
  // read only what they are handed. The view takes the fuzzball of
  // @fz/style, its faces among them. The rules, and the helpers held as
  // they are, keep to arithmetic every engine rounds alike, so a
  // certificate found in Node holds in every browser.
  phaserGameLayers({
    viewAllows: ["@fz/style/fuzzball"],
    heldAsRules: { root: import.meta.dirname, files: HELD_AS_RULES },
    exact: true,
  }),
  // The specs' helpers take Angular by type alone, so they declare nothing
  // Analog's plugin must compile: every project compiles them with Vite's
  // oxc, alike, and coverage adds their runs up (`@fz/dev`'s
  // `angularTests({ projects })`, in its `src/vitest.ts`). The helpers held
  // as the rules are hold to the rules' fence instead.
  {
    files: ["src/testing/**/*.ts"],
    ignores: ["**/*.spec.ts", ...HELD_AS_RULES],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@angular/*"],
              allowTypeImports: true,
              message:
                "The specs' helpers take Angular by type alone, since every project compiles them with oxc rather than Analog's plugin.",
            },
          ],
        },
      ],
    },
  },
);
