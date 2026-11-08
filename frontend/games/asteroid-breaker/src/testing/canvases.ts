import type { Shape } from "@fz/dev/layout";
import { formFactorAt } from "@fz/game-ui/breakpoints";
import type { Insets } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { viewport } from "@fz/phaser/testing/pure";
import { MARGIN_CSS_PX } from "../view/field/field_metrics";

/** Returns chrome of the same CSS size over each edge. */
export function chrome(css: number): Insets {
  return { top: css, right: css, bottom: css, left: css };
}

/**
 * Returns the canvas a board has in a window of a shape, and its margin,
 * as `@fz/game-ui` and the board lay them out: the window less the bar, or
 * on a compact screen on its side less the rail down its right, at the
 * sizes the app's stylesheets publish, as its spec holds it to; and the
 * margin the board keeps on that screen (`MARGIN_CSS_PX`).
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
  return {
    canvas,
    marginCss: form === "roomy" ? MARGIN_CSS_PX.roomy : MARGIN_CSS_PX.compact,
  };
}
