// `yarn workspace sudoku lint:styles` checks every stylesheet under src/ with
// @fz/style's rules: colors come from its palettes, read with var().

/** @type {import("stylelint").Config} */
export default {
  extends: ["@fz/style/stylelint"],
  overrides: [
    {
      // The player's ink, the one place the game writes a color of its own.
      files: ["src/app/board/_inks.scss"],
      rules: {
        "color-no-hex": null,
      },
    },
  ],
};
