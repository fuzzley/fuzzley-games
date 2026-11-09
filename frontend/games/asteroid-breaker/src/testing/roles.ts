import path from "node:path";
import { stylesheetPalettes } from "@fz/style/testing";
import type { PaletteRoles } from "../view/colors/palette";

/** The colors the page gives the field, as a palette's stylesheet would. */
export const ROLES = {
  field: "#11161f",
  fieldLine: "#3a4250",
  fieldText: "#e8ecf2",
  fieldMuted: "#8a93a3",
  accent: "#4cc38a",
  onAccent: "#08130d",
  danger: "#ff6b5e",
  warning: "#ffb347",
} satisfies PaletteRoles;

/** The game's palettes, as its global stylesheet sets them. */
export const PALETTES = stylesheetPalettes(
  // Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
  path.join(import.meta.dirname, "../app/styles/global.scss"),
);
