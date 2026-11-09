import path from "node:path";
import { stylesheetPalettes } from "@fz/style/testing";
import type { PaletteRoles } from "../view/colors/palette";

/** The colors the page gives the field, as a palette's stylesheet would. */
export const ROLES = {
  panel: "#f1f3f5",
  text: "#1f2328",
  accent: "#2a7a3a",
  danger: "#c0392b",
  warning: "#b8860b",
} satisfies PaletteRoles;

/** The game's palettes, as its global stylesheet sets them. */
export const PALETTES = stylesheetPalettes(
  // Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
  path.join(import.meta.dirname, "../app/styles/global.scss"),
);
