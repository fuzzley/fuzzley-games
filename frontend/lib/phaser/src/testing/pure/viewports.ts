import { type Insets, NO_INSETS } from "../../insets";
import type { Viewport } from "../../layout";

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
