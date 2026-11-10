import { statSync } from "node:fs";
import { join, posix } from "node:path";
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
 * Names the imports a fence refuses, and why, as one of
 * `no-restricted-imports`' patterns: by a `group` of paths or by a `regex`.
 */
export type RestrictedImportPattern = (
  | {
      /** Paths as git's ignore rules write them, a `!` taking one back. */
      readonly group: readonly string[];
    }
  | {
      /** A regular expression the path matches. */
      readonly regex: string;
    }
) & {
  /** The names refused of what the pattern matches, where not all are. */
  readonly importNames?: readonly string[];
  /** Whether an import of types alone gets through. */
  readonly allowTypeImports?: boolean;
  readonly message: string;
};

/**
 * Names files outside a game's rules that lint holds to the rules' fence and
 * keeps to what they are handed, as it does the rules, and lets import
 * nothing beside them but one another.
 */
export interface HeldAsRules {
  /** The workspace's folder: `import.meta.dirname` in its `eslint.config.js`. */
  readonly root: string;
  /**
   * The files, by their paths from the workspace's folder, all in one
   * folder, such as the specs' helpers a script runs in Node.
   */
  readonly files: readonly string[];
}

/**
 * Says which libraries' entries a game drawn with Phaser lets its view
 * import beyond what every such game's does, which files outside its rules
 * it holds as the rules are, and whether those keep to exact arithmetic.
 */
export interface PhaserGameLayers {
  /**
   * The libraries' entries the view may import, such as
   * `@fz/style/fuzzball`, beside `@fz/core`, `@fz/phaser`'s pure entries and
   * the types of `@fz/style/themes`. Each is one entry, `@fz/<lib>/<entry>`,
   * never a library's package or a path below an entry, which the view's
   * fence can't let in, nor `@fz/style/themes`, whose values are the shell's.
   */
  readonly viewAllows?: readonly string[];
  readonly heldAsRules?: HeldAsRules;
  /**
   * Whether the rules, and the files held as they are, keep to arithmetic
   * every engine rounds alike: `+`, `-`, `*`, `/` and the functions of `Math`
   * whose every digit the standard fixes, each called by its name.
   *
   * The view, whose art turns with `cos` and `sin`, never does.
   */
  readonly exact?: boolean;
}

// The global only Phaser's CommonJS build sets, which the specs load
// (`phaserFromCommonJs()` in src/vitest.ts), and its ESM build, which the
// games ship, doesn't; Phaser's types declare it all the same.
const PHASER_GLOBAL = {
  name: "Phaser",
  message:
    'Import Phaser from "phaser". Only the build the specs load sets a global Phaser, so code that reads it passes its specs and throws in the game.',
};

/**
 * Returns the rules for a workspace's TypeScript: typescript-eslint's strict
 * and stylistic type-checked rules, with the repository's own on top.
 *
 * It fences off every library's testing entry point, which only the files
 * {@link tests} names may import, and the global `Phaser`, which only the
 * build of Phaser the specs load sets. A workspace's own import fences use
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
      // Read through `window` or `globalThis` too, as Phaser's types let it.
      "no-restricted-globals": [
        "error",
        { globals: [PHASER_GLOBAL], checkGlobalObject: true },
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
  // Asteroid Breaker's scripts config checks this file with
  // exactOptionalPropertyTypes, which won't pass on a processor angular-eslint
  // types as maybe missing, though its template plugin always has one.
  const processor = angularEslint.processInlineTemplates;
  if (!processor) {
    throw new Error("angular-eslint has no processor for inline templates.");
  }
  return defineConfig({
    files: [...files],
    extends: [angularEslint.configs.tsRecommended],
    processor,
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
      // @fz/game-ui's Pause and Sound fill the button they are on with its
      // icon and its name, which the rule can't see from the app's template.
      "@angular-eslint/template/elements-content": [
        "error",
        { allowList: ["fzBarPause", "fzBarSound"] },
      ],
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

// The folders of a game's rules and its view.
const RULES = ["src/rules/**/*.ts"];
const VIEW = ["src/view/**/*.ts"];

// Phaser itself, anchored, so @fz/phaser's entries aren't taken for it.
const PHASER = ["/phaser", "/phaser/*"];

// The frameworks the rules and the view are free of.
const FRAMEWORKS = ["@angular/*", "rxjs", "rxjs/*"];

