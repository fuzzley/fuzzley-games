import { defineConfig, globalIgnores } from "eslint/config";
import { scripts, tests, typescript } from "./src/eslint.ts";

export default defineConfig(
  // The report `yarn test` writes.
  globalIgnores(["coverage/"]),
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vitest.config.ts"],
  }),
  tests({ files: ["src/**/*.spec.ts", "src/testing/**/*.ts"] }),
  scripts({ files: ["eslint.config.js"] }),
  // What the scripts load of this library, from @fz/dev/script, /report and
  // /screenshots, loads Vite only once a script asks for it.
  {
    files: [
      "src/script.ts",
      "src/report.ts",
      "src/screenshots.ts",
      "src/screenshot_page.ts",
      "src/board_page.ts",
      "src/layout_page.ts",
      "src/chrome.ts",
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
