// `yarn workspace @fz/style lint:styles` checks every stylesheet under src/
// with the rules the library gives the apps.

/** @type {import("stylelint").Config} */
export default {
  extends: ["./src/lint/stylelint.ts"],
  overrides: [
    {
      // Where the colors are written down: the palettes, and the shadows,
      // which are the same in every palette, and the palettes a spec reads.
      files: [
        "src/tokens/_palettes.scss",
        "src/tokens/_shadows.scss",
        "src/testing/fixtures/palettes.scss",
      ],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
      },
    },
  ],
};
