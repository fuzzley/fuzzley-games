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
  // --- Engine tier boundaries ---
  //
  // The architecture the project is built on, as build errors rather than as a
  // convention. Each tier may depend only on the ones below it:
  //
  //   games/*             rules, scoring, deal, layout, zones, gestures
  //     -> engine/tableau   solitaire-family runtime: zones, moves, undo, view
  //     -> engine/render    view contract, layout maths, input, Phaser adapter
  //     -> engine/core      cards, piles, decks, RNG
  //
  // Nothing under src/engine names a game. That is enforced, not asserted.
  //
  // Relying on nobody crossing a tier by accident is how that kind of rule
  // quietly stops being true.
  {
    // The bottom tier: pure card and pile mechanics. Free of rules, rendering,
    // and any framework at all, rxjs included, so it stays usable from anywhere.
    files: ["src/engine/core/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/engine/render/*",
                "@/engine/tableau/*",
                "@/games/*",
                "@/ui/*",
                "phaser",
                "@angular/*",
                "rxjs",
                "rxjs/*",
              ],
              message:
                "engine/core is the bottom tier: no rendering, no game rules, no frameworks.",
            },
          ],
        },
      ],
    },
  },
  {
    // The render tier, minus its Phaser adapter. This is what makes the
    // renderer a port rather than a habit: layout maths, the view contract and
    // the drag maths may not name Phaser, so they stay testable with no mocks.
    files: ["src/engine/render/**/*.ts"],
    ignores: ["src/engine/render/phaser/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "phaser",
                "@/engine/render/phaser/*",
                "@/engine/tableau/*",
                "@/games/*",
                "@/ui/*",
                "@angular/*",
                "rxjs",
                "rxjs/*",
              ],
              message:
                "engine/render sits below games and below the Phaser adapter: no Phaser, no game, no framework.",
            },
          ],
        },
      ],
    },
  },
  {
    // The Phaser adapter may name Phaser, and nothing above it.
    files: ["src/engine/render/phaser/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/engine/tableau/view/table_view_builder",
                "@/games/*",
                "@/ui/*",
                "@angular/*",
                "rxjs",
                "rxjs/*",
              ],
              message:
                "The Phaser adapter draws whatever it is handed: no game, no UI, no reactive library.",
            },
          ],
        },
      ],
    },
  },
  {
    // Games sit at the top of the engine, but below the application shell.
    files: ["src/games/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/ui/*", "@angular/*"],
              message:
                "A game must not depend on the Angular shell that happens to host it.",
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
