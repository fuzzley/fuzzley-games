import { defineConfig, globalIgnores } from "eslint/config";
import { tests, typescript } from "./src/eslint.ts";

export default defineConfig(
  // The report `yarn test` writes.
  globalIgnores(["coverage/"]),
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vitest.config.ts"],
  }),
  tests({ files: ["src/**/*.spec.ts", "src/testing/**/*.ts"] }),
);
