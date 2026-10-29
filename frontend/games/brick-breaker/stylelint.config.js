// `yarn workspace brick-breaker lint:styles` checks every stylesheet under src/ with
// @fz/style's rules: colors come from its palettes, read with var().

/** @type {import("stylelint").Config} */
export default {
  extends: ["@fz/style/stylelint"],
};
