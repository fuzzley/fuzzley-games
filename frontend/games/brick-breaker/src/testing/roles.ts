import path from "node:path";
import { keysOf, recordOf } from "@fz/core/records";
import type { PaletteRole, ThemeId } from "@fz/style/themes";
import { type Roles, compileStylesheet, paletteRoles } from "@fz/style/testing";
import { FIELD_ROLES } from "../app/board/field_roles";
import type { PaletteRoles } from "../view/colors/palette";

// Built from `import.meta.dirname`, since jsdom's `URL` isn't Node's.
const GLOBAL = path.join(import.meta.dirname, "../app/styles/global.scss");

/** The colors the page gives the field, as a palette's stylesheet would. */
export const ROLES = {
  panel: "#f1f3f5",
  text: "#1f2328",
  accent: "#2a7a3a",
  danger: "#c0392b",
  warning: "#b8860b",
} satisfies PaletteRoles;

/** Each palette's roles, as the game's stylesheet sets them, once asked for. */
let palettes: ReadonlyMap<string, Roles> | undefined;

/**
 * Gives the page the field's roles, in `ROLES`' colors unless given others,
 * as a palette's stylesheet would.
 */
export function paintRoles(colors: PaletteRoles = ROLES): void {
  for (const key of keysOf(FIELD_ROLES)) {
    document.documentElement.style.setProperty(
      `--fz-${FIELD_ROLES[key]}`,
      colors[key],
    );
  }
}

/** Returns one of a palette's roles, as the game's stylesheet sets it. */
export function stylesheetRole(id: ThemeId, name: PaletteRole): string {
  palettes ??= paletteRoles(compileStylesheet(GLOBAL));
  const value = palettes.get(id)?.get(name);
  if (value === undefined) throw new Error(`No --fz-${name} in ${id}`);
  return value;
}

/**
 * Returns the colors a palette's stylesheet gives the field, through the
 * roles the board reads them by (`FIELD_ROLES`).
 */
export function fieldRolesIn(id: ThemeId): PaletteRoles {
  return recordOf(keysOf(FIELD_ROLES), (key) =>
    stylesheetRole(id, FIELD_ROLES[key]),
  );
}
