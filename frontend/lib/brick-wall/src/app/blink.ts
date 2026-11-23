import type { GameViewportService } from "@fz/game-ui/viewport";

/**
 * Returns what a wall game's scene's `blink()` reads each frame to hold its
 * cue shown rather than blinking: whether the player asks for less motion,
 * as their wish stands each time it is read.
 */
export function steadyForLessMotion(
  viewport: Pick<GameViewportService, "allowsMotion">,
): () => boolean {
  return () => !viewport.allowsMotion();
}
