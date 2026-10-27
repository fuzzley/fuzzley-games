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
    // A game's rules import these behind a fence that keeps every framework
    // out, so nothing here imports anything but its own files.
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!\\./)",
              message: "The core helpers import nothing but each other.",
            },
          ],
        },
      ],
    },
  },
);
