/**
 * Says how far whatever an app lays over a canvas, such as its bar, reaches
 * in from each of the canvas's edges, in CSS pixels.
 */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Nothing laid over any edge. */
export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
