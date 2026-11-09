import type { PaletteRole } from "@fz/style/themes";
import type { PaletteRoles } from "../../view/palette";

/** The page's role for each of the colors the board is drawn in. */
export const BOARD_ROLES: Readonly<Record<keyof PaletteRoles, PaletteRole>> = {
  panel: "panel",
  text: "text",
  accent: "accent",
  danger: "danger",
};
