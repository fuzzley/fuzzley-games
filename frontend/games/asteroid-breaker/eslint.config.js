import {
  angular,
  phaser,
  scripts,
  templates,
  tests,
  typescript,
} from "@fz/dev/eslint";
import { basename } from "node:path";
import { defineConfig } from "eslint/config";

// Phaser itself, anchored, so @fz/phaser's entries aren't taken for it.
const PHASER = ["/phaser", "/phaser/*"];

// The frameworks the rules and the view are free of.
const FRAMEWORKS = ["@angular/*", "rxjs", "rxjs/*"];

// The shell's libraries but @fz/style, whose fuzzball the view takes.
const UI_LIBRARIES = ["@fz/ui", "@fz/ui/*", "@fz/game-ui", "@fz/game-ui/*"];

// The libraries of the shell, which only it uses.
const SHELL_LIBRARIES = [...UI_LIBRARIES, "@fz/style", "@fz/style/*"];

// Why the rules and the view read only what they are handed: the autopilot, a
// game taken up and Endless's waves made again from their seed all rely on a
// run playing the same from the same seed and the same frames.
const CLOCK =
  "The rules and the view keep time by the frames the scene hands them, never by the clock or a timer, so a run plays the same again from the same frames.";
const RANDOM =
  "The rules and the view draw their numbers from a seed they are handed, with @fz/core/random's createRandom() or drawAt(), so a run plays the same again from its seed.";
const PAGE =
  "The rules and the view read nothing of the page, which the scene and the shell read and hand them, so a run plays the same in Node as on the page.";
const STORAGE =
  "The rules and the view read nothing stored or fetched: the shell reads what is kept and hands them the record, so a run plays the same from the record it is handed, in Node as on the page.";

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

// @fz/core/random's randomSeed(), which draws from Math.random() unless handed
// another source. The rules' and the view's fences hold it, since a
// no-restricted-imports of deterministic()'s own would replace theirs.
const RANDOM_SEED = {
  group: ["@fz/core/random"],
  importNames: ["randomSeed"],
  message: RANDOM,
};

// The rules' fence, which the specs' helpers the scripts load hold to too.
const RULES_FENCE = [
  {
    group: [...PHASER, ...FRAMEWORKS, "@fz/*", "!@fz/core", "!@fz/core/*"],
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

// The specs' helpers the scripts under tools/ load through Vite, and what
// they import of src/testing/, which Node runs without Angular's plugin, as
// it runs the rules, and the report counts on playing the same from a seed.
// A file of src/testing/ off this list is held only to the helpers' fence,
// which lets Angular in by type, so one they import is flagged until it
// joins the list.
const SCRIPT_HELPERS = [
  "src/testing/script_api.ts",
  "src/testing/report_api.ts",
  "src/testing/screenshot_api.ts",
  "src/testing/autopilot.ts",
  "src/testing/kept_run.ts",
];

// A file beside the helpers the scripts load, all in src/testing/, that is
// none of them.
const OFF_SCRIPT_HELPERS = {
  regex: `^\\./(?!(?:${SCRIPT_HELPERS.map((file) => basename(file, ".ts")).join("|")})$)`,
  message:
    "The helpers the scripts load import no other file of src/testing/: add it to SCRIPT_HELPERS in eslint.config.js, which holds it to the rules' fence.",
};

/**
 * Returns the block that fences files off from what they may not import.
 *
 * @param {string[]} files
 * @param {{ group?: string[], regex?: string, importNames?: string[], message: string, allowTypeImports?: boolean }[]} patterns
 * @returns {import("eslint").Linter.Config}
 */
function fence(files, patterns) {
  return {
    files,
    ignores: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", { patterns }],
    },
  };
}

/**
 * Returns the block that keeps files from reading the clock, a number drawn
 * from no seed, the page or what is stored or fetched.
 *
 * ESLint takes a rule's options from the last block that sets it for a file,
 * so another restriction of these three rules for these files joins this
 * block rather than replacing it from one of its own.
 *
 * @param {string[]} files
 * @returns {import("eslint").Linter.Config}
 */
function deterministic(files) {
  return {
    files,
    ignores: ["**/*.spec.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: RANDOM },
        { object: "Date", property: "now", message: CLOCK },
      ],
      "no-restricted-globals": [
        "error",
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
      ],
    },
  };
}

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: [
      "src/**/*.ts",
      "tools/**/*.ts",
      "vite.config.ts",
      "vitest.config.ts",
    ],
  }),
  angular({ files: ["src/**/*.ts"], prefix: "app" }),
  templates({ files: ["src/**/*.html"] }),
  tests({
    files: [
      "src/**/*.spec.ts",
      "src/testing/**/*.ts",
      "src/test-setup.ts",
      "tools/**/*.spec.ts",
    ],
  }),
  phaser({ files: ["src/scene/**/*.ts"] }),
  scripts({
    files: ["tools/**/*.mjs", "eslint.config.js", "stylelint.config.js"],
  }),
  // Each layer imports only the layers below it: rules, then view, then
  // scene, then app.
  fence(["src/rules/**/*.ts"], RULES_FENCE),
  fence(
    ["src/view/**/*.ts"],
    [
      {
        group: [
          ...PHASER,
          ...FRAMEWORKS,
          ...UI_LIBRARIES,
          // Entries, never the package, where one is let back in: git's ignore
          // rules can't take back a file whose folder is excluded.
          "@fz/style/*",
          "!@fz/style/fuzzball",
          "@fz/phaser/*",
          "!@fz/phaser/color",
          "!@fz/phaser/insets",
          "!@fz/phaser/layout",
          "!@fz/phaser/shapes",
        ],
        message:
          "The view is plain TypeScript: no Phaser, no framework, of @fz/style only the fuzzball, and of @fz/phaser only its pure entries.",
      },
      {
        // The package alone, which a pattern of its own can name without
        // excluding the fuzzball.
        regex: "^@fz/style$",
        message: "The view takes of @fz/style only the fuzzball.",
      },
      {
        group: ["**/scene", "**/scene/**", "**/app", "**/app/**"],
        message: "The view knows nothing of the scene or the shell.",
      },
      RANDOM_SEED,
    ],
  ),
  fence(
    ["src/scene/**/*.ts"],
    [
      {
        group: [...FRAMEWORKS, ...SHELL_LIBRARIES, "@fz/phaser/canvas"],
        message: "The scene draws with Phaser alone, and knows no framework.",
      },
      {
        group: ["**/app", "**/app/**"],
        message: "The scene knows nothing of the shell.",
      },
    ],
  ),
  // The specs' helpers take Angular by type alone, so they declare nothing
  // Analog's plugin must compile: every project compiles them with Vite's
  // oxc, alike, and coverage adds their runs up (`vitest.config.ts`).
  fence(
    ["src/testing/**/*.ts"],
    [
      {
        group: ["@angular/*"],
        allowTypeImports: true,
        message:
          "The specs' helpers take Angular by type alone, since every project compiles them with oxc rather than Analog's plugin.",
      },
    ],
  ),
  // The helpers the scripts load hold to the rules' fence, which replaces the
  // one above for them, as the last block to set a rule for a file does.
  fence(SCRIPT_HELPERS, [...RULES_FENCE, OFF_SCRIPT_HELPERS]),
  fence(
    ["src/app/**/*.ts"],
    [
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
    ],
  ),
  // The rules and the view read only what they are handed, and so do the
  // helpers the scripts load, though the messages speak of the rules and the
  // view alone.
  deterministic(["src/rules/**/*.ts", "src/view/**/*.ts", ...SCRIPT_HELPERS]),
);
