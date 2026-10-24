// `yarn workspace @fz/style lint:styles` checks every stylesheet under src/
// with these rules.

/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard-scss"],
  rules: {
    // Colors come from the palettes, read with var(): a stylesheet spells out
    // no color of its own.
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
  overrides: [
    {
      // Where the colors are written down.
      files: ["src/tokens/_palettes.scss"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
      },
    },
  ],
};
