/**
 * Says how far whatever the shell lays over the drawable area reaches in from
 * each of its edges, in CSS pixels.
 */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Nothing laid over any edge. */
export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Describes the area the board is laid out within, in device pixels. */
export interface Viewport {
  /** Available width in device pixels. */
  width: number;
  /** Available height in device pixels. */
  height: number;
  /**
   * Device pixels per CSS pixel, which converts a measurement taken from the
   * DOM, such as {@link insets}, to match the canvas.
   */
  pixelRatio: number;
  /**
   * How far in from each edge anything laid over the drawable area reaches,
   * such as the shell's header, in CSS pixels; none when omitted. The board
   * lays itself out inside them.
   */
  insets?: Insets;
}
