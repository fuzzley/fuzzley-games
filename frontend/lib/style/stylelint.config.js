// `yarn workspace @fz/style lint:styles` checks every stylesheet under src/
// with the rules the library gives the apps.

/** @type {import("stylelint").Config} */
export default {
  extends: ["./src/stylelint.ts"],
  overrides: [
    {
      // Where the colors are written down: the palettes, and the shadows,
      // which are the same in every palette.
      files: ["src/tokens/_palettes.scss", "src/tokens/_shadows.scss"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
      },
    },
  ],
};
