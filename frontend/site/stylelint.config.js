// `yarn lint:styles` checks every stylesheet under src/ with these rules.

/** @type {import("stylelint").Config} */
export default {
  extends: ["stylelint-config-standard-scss"],
  rules: {
    // Colors come from @fz/style's palettes, read with var() (see AGENTS.md):
    // a stylesheet spells out no color of its own.
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
      // The shadows, which darken whatever is under them in every palette
      // alike. The palettes are written down in @fz/style.
      files: ["src/app/styles/_shadows.scss"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
      },
    },
  ],
};
