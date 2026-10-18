const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const jsdoc = require("eslint-plugin-jsdoc");

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
  //   engine/board        joins a table game to the Phaser board scene
  //     -> engine/tableau   solitaire-family runtime: zones, moves, undo, view
  //     -> engine/render    view contract, layout maths, input, Phaser adapter
  //     -> engine/core      cards, piles, decks, RNG
  //
  // Games and engine/board sit side by side: neither names the other, and the
  // shell's provider folder is where a game meets its board.
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
                "@/engine/board/*",
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
                "@/engine/board/*",
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
                "@/engine/board/*",
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
                "@/engine/board/*",
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
    // Joins the tableau runtime to the Phaser adapter, which no tier below may
    // do, to build the board scene any table game is drawn on.
    files: ["src/engine/board/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/games/*", "@/ui/*", "@angular/*", "rxjs", "rxjs/*"],
              message:
                "engine/board draws any table game: no game, no UI, no reactive library.",
            },
          ],
        },
      ],
    },
  },
  {
    // Games sit at the top of the engine, but below the application shell,
    // and know nothing of the renderer: the board that draws them is built in
    // engine/board.
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
            {
              group: ["phaser", "@/engine/render/phaser/*", "@/engine/board/*"],
              message:
                "A game is drawn by whatever board it is handed: engine/board builds the Phaser one, and the shell's provider joins the two.",
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
  // --- Node scripts ---
  //
  // The scripts are plain JavaScript, so JSDoc is the only place a type can
  // go: every parameter and every returned value carries one, and
  // tsconfig.scripts.json checks them.
  {
    files: ["tools/**/*.mjs", ".agents/*.mjs"],
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
      // TypeScript types a generator from `@returns {Generator<T>}`, and
      // ignores `@yields`.
      "jsdoc/require-yields": "off",
      // One blank line after the summary, none between the tags.
      "jsdoc/tag-lines": ["error", "never", { startLines: 1 }],
    },
  },
);
