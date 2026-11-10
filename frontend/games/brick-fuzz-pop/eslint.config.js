import { existsSync } from "node:fs";
import { join } from "node:path";
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

// The specs' helpers held as the rules are: the solver, the careless player
// and the measure of a wall the certificates and the floors are found with,
// the picture a wall is drawn from, and what the scripts load through Vite.
// Node runs them as it runs the rules, and a certificate found in Node holds
// in every browser only if they keep to the same exact arithmetic. A file
// of src/testing/ off this list is held only to the helpers' fence below.
const HELD_AS_RULES = [
  "src/testing/solver.ts",
  "src/testing/casual.ts",
  "src/testing/wall_score.ts",
  "src/testing/wall_picture.ts",
  "src/testing/kept_run.ts",
  "src/testing/script_api.ts",
  "src/testing/certify_api.ts",
  "src/testing/report_api.ts",
  "src/testing/screenshot_api.ts",
];

// Those written so far: phaserGameLayers() refuses a file the workspace
// doesn't have, and each is held from the commit that writes it. A file
// written under another name than the list's is held by nothing, so the
// integrator checks each against the list as it merges; once all nine
// exist, the filter goes and the library's check for a missing file is back.
const HELD = HELD_AS_RULES.filter((file) =>
  existsSync(join(import.meta.dirname, file)),
);

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
  // read only what they are handed. The rules, and the helpers held as they
  // are, keep to arithmetic every engine rounds alike, so a certificate found
  // in Node holds in every browser; the messages speak of the rules and the
  // view alone.
  phaserGameLayers({
    heldAsRules: { root: import.meta.dirname, files: HELD },
    exact: true,
  }),
  // The specs' helpers take Angular by type alone, so they declare nothing
  // Analog's plugin must compile: every project compiles them with Vite's
  // oxc, alike, and coverage adds their runs up (`@fz/dev`'s
  // `angularTests({ projects })`, in its `src/vitest.ts`). The helpers held
  // as the rules are hold to the rules' fence instead.
  {
    files: ["src/testing/**/*.ts"],
    ignores: ["**/*.spec.ts", ...HELD],
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
