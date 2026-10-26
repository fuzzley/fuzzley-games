// The widths every game changes shape at, in CSS pixels, with no framework,
// so a game's renderer can read them as well as its shell. The Sass mixins in
// `_index.scss` beside it apply the same ones, as `breakpoints.spec.ts`
// checks.

/** Says what shape of screen a game is played on. */
export type FormFactor =
  /** Room to spare: a desktop, a laptop, a tablet. */
  | "roomy"
  /** A phone held upright, or any compact screen taller than it is wide. */
  | "phone-portrait"
  /** A phone on its side, or any compact screen wider than it is tall. */
  | "phone-landscape";

/**
 * The width below which a screen is compact, and the bar shrinks: along the
 * bottom of a phone held upright, or down the side of one on its side. The
 * Sass calls it `tablet`.
 */
export const COMPACT_MAX_WIDTH_PX = 720;

/**
 * The height below which a screen is compact however wide it is, which
 * catches a phone on its side.
 */
export const COMPACT_MAX_HEIGHT_PX = 500;

/**
 * The width below which the bar's actions lose their labels and become icon
 * buttons. The Sass calls it `desktop`.
 */
export const LABELLED_ACTIONS_MIN_WIDTH_PX = 1200;

/** The width from which the bar has room for the Fuzzley Games wordmark. */
export const WORDMARK_MIN_WIDTH_PX = 1280;

/**
 * The width below which a compact bar has no room for the home button, so the
 * link home moves into the overflow menu.
 */
export const HOME_BUTTON_MIN_WIDTH_PX = 360;

/**
 * Returns the shape of a screen of a size in CSS pixels: roomy, or compact and
 * then upright or on its side, as CSS reads orientation, where a square
 * screen is upright. An unmeasured screen reads as roomy.
 */
export function formFactorAt(width: number, height: number): FormFactor {
  if (width === 0 || height === 0) return "roomy";
  if (width >= COMPACT_MAX_WIDTH_PX && height >= COMPACT_MAX_HEIGHT_PX) {
    return "roomy";
  }
  return height >= width ? "phone-portrait" : "phone-landscape";
}
