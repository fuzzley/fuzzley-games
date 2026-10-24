import type { Config } from "stylelint";

/**
 * The stylelint rules every app's stylesheets keep, which an app extends as
 * `@fz/style/stylelint`: the standard SCSS rules, colors only from the
 * palettes, Sass modules, and nesting at most three deep.
 *
 * A stylesheet that must write a color, such as a drawing's, is listed in the
 * app's own `overrides`.
 */
const preset: Config = {
  extends: ["stylelint-config-standard-scss"],
  rules: {
    // Colors come from the palettes, read with var(): a stylesheet spells
    // out no color of its own.
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": [
      "rgb",
      "rgba",
      "hsl",
      "hsla",
      "hwb",
      "lab",
      "lch",
      "oklab",
      "oklch",
      "color",
    ],
    // Sass modules only; @import is deprecated.
    "at-rule-disallowed-list": ["import"],
    "max-nesting-depth": 3,
  },
};

export default preset;
