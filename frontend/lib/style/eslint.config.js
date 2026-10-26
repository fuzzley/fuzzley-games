import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  // The report `yarn test` writes.
  globalIgnores(["coverage/"]),
  {
    files: ["src/**/*.ts", "vitest.config.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Exported functions and public methods state what they return.
      "@typescript-eslint/explicit-module-boundary-types": "error",
      // A type-only import says so, and disappears from the bundle.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      // Numbers and booleans read naturally in a message.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },
  {
    files: ["src/**/*.spec.ts"],
    rules: {
      // A test's `!` states a precondition, and should fail loudly if it is
      // ever wrong.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
