import { defineConfig, globalIgnores } from "eslint/config";
import { scripts, tests, typescript } from "./src/eslint.ts";

/**
 * The import of `@fz/core` the library's modules may not make: the sound
 * lab's page alone plays by the mix's formulas, through
 * `src/sound_lab_mix.ts`, which only the page and its specs load.
 */
const CORE_OUTSIDE_THE_LAB = {
  regex: "^@fz/core(?:/|$)",
  message:
    "Only src/sound_lab_mix.ts and the specs import @fz/core, so no module Node runs, such as the presets or the lab's Vite plugin, loads a library's code, whose modules import one another without their extensions.",
};

/**
 * The import of the sound lab's page or mix that the library's other
 * modules may not make: the page loads its stylesheet, and the mix
 * `@fz/core`, neither of which Node can load.
 */
const LAB_OUTSIDE_THE_PAGE = {
  regex: "^\\./sound_lab_(?:mix|page)\\.ts$",
  message:
    "Only the sound lab's page and the specs import its mix or the page, since the page loads its stylesheet and the mix @fz/core, which no module Node runs may load.",
};

export default defineConfig(
  // The report `yarn test` writes.
  globalIgnores(["coverage/"]),
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vitest.config.ts"],
  }),
  tests({ files: ["src/**/*.spec.ts", "src/testing/**/*.ts"] }),
  scripts({ files: ["eslint.config.js", "bin/**/*.mjs"] }),
  // The synth's loops read samples at the indexes they bound themselves, so
  // a read asserts its sample is there (`x[i]!`), where a fallback
  // (`x[i] ?? 0`) would be a branch no read takes and no spec can cover. A
  // read that may fall past a signal's end, such as into a tail, keeps one.
  {
    files: ["src/synth_*.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/sound_lab_mix.ts",
      "src/sound_lab_page.ts",
      "src/**/*.spec.ts",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [CORE_OUTSIDE_THE_LAB, LAB_OUTSIDE_THE_PAGE] },
      ],
    },
  },
  {
    files: ["src/sound_lab_page.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [CORE_OUTSIDE_THE_LAB] },
      ],
    },
  },
  // What the scripts load of this library, from @fz/dev/script, /report,
  // /screenshots, /workspaces and /verify, and what the tsc7 binary loads,
  // loads Vite only once a script asks for it.
  {
    files: [
      "src/script.ts",
      "src/workspaces.ts",
      "src/verify.ts",
      "src/queue.ts",
      "src/report.ts",
      "src/screenshots.ts",
      "src/screenshot_page.ts",
      "src/board_page.ts",
      "src/layout_page.ts",
      "src/chrome.ts",
      "src/tsc7.ts",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "vite",
              allowTypeImports: true,
              message:
                "The scripts' helpers load Vite only when a script asks for it, with import() as importThroughVite() does, so a script that loads nothing through it doesn't wait on Vite: import its types alone here.",
            },
          ],
          patterns: [
            // This block's rule replaces the one above for these files.
            CORE_OUTSIDE_THE_LAB,
            LAB_OUTSIDE_THE_PAGE,
            {
              regex: "^\\./(?:layout|vite|vitest|game_manifest)\\.ts$",
              allowTypeImports: true,
              message:
                "This module loads Vite as it loads, which the scripts' helpers do only when a script asks for it: import its types alone here.",
            },
          ],
        },
      ],
    },
  },
);
