// `yarn workspace minesweeper lint:styles` checks every stylesheet under src/
// with @fz/style's rules: colors come from its palettes, read with var().

/** @type {import("stylelint").Config} */
export default {
  extends: ["@fz/style/stylelint"],
  overrides: [
    {
      // The numbers' inks, the one place the game writes its own colors.
      files: ["src/app/board/_inks.scss"],
      rules: {
        "color-no-hex": null,
      },
    },
  ],
};
