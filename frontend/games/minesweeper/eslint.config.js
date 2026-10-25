import eslint from "@eslint/js";
import angular from "angular-eslint";
import { defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    // Scoped to TypeScript: the type-aware configs below need the TS parser,
    // and Angular templates are parsed by angular-eslint instead.
    files: ["src/**/*.ts", "vite.config.ts", "vitest.config.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        // Each file is checked with the tsconfig that includes it, through
        // the solution in tsconfig.json.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      // Angular marks what it is replacing with @deprecated, so an upgrade
      // shows up here rather than when the API is finally removed.
      "@typescript-eslint/no-deprecated": "error",
      // A component's class can be empty: its decorator is what it declares.
      "@typescript-eslint/no-extraneous-class": [
        "error",
        { allowWithDecorator: true },
      ],
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
    // The rules of the game know nothing of how it is shown, so specs drive
    // them directly and the shell can change around them.
    files: ["src/game/**/*.ts"],
    rules: {
      "no-restricted-imports": [
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
  {
    // Templates are linted for accessibility too, which catches a visible state
    // with no announced state to match it.
    files: ["src/**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      "@angular-eslint/template/button-has-type": "error",
      "@angular-eslint/template/prefer-control-flow": "error",
      "@angular-eslint/template/prefer-self-closing-tags": "error",
      "@angular-eslint/template/prefer-template-literal": "error",
    },
  },
  {
    files: ["src/**/*.spec.ts", "src/testing/**/*.ts"],
    rules: {
      // A test's `!` states a precondition, and should fail loudly if it is
      // ever wrong.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // The scripts are plain JavaScript, so JSDoc is the only place a type can
    // go: every parameter and every returned value carries one, and
    // tsconfig.scripts.json checks them.
    files: ["tools/**/*.mjs"],
    extends: [
      eslint.configs.recommended,
      jsdoc.configs["flat/recommended-typescript-flavor-error"],
    ],
    rules: {
      // tsc reports an undefined name, and knows Node's globals.
      "no-undef": "off",
      // A function that takes and returns nothing may go without a comment;
      // any other needs one to carry its types.
      "jsdoc/require-jsdoc": ["error", { exemptEmptyFunctions: true }],
      // A tag is described only when the description adds something.
      "jsdoc/require-param-description": "off",
      "jsdoc/require-property-description": "off",
      "jsdoc/require-returns-description": "off",
      // One blank line after the summary, none between the tags.
      "jsdoc/tag-lines": ["error", "never", { startLines: 1 }],
    },
  },
);
