import { type Signal, computed } from "@angular/core";
import type { ThemeService } from "@fz/ui/theme";
import { type BricksPalette, bricksPalette } from "../../view/palette";

/**
 * Returns the field's colors from the palette on the page, its roles and its
 * mode at the same moment, as a new object only when the palette changes.
 */
export function fieldPalette(theme: ThemeService): Signal<BricksPalette> {
  const panel = theme.role("panel");
  const text = theme.role("text");
  const accent = theme.role("accent");
  const danger = theme.role("danger");
  const warning = theme.role("warning");
  return computed(() =>
    bricksPalette(
      {
        panel: panel(),
        text: text(),
        accent: accent(),
        danger: danger(),
        warning: warning(),
      },
      theme.mode(),
    ),
  );
}
