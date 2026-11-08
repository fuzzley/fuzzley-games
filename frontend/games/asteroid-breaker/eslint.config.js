import {
  angular,
  phaser,
  phaserGameLayers,
  scripts,
  templates,
  tests,
  typescript,
} from "@fz/dev/eslint";
import { basename } from "node:path";
import { defineConfig } from "eslint/config";

// The specs' helpers the scripts under tools/ load through Vite, and what
// they import of src/testing/, which Node runs without Angular's plugin, as
// it runs the rules, and the report counts on playing the same from a seed.
// A file of src/testing/ off this list is held only to the helpers' fence,
// which lets Angular in by type, so one they import is flagged until it
// joins the list.
const SCRIPT_HELPERS = [
  "src/testing/script_api.ts",
  "src/testing/report_api.ts",
  "src/testing/screenshot_api.ts",
  "src/testing/autopilot.ts",
  "src/testing/kept_run.ts",
];

// A file beside the helpers the scripts load, all in src/testing/, that is
// none of them.
const OFF_SCRIPT_HELPERS = {
  regex: `^\\./(?!(?:${SCRIPT_HELPERS.map((file) => basename(file, ".ts")).join("|")})$)`,
  message:
    "The helpers the scripts load import no other file of src/testing/: add it to SCRIPT_HELPERS in eslint.config.js, which holds it to the rules' fence.",
};

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
  // @fz/style, and the helpers the scripts load are held as the rules are,
  // though the messages speak of the rules and the view alone.
  phaserGameLayers({
    viewAllows: ["@fz/style/fuzzball"],
    heldAsRules: { files: SCRIPT_HELPERS, patterns: [OFF_SCRIPT_HELPERS] },
  }),
  // The specs' helpers take Angular by type alone, so they declare nothing
  // Analog's plugin must compile: every project compiles them with Vite's
  // oxc, alike, and coverage adds their runs up (`vitest.config.ts`). The
  // helpers the scripts load hold to the rules' fence instead.
  {
    files: ["src/testing/**/*.ts"],
    ignores: ["**/*.spec.ts", ...SCRIPT_HELPERS],
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
