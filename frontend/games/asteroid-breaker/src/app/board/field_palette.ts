import { type Signal, computed } from "@angular/core";
import type { ThemeService } from "@fz/ui/theme";
import { type BeltPalette, beltPalette } from "../../view/palette";

/**
 * Returns the field's colors from the palette on the page, its roles and its
 * mode at the same moment, as a new object only when the palette changes.
 */
export function fieldPalette(theme: ThemeService): Signal<BeltPalette> {
  const field = theme.role("field");
  const fieldLine = theme.role("field-line");
  const fieldText = theme.role("field-text");
  const fieldMuted = theme.role("field-muted");
  const accent = theme.role("accent");
  const onAccent = theme.role("on-accent");
  const danger = theme.role("danger");
  const warning = theme.role("warning");
  return computed(() =>
    beltPalette(
      {
        field: field(),
        fieldLine: fieldLine(),
        fieldText: fieldText(),
        fieldMuted: fieldMuted(),
        accent: accent(),
        onAccent: onAccent(),
        danger: danger(),
        warning: warning(),
      },
      theme.mode(),
    ),
  );
}
