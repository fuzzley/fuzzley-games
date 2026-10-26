import { angular, templates, tests, typescript } from "@fz/dev/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vitest.config.ts"],
  }),
  // Everything the library defines carries fz, so it never collides with an
  // app's own `app-` components.
  angular({ files: ["src/**/*.ts"], prefix: "fz" }),
  templates({ files: ["src/**/*.html"] }),
  tests({ files: ["src/**/*.spec.ts", "src/test-setup.ts"] }),
);
