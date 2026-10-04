import { Viewport } from "../view/table_view_state";

/** Says what shape of screen a board is drawn on. */
export type FormFactor =
  /** Room to spare: a desktop, a laptop, a tablet. */
  | "roomy"
  /** A phone held upright, or any compact screen taller than it is wide. */
  | "phone-portrait"
  /** A phone on its side, or any compact screen wider than it is tall. */
  | "phone-landscape";

/**
 * The screen width, in CSS pixels, below which a screen is compact.
 *
 * Mirrors the `tablet` breakpoint in `src/ui/app/styles/_breakpoints.scss`.
 */
export const COMPACT_MAX_WIDTH_CSS_PX = 720;

/**
 * The screen height, in CSS pixels, below which a screen is compact however
 * wide it is, which catches a phone on its side.
 *
 * Mirrors `$compact-max-height` in `src/ui/app/styles/_breakpoints.scss`.
 */
export const COMPACT_MAX_HEIGHT_CSS_PX = 500;

/**
 * Returns the shape of screen a viewport is: roomy, or compact and then upright
 * or on its side.
 *
 * An unmeasured viewport reads as roomy.
 */
export function formFactorOf(viewport: Viewport): FormFactor {
  const pixelRatio = viewport.pixelRatio || 1;
  const width = viewport.width / pixelRatio;
  const height = viewport.height / pixelRatio;
  if (width === 0 || height === 0) return "roomy";
  if (
    width >= COMPACT_MAX_WIDTH_CSS_PX &&
    height >= COMPACT_MAX_HEIGHT_CSS_PX
  ) {
    return "roomy";
  }
  // As CSS reads orientation: a square screen is upright.
  return height >= width ? "phone-portrait" : "phone-landscape";
}
