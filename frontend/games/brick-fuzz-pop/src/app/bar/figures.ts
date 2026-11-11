import type { GameViewportService } from "@fz/game-ui/viewport";

/**
 * Returns whether the game bar shows every figure, the level, the rows left
 * and the crew beside the rounds and the score: from the width its actions
 * keep their labels at, unless the window is compact.
 */
export function showsEveryFigure(
  viewport: Pick<GameViewportService, "isCompact" | "fitsActionLabels">,
): boolean {
  return !viewport.isCompact() && viewport.fitsActionLabels();
}
