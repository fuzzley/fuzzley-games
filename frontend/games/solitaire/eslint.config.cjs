const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    // Scoped to TypeScript: the type-aware configs below need the TS parser,
    // and Angular templates are parsed by angular-eslint instead.
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strict,
    ],
    languageOptions: {
      parserOptions: {
        // Both projects, not `true`: `true` resolves only the nearest
        // tsconfig.json, which excludes **/*.spec.ts, so every file under test/
        // would fail to parse. tsconfig.spec.json is what covers them.
        project: ["./tsconfig.json", "./tsconfig.spec.json"],
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    // The architectural boundary the project is built on: the model is pure
    // game logic and must never reach into rendering or the UI. Relying on
    // nobody doing it by accident is how that kind of rule quietly stops being
    // true, so it is enforced here.
    files: ["src/game/model/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/render/**",
                "**/ui/**",
                "@/game/render/*",
                "@/ui/*",
                "phaser",
                "@angular/*",
              ],
              message:
                "The model layer must stay free of rendering, Angular and Phaser.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/ui/**/*.ts"],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
  },
  {
    files: ["src/ui/**/*.html"],
    extends: [...angular.configs.templateRecommended],
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