// The libraries of the shell, which only it uses.
const SHELL_LIBRARIES = [
  "@fz/ui",
  "@fz/ui/*",
  "@fz/game-ui",
  "@fz/game-ui/*",
  "@fz/style",
  "@fz/style/*",
];

// @fz/phaser's entries that know no Phaser and no framework, the folders
// lib/phaser/eslint.config.js fences as its pure entries, and the fuzzball
// drawn in their shapes, so the two lists change together.
const PURE_PHASER_ENTRIES = [
  "@fz/phaser/color",
  "@fz/phaser/fuzzball",
  "@fz/phaser/insets",
  "@fz/phaser/layout",
  "@fz/phaser/shapes",
];

// Why the rules and the view read only what they are handed: a game taken up,
// a run played again from its seed, as an autopilot plays one, and a level, a
// wave or a puzzle made again from it all rely on a game playing the same from
// the same seed, moves and frames.
const CLOCK =
  "The rules and the view keep time by what the scene or the shell hands them, never by the clock or a timer, so a game plays the same again from the same moves and frames.";
const RANDOM =
  "The rules and the view draw their numbers from a seed they are handed, with @fz/core/random's createRandom() or drawAt(), so a game plays the same again from its seed.";
const MIXED_SEED =
  "The rules and the view mix a seed with a number through @fz/core/random's mixSeed(), in a stream named for what it is mixed for, never by hand, so no two streams draw from the same seeds and each stream's are pinned in its spec.";
const PAGE =
  "The rules and the view read nothing of the page, which the scene or the shell reads and hands them, so a game plays the same in Node as on the page.";
const STORAGE =
  "The rules and the view read nothing stored or fetched: the shell reads what is kept and hands them the record, so a game plays the same from the record it is handed, in Node as on the page.";

// The globals that read the clock, a number drawn from no seed, the page or
// what is stored or fetched, each group with its reason. The page's global
// object is among them under each of its names, so none of the others is
// reached through it.
const NONDETERMINISTIC_GLOBALS = [
  {
    names: [
      "performance",
      "setTimeout",
      "setInterval",
      "requestAnimationFrame",
      "requestIdleCallback",
    ],
    message: CLOCK,
  },
  { names: ["crypto"], message: RANDOM },
  {
    names: [
      "window",
      "self",
      "globalThis",
      "top",
      "parent",
      "frames",
      "opener",
      "document",
      "navigator",
      "location",
      "history",
      "screen",
      "visualViewport",
      "matchMedia",
      "devicePixelRatio",
      "innerWidth",
      "innerHeight",
      "getComputedStyle",
      "addEventListener",
      "ResizeObserver",
    ],
    message: PAGE,
  },
  {
    names: [
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "caches",
      "cookieStore",
      "fetch",
    ],
    message: STORAGE,
  },
];

// The properties that draw a number from no seed, mix a seed by hand or read
// the clock, each with its reason.
const NONDETERMINISTIC_PROPERTIES = [
  { object: "Math", property: "random", message: RANDOM },
  { object: "Math", property: "imul", message: MIXED_SEED },
  { object: "Date", property: "now", message: CLOCK },
];

// Math's functions whose every digit the standard fixes, so every engine
// returns the same: the only ones exact arithmetic lets the rules call. A
// function the language adds is refused until someone checks it joins them.
const EXACT_MATH = [
  "abs",
  "ceil",
  "floor",
  "fround",
  "max",
  "min",
  "round",
  "sign",
  "sqrt",
  "trunc",
];

const EXACT = `The rules, and what is held as they are, use only + - * / and the functions of Math whose every digit the standard fixes (${EXACT_MATH.join(", ")}), each called by its name, so a run plays the same on every engine.`;

// The members of Math exact arithmetic lets by: the exact functions, and
// those no-restricted-properties refuses already, with a reason of their own.
const MATH_LET_BY = [
  ...EXACT_MATH,
  ...NONDETERMINISTIC_PROPERTIES.filter(({ object }) => object === "Math").map(
    ({ property }) => property,
  ),
].join("|");

