import type { Shape } from "@fz/dev/layout";
import { formFactorAt } from "@fz/game-ui/breakpoints";
import { type Insets, NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";

/** Returns a viewport of a CSS size at a pixel ratio, its chrome as given. */
export function viewport(
  width: number,
  height: number,
  pixelRatio = 1,
  insets: Insets = NO_INSETS,
): Viewport {
  return {
    width: Math.round(width * pixelRatio),
    height: Math.round(height * pixelRatio),
    pixelRatio,
    insets,
  };
}

/** Returns chrome of the same CSS size over each edge. */
export function chrome(css: number): Insets {
  return { top: css, right: css, bottom: css, left: css };
}

/**
 * Returns the canvas a board has in a window of a shape, and its margin,
 * as `@fz/game-ui` and the board lay them out: the window less the bar, 73
 * CSS px tall, or 60 on a compact screen, or on a compact screen on its side
 * less the rail down its right, 64 wide; the margin 24 CSS px, or 12
 * compact.
 */
export function boardOf(shape: Shape): {
  canvas: Viewport;
  marginCss: number;
} {
  const { width, height, deviceScaleFactor } = shape.viewport;
  const form = formFactorAt(width, height);
  const canvas =
    form === "phone-landscape"
      ? viewport(width - 64, height, deviceScaleFactor)
      : viewport(
          width,
          height - (form === "roomy" ? 73 : 60),
          deviceScaleFactor,
        );
  return { canvas, marginCss: form === "roomy" ? 24 : 12 };
}
