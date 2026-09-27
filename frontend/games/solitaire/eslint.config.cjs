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
  // Each tier may depend only on the ones below it:
  //
  //   games/*             rules, scoring, deal, layout, zones, gestures
  //     -> engine/tableau   solitaire-family runtime: zones, moves, undo, view
  //     -> engine/render    view contract, layout maths, input, Phaser adapter
  //     -> engine/core      cards, piles, decks, RNG
  {
    // The bottom tier: card and pile mechanics, free of any framework.
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
    // The render tier minus its Phaser adapter, kept free of Phaser so it can
    // be tested without mocks.
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
    // The Phaser adapter may name Phaser, and nothing above it: not even the
    // tableau runtime beside it, whose data reaches it through BoardScene's
    // options.
    files: ["src/engine/render/phaser/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/engine/tableau/*",
                "@/games/*",
                "@/ui/*",
                "@angular/*",
                "rxjs",
                "rxjs/*",
              ],
              message:
                "The Phaser adapter draws whatever it is handed: no tableau runtime, no game, no UI, no reactive library.",
            },
          ],
        },
      ],
    },
  },
  {
    // The solitaire-family runtime, which may use the render tier's contracts
    // but must never name a game.
    files: ["src/engine/tableau/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "phaser",
                "@/engine/render/phaser/*",
                "@/games/*",
                "@/ui/*",
                "@angular/*",
                "rxjs",
                "rxjs/*",
              ],
              message:
                "engine/tableau runs any solitaire: no game, no renderer backend, no UI, and no reactive library — every game inherits this tier, so a dependency here is a dependency of all of them.",
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
              group: ["@/ui/*", "@angular/*", "rxjs", "rxjs/*"],
              message:
                "A game must not depend on the Angular shell that happens to host it, nor on a reactive library: a game publishes with the engine's own event emitter, and the shell adapts at its own boundary.",
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
    // The provider folder is the only part of the shell that names a game, so
    // adding one touches that folder and nothing else in the shell.
    files: ["src/ui/**/*.ts"],
    ignores: ["src/ui/app/provider/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/games/*"],
              message:
                "Only src/ui/app/provider names a game. Reach it through the catalog there instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // Templates are linted for accessibility too, which catches a visible state
    // with no announced state to match it.
    files: ["src/ui/**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  },
  {
    // The engine's own tests are held to the engine's boundary, and play on
    // `test/support/fake_table` rather than a real game.
    files: ["test/engine/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/games/*"],
              message:
                "An engine spec must not name a game. Drive the engine with @test/support/fake_table instead, and if it cannot express what you need, extend the fixture.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      // A test's `!` states a precondition, and should fail loudly if it is
      // ever wrong.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
