import { tests, typescript } from "@fz/dev/eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig(
  // The report `yarn test` writes.
  globalIgnores(["coverage/"]),
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vitest.config.ts"],
  }),
  tests({ files: ["src/**/*.spec.ts"] }),
  {
    // themes.ts and fuzzball.ts run in the apps' pages, so nothing that runs
    // only in Node, at build time, in a lint or in a spec gets in.
    files: ["src/*.ts"],
    ignores: ["src/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                "postcss",
                "sass",
                "sharp",
                "stylelint",
                "vite",
              ],
              message: "A page loads this file, and this runs only in Node.",
            },
            {
              group: ["./build/*", "./lint/*", "./testing/*"],
              message: "A page loads this file, and this runs only in Node.",
            },
          ],
        },
      ],
    },
  },
);
