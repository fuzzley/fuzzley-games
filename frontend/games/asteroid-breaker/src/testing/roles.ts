import { keysOf } from "@fz/core/records";
import type { PaletteRole } from "@fz/style/themes";
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

/** The page's name for each of the field's roles. */
const ROLE_NAMES: Readonly<Record<keyof PaletteRoles, PaletteRole>> = {
  field: "field",
  fieldLine: "field-line",
  fieldText: "field-text",
  fieldMuted: "field-muted",
  accent: "accent",
  onAccent: "on-accent",
  danger: "danger",
  warning: "warning",
};

/** Gives the page the roles' colors, as a palette's stylesheet would. */
export function paintRoles(): void {
  for (const role of keysOf(ROLE_NAMES)) {
    document.documentElement.style.setProperty(
      `--fz-${ROLE_NAMES[role]}`,
      ROLES[role],
    );
  }
}
