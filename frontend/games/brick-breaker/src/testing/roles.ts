import type { PaletteRoles } from "../view/palette";

/** The colors the page gives the field, as a palette's stylesheet would. */
export const ROLES = {
  panel: "#f1f3f5",
  text: "#1f2328",
  accent: "#2a7a3a",
  danger: "#c0392b",
  warning: "#b8860b",
} satisfies PaletteRoles;

/** Gives the page the roles' colors, as a palette's stylesheet would. */
export function paintRoles(): void {
  for (const [role, color] of Object.entries(ROLES)) {
    document.documentElement.style.setProperty(`--fz-${role}`, color);
  }
}
