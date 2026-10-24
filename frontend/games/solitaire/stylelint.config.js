// `yarn lint:styles` checks every stylesheet under src/ with @fz/style's
// rules: colours come from the tokens, read with var() (see AGENTS.md).

/** @type {import("stylelint").Config} */
export default {
  extends: ["@fz/style/stylelint"],
  overrides: [
    {
      // Where the colours are written down, which `_tokens.scss` cuts the
      // tokens from.
      files: ["src/ui/app/styles/_palette.scss"],
      rules: {
        "color-no-hex": null,
        "function-disallowed-list": null,
      },
    },
  ],
};
