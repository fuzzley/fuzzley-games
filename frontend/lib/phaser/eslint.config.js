import { angular, phaser, templates, tests, typescript } from "@fz/dev/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  typescript({
    root: import.meta.dirname,
    files: ["src/**/*.ts", "vitest.config.ts"],
  }),
  // Everything the library defines carries fz, so it never collides with an
  // app's own `app-` components.
  angular({ files: ["src/**/*.ts"], prefix: "fz" }),
  templates({ files: ["src/**/*.html"] }),
  tests({ files: ["src/**/*.spec.ts", "src/test-setup.ts"] }),
  phaser({
    files: ["src/host/**/*.ts", "src/scene/**/*.ts", "src/testing/**/*.ts"],
  }),
  {
    // The pure entries are for a game's code that knows no Phaser and no
    // framework, so they import nothing at all.
    files: ["src/insets/**/*.ts", "src/color/**/*.ts"],
    ignores: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "phaser",
                "@angular/*",
                "@fz/*",
                "rxjs",
                "rxjs/*",
                "../*",
              ],
              message:
                "The pure entries import nothing, so code with no Phaser can take them.",
            },
          ],
        },
      ],
    },
  },
  {
    // A host and a scene run in any app, Angular or not.
    files: ["src/host/**/*.ts", "src/scene/**/*.ts"],
    ignores: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@angular/*",
                "rxjs",
                "rxjs/*",
                "../canvas",
                "../canvas/*",
                "../testing",
                "../testing/*",
              ],
              message:
                "The host and the scene helpers know no framework, and nothing of the canvas built on them.",
            },
          ],
        },
      ],
    },
  },
  {
    // The canvas loads Phaser only once it first needs a host, so an app that
    // loads its scene with import() keeps Phaser out of its first download.
    files: ["src/canvas/**/*.ts"],
    ignores: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "phaser",
                "../host",
                "../host/*",
                "../scene",
                "../scene/*",
              ],
              allowTypeImports: true,
              message:
                "The canvas imports Phaser's entries by type, or with import() when it first needs a host.",
            },
          ],
        },
      ],
    },
  },
);