// What exact arithmetic refuses: of Math, every member but the exact
// functions, so the language's later ones too, and any way of reaching one
// that isn't its name; and `**`, which rounds as Math.pow() does.
const INEXACT_SYNTAX = [
  {
    selector: `MemberExpression[object.name="Math"][computed=false]:not([property.name=/^(${MATH_LET_BY})$/])`,
    message: `Math's other functions leave their last digit to the engine, or are yet to be checked, and its constants, such as π, are written out. ${EXACT}`,
  },
  {
    selector: 'MemberExpression[object.name="Math"][computed=true]',
    message: `A member of Math reached by a value, not its name, may be any of them. ${EXACT}`,
  },
  {
    selector: 'VariableDeclarator[init.name="Math"]',
    message: `Math taken apart or named again hides which of its members are called. ${EXACT}`,
  },
  {
    selector: 'BinaryExpression[operator="**"]',
    message: `** leaves its last digit to the engine, as Math.pow() does. ${EXACT}`,
  },
  {
    selector: 'AssignmentExpression[operator="**="]',
    message: `**= leaves its last digit to the engine, as Math.pow() does. ${EXACT}`,
  },
];

// @fz/core/random's randomSeed(), which draws from Math.random() unless handed
// another source. The rules' and the view's fences hold it, since a
// no-restricted-imports of deterministic()'s own would replace theirs.
const RANDOM_SEED: RestrictedImportPattern = {
  group: ["@fz/core/random"],
  importNames: ["randomSeed"],
  message: RANDOM,
};

// The rules' fence, which what is held as the rules are holds to too.
const RULES_FENCE: readonly RestrictedImportPattern[] = [
  {
    // @fz/* names a library's package, and refuses its entries as a folder's
    // files, so @fz/core taken back lets its entries in; the view's fence
    // names the entries (@fz/*/*), so it takes them back by name.
    group: [...PHASER, ...FRAMEWORKS, "@fz/*", "!@fz/core"],
    message: "The rules use no framework and no library but @fz/core.",
  },
  {
    group: ["**/view", "**/view/**", "**/scene", "**/scene/**"],
    message: "The rules know nothing of how the game is drawn.",
  },
  {
    group: ["**/app", "**/app/**"],
    message: "The rules know nothing of the shell.",
  },
  {
    group: ["**/testing", "**/testing/**"],
    message: "The rules know nothing of the specs' helpers.",
  },
  RANDOM_SEED,
];

// A library's entry, the one kind of path the view's fence can let back in.
const LIBRARY_ENTRY = /^@fz\/[\w-]+\/[\w-]+$/;

// @fz/style's themes, which the view takes by type alone, such as the mode
// that picks a palette's inks, while the palettes themselves and the key a
// choice is kept under are the shell's.
const THEMES_ENTRY = "@fz/style/themes";

/**
 * Returns the view's fence, which lets in, of the libraries, `@fz/core`,
 * `@fz/phaser`'s pure entries, the entries given and the types of
 * `@fz/style/themes`.
 */
function viewFence(allows: readonly string[]): RestrictedImportPattern[] {
  const entries = [...PURE_PHASER_ENTRIES, ...allows];
  const libraries = `@fz/core, ${entries.join(", ")} and the types of ${THEMES_ENTRY}`;
  return [
    {
      group: [
        ...PHASER,
        ...FRAMEWORKS,
        // Every library's entries, never a package, where one is let back
        // in: git's ignore rules can't take back a file whose folder is
        // excluded.
        "@fz/*/*",
        "!@fz/core/*",
        ...entries.map((entry) => `!${entry}`),
        `!${THEMES_ENTRY}`,
      ],
      message: `The view is plain TypeScript: no Phaser, no framework, and of the libraries only ${libraries}.`,
    },
    {
      // A library's package itself, but @fz/core, which a pattern of its own
      // names without excluding the entries let in.
      regex: "^@fz/(?!core$)[^/]+$",
      message: `The view takes of the libraries only ${libraries}.`,
    },
    {
      // A type import this matches skips every pattern of the fence, so it
      // names the one entry.
      group: [THEMES_ENTRY],
      allowTypeImports: true,
      message: `The view takes ${THEMES_ENTRY} by type alone, such as ColorMode: the shell reads the palette on the page and hands the view its roles and mode.`,
    },
    {
      group: ["**/scene", "**/scene/**", "**/app", "**/app/**"],
      message: "The view knows nothing of the scene or the shell.",
    },
    RANDOM_SEED,
  ];
}

