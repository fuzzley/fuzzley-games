const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      parserOptions: {
        // Both projects, not `true`: `true` resolves only the nearest
        // tsconfig.json, which excludes **/*.spec.ts, so every file under test/
        // would fail to parse. tsconfig.spec.json is what covers them.
        project: ["./tsconfig.json", "./tsconfig.spec.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Add any specific rule overrides here if needed
    },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      // A test asserts its preconditions by construction: after a deal,
      // `game.getCardById(id)!` states that the card is there, and if the
      // assumption is ever wrong the test should fail loudly on the spot.
      // Defensive branching around it would only hide that.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
