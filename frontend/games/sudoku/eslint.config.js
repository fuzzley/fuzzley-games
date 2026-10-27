import { angular, scripts, templates, tests, typescript } from "@fz/dev/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vite.config.ts", "vitest.config.ts"],
  }),
  angular({ files: ["src/**/*.ts"], prefix: "app" }),
  templates({ files: ["src/**/*.html"] }),
  tests({
    files: ["src/**/*.spec.ts", "src/testing/**/*.ts", "src/test-setup.ts"],
  }),
  scripts({ files: ["tools/**/*.mjs"] }),
  {
    // The rules of the game know nothing of how it is shown, so specs drive
    // them directly and the shell can change around them.
    files: ["src/rules/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@angular/*", "@fz/*", "rxjs", "rxjs/*"],
              message: "The game's rules use no framework.",
            },
            {
              group: ["**/app", "**/app/**"],
              message: "The game's rules know nothing of the shell.",
            },
          ],
        },
      ],
    },
  },
);
