import { type Signal, computed } from "@angular/core";
import type { ThemeService } from "@fz/ui/theme";
import { type BeltPalette, beltPalette } from "../../view/colors/palette";
import { FIELD_ROLES } from "./field_roles";

/**
 * Returns the field's colors from the palette on the page, its roles and its
 * mode at the same moment, as a new object when the field's roles or the
 * mode change.
 */
export function fieldPalette(theme: ThemeService): Signal<BeltPalette> {
  const roles = theme.roles(FIELD_ROLES);
  return computed(() => beltPalette(roles(), theme.mode()));
}
