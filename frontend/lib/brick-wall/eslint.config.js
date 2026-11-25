import {
  angular,
  phaser,
  phaserGameLayers,
  scripts,
  templates,
  tests,
  typescript,
} from "@fz/dev/eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// The specs' helpers held as the rules are, such as those a game's scripts
// load, which Node runs as it runs the rules: a game's lint reads only its
// own import of one, so what holds it to the rules' fence and their exact
// arithmetic is this list. Each is named by the change that writes it, since
// the list takes no glob and refuses a file that isn't there. A file of
// src/testing/ off this list is held only to the helpers' fence below.
/** @type {readonly string[]} */
export const HELD_AS_RULES = [
  "src/testing/solver.ts",
  "src/testing/careless.ts",
];

export default defineConfig(
  // The report `yarn test:coverage` writes.
  globalIgnores(["coverage/"]),
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "tools/**/*.ts", "vitest.config.ts"],
  }),
  // Everything the library defines carries fz, so it never collides with a
  // game's own `app-` components.
  angular({ files: ["src/**/*.ts"], prefix: "fz" }),
  // Fast-forward fills a button of a game's bar, which takes it by an
  // attribute (`button[fzFastForward]`), as @fz/game-ui's Pause and Sound
  // do, so its selector is named as a directive's.
  {
    files: ["src/app/fast_forward/fast_forward.component.ts"],
    rules: {
      "@angular-eslint/component-selector": [
        "error",
        { type: "attribute", prefix: "fz", style: "camelCase" },
      ],
    },
  },
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
  // The library is laid out in a game's layers and fenced as a game's are,
  // each importing only the layers below it, the rules and the view reading
  // only what they are handed. The rules, and the helpers held as they are,
  // keep to arithmetic every engine rounds alike, so a game's replays hold
  // in every browser.
  phaserGameLayers({
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
