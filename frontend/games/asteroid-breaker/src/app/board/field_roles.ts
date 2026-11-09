import type { PaletteRole } from "@fz/style/themes";
import type { PaletteRoles } from "../../view/colors/palette";

/** The page's role for each of the colors the field is drawn in. */
export const FIELD_ROLES: Readonly<Record<keyof PaletteRoles, PaletteRole>> = {
  field: "field",
  fieldLine: "field-line",
  fieldText: "field-text",
  fieldMuted: "field-muted",
  accent: "accent",
  onAccent: "on-accent",
  danger: "danger",
  warning: "warning",
};