const SCENE_FENCE: readonly RestrictedImportPattern[] = [
  {
    group: [...FRAMEWORKS, ...SHELL_LIBRARIES, "@fz/phaser/canvas"],
    message: "The scene draws with Phaser alone, and knows no framework.",
  },
  {
    group: ["**/app", "**/app/**"],
    message: "The scene knows nothing of the shell.",
  },
];

const APP_FENCE: readonly RestrictedImportPattern[] = [
  {
    group: PHASER,
    message:
      "The shell never imports Phaser: the board loads the scene with import().",
  },
  {
    group: [
      "**/scene",
      "**/scene/**",
      "@fz/phaser/host",
      "@fz/phaser/scene",
      "@fz/phaser/sound",
    ],
    allowTypeImports: true,
    message:
      "The shell takes the scene and the host by type, and the board loads the scene with import(), so Phaser stays out of the first download.",
  },
];

/** Returns the block that fences files, but their specs, off from what they may not import. */
function fence(
  files: readonly string[],
  patterns: readonly RestrictedImportPattern[],
): Config {
  return {
    files: [...files],
    ignores: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", { patterns }],
    },
  };
}

/**
 * Returns the block that keeps files, but their specs, from reading the
 * clock, a number drawn from no seed, a seed mixed by hand, the page or what
 * is stored or fetched, and, with `exact`, to arithmetic every engine rounds
 * alike.
 *
 * Exact arithmetic's refusals join this block's own, since a later block
 * setting the same rules would replace them.
 */
function deterministic(
  files: readonly string[],
  { exact = false }: { readonly exact?: boolean } = {},
): Config {
  return {
    files: [...files],
    ignores: ["**/*.spec.ts"],
    rules: {
      "no-restricted-properties": ["error", ...NONDETERMINISTIC_PROPERTIES],
      // Phaser's again, since this list replaces typescript()'s.
      "no-restricted-globals": [
        "error",
        PHASER_GLOBAL,
        ...NONDETERMINISTIC_GLOBALS.flatMap(({ names, message }) =>
          names.map((name) => ({ name, message })),
        ),
      ],
      // A date made from a time it is given is the same every run; one made
      // from nothing, or by calling `Date()`, is now.
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: `new Date() reads the clock. ${CLOCK}`,
        },
        {
          selector: "CallExpression[callee.name='Date']",
          message: `Date() reads the clock. ${CLOCK}`,
        },
        ...(exact ? INEXACT_SYNTAX : []),
      ],
    },
  };
}

/**
 * Returns whether a path names one file from the workspace's folder, as a
 * block's `files` matches it alone: no glob, nothing outside the folder and
 * nothing to normalize.
 */
function isPlainPath(file: string): boolean {
  return (
    !/[*?[\]{}!\\]/.test(file) &&
    !posix.isAbsolute(file) &&
    !file.startsWith("../") &&
    posix.normalize(file) === file
  );
}

/**
 * Returns text with exactly the syntax characters of a regular expression
 * escaped: with `/`, the only identity escapes the `u` flag allows, which
 * `no-restricted-imports` compiles a pattern with.
 *
 * Escaping more, such as `-`, would make ESLint's `new RegExp(…, "iu")`
 * throw.
 */
