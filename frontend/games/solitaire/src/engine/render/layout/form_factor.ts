import { type FormFactor, formFactorAt } from "@fz/game-ui/breakpoints";
import type { Viewport } from "./viewport";

export type { FormFactor };

/**
 * Returns the shape of screen a viewport is: roomy, or compact and then upright
 * or on its side, at the widths every game changes shape at, so the board
 * and the shell's `GameViewportService` agree.
 *
 * An unmeasured viewport reads as roomy.
 */
export function formFactorOf(viewport: Viewport): FormFactor {
  const pixelRatio = viewport.pixelRatio || 1;
  return formFactorAt(
    viewport.width / pixelRatio,
    viewport.height / pixelRatio,
  );
}
