import eslint from "@eslint/js";
import angularEslint from "angular-eslint";
import { type Config, defineConfig } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

/** The files a block of rules applies to, as globs from the workspace's folder. */
export interface Files {
  readonly files: readonly string[];
}

/** Says where a workspace's TypeScript is, and the folder its `tsconfig.json` is in. */
export interface TypeScriptFiles extends Files {
  /** The workspace's folder: `import.meta.dirname` in its `eslint.config.js`. */
  readonly root: string;
}

/** Says where a workspace's Angular code is, and the prefix its selectors carry. */
export interface AngularFiles extends Files {
  /** `fz` in a library, so its names never collide with an app's `app`. */
  readonly prefix: string;
}

/**
 * Returns the rules for a workspace's TypeScript: typescript-eslint's strict
 * and stylistic type-checked rules, with the repository's own on top.
 *
 * It fences off every library's testing entry point, which only the files
 * {@link tests} names may import. A workspace's own import fences use
 * `@typescript-eslint/no-restricted-imports`, so that they add to this one
 * rather than replace it.
 */
export function typescript({ files, root }: TypeScriptFiles): Config[] {
  return defineConfig({
    files: [...files],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        // Each file is checked with the tsconfig that includes it, through
        // the solution in the workspace's tsconfig.json.
        projectService: true,
        tsconfigRootDir: root,
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
      // Exported functions and public methods state what they return.
      "@typescript-eslint/explicit-module-boundary-types": "error",
      // A type-only import says so, and disappears from the bundle.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      // `const { omitted, ...rest } = value` is how a key is left out, and a
      // parameter named `_value` is unused on purpose, as TypeScript's
      // noUnusedParameters already allows.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_" },
      ],
      // Numbers and booleans read naturally in a message.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      // A union's new member fails to lint where a switch over it has no
      // case for it, rather than doing nothing there; a `default` is the
      // author saying the rest are alike.
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
      // A library's testing helpers stand in for what an app really runs.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@fz/*/testing", "@fz/*/testing/*"],
              message: "A library's testing helpers are for tests only.",
            },
          ],
        },
      ],
    },
  });
}

/**
 * Returns the rules for a workspace's Angular TypeScript, on top of
 * {@link typescript}'s: angular-eslint's, and the prefix every component and
 * directive selector carries. Templates written inline are linted as
 * {@link templates} are.
 */
export function angular({ files, prefix }: AngularFiles): Config[] {
  return defineConfig({
    files: [...files],
    extends: [angularEslint.configs.tsRecommended],
    processor: angularEslint.processInlineTemplates,
    rules: {
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix, style: "kebab-case" },
      ],
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix, style: "camelCase" },
      ],
    },
  });
}

/**
 * Returns the rules for a workspace's Angular templates, accessibility's
 * among them, which catch a visible state with no announced state to match
 * it.
 */
export function templates({ files }: Files): Config[] {
  return defineConfig({
    files: [...files],
    extends: [
      angularEslint.configs.templateRecommended,
      angularEslint.configs.templateAccessibility,
    ],
    rules: {
      "@angular-eslint/template/button-has-type": "error",
      "@angular-eslint/template/prefer-control-flow": "error",
      "@angular-eslint/template/prefer-self-closing-tags": "error",
      "@angular-eslint/template/prefer-template-literal": "error",
      // A `@switch` with no case for a value renders nothing for it. Its
      // `@default never;` has the compiler hold the cases to every member of
      // a union, as `switch-exhaustiveness-check` does a TypeScript switch.
      "@angular-eslint/template/require-switch-default": "error",
    },
  });
}

/**
 * Returns what a workspace's tests, and the helpers only they use, may do
 * that the rest of its TypeScript may not.
 */
export function tests({ files }: Files): Config[] {
  return defineConfig({
    files: [...files],
    rules: {
      // A test's `!` states a precondition, and should fail loudly if it is
      // ever wrong.
      "@typescript-eslint/no-non-null-assertion": "off",
      // A stub that does nothing says the call doesn't matter to the test.
      "@typescript-eslint/no-empty-function": "off",
      // A mock's type is what it builds, for its specs to read with
      // `ReturnType`, rather than a second copy of its shape.
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Tests are what the libraries' testing helpers are for.
      "no-restricted-imports": "off",
    },
  });
}

/**
 * Returns what code that drives Phaser may do that other TypeScript may not.
 *
 * Phaser types a scene's systems, such as its cameras and scale manager, as
 * always there, though they are not before the scene boots or after it ends,
 * nor are the fields `create()` fills. The guards
 * `no-unnecessary-condition` would take out are what keep a frame or a
 * listener at those moments from throwing.
 */
export function phaser({ files }: Files): Config[] {
  return defineConfig({
    files: [...files],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  });
}

/**
 * Returns the rules for a workspace's Node scripts, which are plain
 * JavaScript, so JSDoc is the only place a type can go: every parameter and
 * every returned value carries one, and the workspace's
 * `tsconfig.scripts.json` checks them.
 */
export function scripts({ files }: Files): Config[] {
  return defineConfig({
    files: [...files],
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
  });
}
