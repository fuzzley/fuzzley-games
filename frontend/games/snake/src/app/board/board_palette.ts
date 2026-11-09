import { type Signal, computed } from "@angular/core";
import type { ThemeService } from "@fz/ui/theme";
import { type SnakePalette, snakePalette } from "../../view/palette";
import { BOARD_ROLES } from "./board_roles";

/**
 * Returns the board's colors from the palette on the page, as a new object
 * when the board's roles change.
 */
export function boardPalette(theme: ThemeService): Signal<SnakePalette> {
  const roles = theme.roles(BOARD_ROLES);
  return computed(() => snakePalette(roles()));
}
