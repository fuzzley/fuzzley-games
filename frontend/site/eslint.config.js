import { angular, scripts, templates, tests, typescript } from "@fz/dev/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vite.config.ts", "tools/**/*.ts"],
  }),
  angular({ files: ["src/**/*.ts"], prefix: "app" }),
  templates({ files: ["src/**/*.html"] }),
  tests({
    files: [
      "src/**/*.spec.ts",
      "src/app/testing/**/*.ts",
      "src/test-setup.ts",
      "tools/**/*.spec.ts",
    ],
  }),
  scripts({ files: ["tools/*.mjs"] }),
);
