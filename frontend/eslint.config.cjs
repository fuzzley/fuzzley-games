const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const jsdoc = require("eslint-plugin-jsdoc");

// `yarn lint` runs ESLint from the repository root, so it can reach .agents/,
// while an editor finds this file from frontend/. The app's patterns start
// with `**/` so they match from either.
module.exports = tseslint.config(
  {
    // Scoped to TypeScript: the type-aware configs below need the TS parser,
    // and Angular templates are parsed by angular-eslint instead.
    files: ["**/src/**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strict,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        // tsconfig.app.json reaches the app from main.ts and leaves out the
        // specs, which tsconfig.spec.json covers.
        project: ["./tsconfig.app.json", "./tsconfig.spec.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Angular marks what it is replacing with @deprecated, so an upgrade
      // shows up here rather than when the API is finally removed.
      "@typescript-eslint/no-deprecated": "error",
      // A component's class can be empty: its decorator is what it declares.
      "@typescript-eslint/no-extraneous-class": [
        "error",
        { allowWithDecorator: true },
      ],
    },
  },
  {
    // Templates are linted for accessibility too, which catches a visible state
    // with no announced state to match it.
    files: ["**/src/**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  },
  {
    files: ["**/src/**/*.spec.ts"],
    rules: {
      // A test's `!` states a precondition, and should fail loudly if it is
      // ever wrong.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  // --- Node scripts ---
  //
  // The scripts are plain JavaScript, so JSDoc is the only place a type can
  // go: every parameter and every returned value carries one, and
  // tsconfig.scripts.json checks them.
  {
    files: [".agents/*.mjs"],
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
