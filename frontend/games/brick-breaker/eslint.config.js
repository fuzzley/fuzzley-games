import { angular, phaser, templates, tests, typescript } from "@fz/dev/eslint";
import { defineConfig } from "eslint/config";

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

/**
 * Returns the block that fences a layer's files off from what it may not
 * import.
 *
 * @param {string} layer
 * @param {{ group: string[], message: string, allowTypeImports?: boolean }[]} patterns
 * @returns {import("eslint").Linter.Config}
 */
function fence(layer, patterns) {
  return {
    files: [`src/${layer}/**/*.ts`],
    ignores: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", { patterns }],
    },
  };
}

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vite.config.ts", "vitest.config.ts"],
  }),
  angular({ files: ["src/**/*.ts"], prefix: "app" }),
  templates({ files: ["src/**/*.html"] }),
  tests({
    files: ["src/**/*.spec.ts", "src/testing/**/*.ts", "src/test-setup.ts"],
  }),
  phaser({ files: ["src/scene/**/*.ts"] }),
  // Each layer imports only the layers below it: rules, then view, then
  // scene, then app.
  fence("rules", [
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
  ]),
  fence("view", [
    {
      group: [
        ...PHASER,
        ...FRAMEWORKS,
        ...SHELL_LIBRARIES,
        // An entry, never the package: git's ignore rules can't take back a
        // file whose folder is excluded.
        "@fz/phaser/*",
        "!@fz/phaser/color",
        "!@fz/phaser/insets",
        "!@fz/phaser/layout",
      ],
      message:
        "The view is plain TypeScript: no Phaser, no framework, and of @fz/phaser only its pure entries.",
    },
    {
      group: ["**/scene", "**/scene/**", "**/app", "**/app/**"],
      message: "The view knows nothing of the scene or the shell.",
    },
  ]),
  fence("scene", [
    {
      group: [...FRAMEWORKS, ...SHELL_LIBRARIES, "@fz/phaser/canvas"],
      message: "The scene draws with Phaser alone, and knows no framework.",
    },
    {
      group: ["**/app", "**/app/**"],
      message: "The scene knows nothing of the shell.",
    },
  ]),
  fence("app", [
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
  ]),
);
