import type { Insets } from "@fz/phaser/insets";

// The board's layout reads them under these names, as the host measures them.
export { type Insets, NO_INSETS } from "@fz/phaser/insets";

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
