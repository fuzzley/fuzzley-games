import { formFactorAt } from "@fz/game-ui/breakpoints";
import type { Insets } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { viewport } from "@fz/phaser/testing/pure";
import { MARGIN_CSS_PX } from "../view/field/field_metrics";

/**
 * How much of a window the game's chrome takes, in CSS pixels, as
 * `@fz/game-ui` lays it out and `plan.md`'s table of shapes counts it: the
 * bar's height across a roomy window and along a compact upright one, and
 * the rail's width down a compact one on its side.
 */
export const CHROME_CSS_PX = { roomy: 73, compact: 60, rail: 64 } as const;

/** Returns insets of the same CSS size on every edge, as a margin is. */
export function marginInsets(css: number): Insets {
  return { top: css, right: css, bottom: css, left: css };
}

/**
 * Returns the canvas a board has in a window of a CSS size at a pixel
 * ratio: the window less the bar, or on a compact screen on its side less
 * the rail, its insets the margin the board keeps on that screen
 * ({@link MARGIN_CSS_PX}).
 */
export function boardCanvas(
  width: number,
  height: number,
  pixelRatio = 1,
): Viewport {
  const form = formFactorAt(width, height);
  const margin = form === "roomy" ? MARGIN_CSS_PX.roomy : MARGIN_CSS_PX.compact;
  const insets = marginInsets(margin);
  return form === "phone-landscape"
    ? viewport(width - CHROME_CSS_PX.rail, height, pixelRatio, insets)
    : viewport(
        width,
        height -
          (form === "roomy" ? CHROME_CSS_PX.roomy : CHROME_CSS_PX.compact),
        pixelRatio,
        insets,
      );
}
