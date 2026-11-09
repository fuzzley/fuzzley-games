import { angular, scripts, templates, tests, typescript } from "@fz/dev/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vitest.config.ts"],
  }),
  // Everything the library defines carries fz, so it never collides with an
  // app's own `app-` components.
  angular({ files: ["src/**/*.ts"], prefix: "fz" }),
  // Pause and Sound fill a button of the app's own, which takes them by an
  // attribute (`button[fzBarPause]`), so their selectors are named as a
  // directive's are.
  {
    files: [
      "src/bar_pause/bar_pause.component.ts",
      "src/bar_sound/bar_sound.component.ts",
    ],
    rules: {
      "@angular-eslint/component-selector": [
        "error",
        { type: "attribute", prefix: "fz", style: "camelCase" },
      ],
    },
  },
  templates({ files: ["src/**/*.html"] }),
  tests({
    files: ["src/**/*.spec.ts", "src/testing/**/*.ts", "src/test-setup.ts"],
  }),
  scripts({ files: ["eslint.config.js", "stylelint.config.js"] }),
);
