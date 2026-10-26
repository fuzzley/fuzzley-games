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
);