function escapeRegExp(text: string): string {
  return text.replaceAll(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

/**
 * Returns the pattern that lets the files held as the rules are import
 * nothing beside them but one another, once it has checked they are files of
 * one folder, named by their paths from the workspace's folder, which it has.
 */
function heldTogether({ root, files }: HeldAsRules): RestrictedImportPattern {
  const notPlain = files.find((file) => !isPlainPath(file));
  if (notPlain !== undefined) {
    throw new Error(
      `phaserGameLayers()'s heldAsRules takes only files by their paths from the workspace's folder, as src/testing/autopilot.ts, never a glob, not "${notPlain}".`,
    );
  }
  const folders = [...new Set(files.map((file) => posix.dirname(file)))];
  if (folders.length > 1) {
    throw new Error(
      `phaserGameLayers()'s heldAsRules takes only files of one folder, which may import one another, not files of "${folders.join('" and "')}".`,
    );
  }
  const missing = files.find(
    (file) => !statSync(join(root, file), { throwIfNoEntry: false })?.isFile(),
  );
  if (missing !== undefined) {
    throw new Error(
      `phaserGameLayers()'s heldAsRules names "${missing}", which the workspace doesn't have, and ESLint would pass over without a word.`,
    );
  }
  const names = files.map((file) => escapeRegExp(posix.basename(file, ".ts")));
  return {
    regex: `^\\.(?:$|/(?!(?:${names.join("|")})$))`,
    message:
      "What is held as the rules are, such as a helper the scripts load, imports nothing beside it but what is held with it: add the file to heldAsRules in eslint.config.js, which holds it to the rules' fence.",
  };
}

/**
 * Returns the fence around a game's rules (`src/rules/`), but their specs:
 * no framework, no library but `@fz/core`, nothing of how the game is drawn,
 * of its shell or of the specs' helpers, and only what they are handed, so no
 * clock or timer, no number drawn from no seed, no seed mixed by hand,
 * nothing of the page and nothing stored or fetched.
 *
 * A game drawn with Phaser takes it within {@link phaserGameLayers}. ESLint
 * takes a rule's options from the last block that sets it for a file, so a
 * block of the game's own that restricts imports, properties, globals or
 * syntax in its rules replaces these rather than adding to them.
 */
export function gameRules(): Config[] {
  return defineConfig(rulesLayer([], false));
}

/**
 * Returns the rules' fence, and the block that keeps them and the files held
 * as they are to what they are handed, and to exact arithmetic where asked:
 * {@link gameRules}, and the rules' part of {@link phaserGameLayers}.
 */
function rulesLayer(held: readonly string[], exact: boolean): Config[] {
  return [
    fence(RULES, RULES_FENCE),
    deterministic([...RULES, ...held], { exact }),
  ];
}

/**
 * Returns the fences between the layers of a game drawn with Phaser, each a
 * folder under `src/` importing only the layers below it: the rules
 * (`src/rules/`), then the view (`src/view/`), then the scene
 * (`src/scene/`), then the shell (`src/app/`), whose board loads the scene
 * with `import()`. The rules and the view, but their specs, are kept to what
 * they are handed besides: no clock or timer, no number drawn from no seed,
 * no seed mixed by hand, nothing of the page and nothing stored or fetched.
 * With `exact`, the rules and what is held as they are keep to arithmetic
 * every engine rounds alike too.
 *
 * ESLint takes a rule's options from the last block that sets it for a file,
 * so a block of the game's own that restricts imports, properties, globals or
 * syntax in these folders replaces these rather than adding to them; what the
 * game lets in, or holds as the rules are, goes in the options instead.
 *
 * It throws for a path in `viewAllows` that is no library's entry, such as a
 * library's package or a path below an entry, or is `@fz/style/themes`, whose
 * types the view takes already, which the view's fence would name and yet
 * still refuse; and in `heldAsRules`, for a glob or files of two
 * folders, which the sibling pattern can't be built from, or a file the
 * workspace doesn't have, which ESLint would pass over without a word.
 */
export function phaserGameLayers({
  viewAllows = [],
  heldAsRules,
  exact = false,
}: PhaserGameLayers = {}): Config[] {
  const notEntry = viewAllows.find((allowed) => !LIBRARY_ENTRY.test(allowed));
  if (notEntry !== undefined) {
    throw new Error(
      `phaserGameLayers()'s viewAllows takes only a library's entries, as @fz/<lib>/<entry>, which the view's fence can let in, not "${notEntry}".`,
    );
  }
  if (viewAllows.includes(THEMES_ENTRY)) {
    throw new Error(
      `phaserGameLayers()'s viewAllows can't let in ${THEMES_ENTRY}, whose values are the shell's: the view takes its types already.`,
    );
  }
  const held = heldAsRules?.files ?? [];
  return defineConfig(
    fence(VIEW, viewFence(viewAllows)),
    fence(["src/scene/**/*.ts"], SCENE_FENCE),
    fence(["src/app/**/*.ts"], APP_FENCE),
    heldAsRules && held.length > 0
      ? fence(held, [...RULES_FENCE, heldTogether(heldAsRules)])
      : [],
    deterministic(VIEW),
    // After the view's, so a file held as the rules are keeps to exact
    // arithmetic wherever it lies.
    rulesLayer(held, exact),
  );
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
