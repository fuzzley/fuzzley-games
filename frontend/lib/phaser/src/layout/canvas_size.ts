import { pixelRatioFor } from "./pixel_ratio";

/** Describes a size in whole device pixels, as the browser counts a box. */
export interface DevicePixelSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Describes the size the host makes a canvas: its backing store, in device
 * pixels, which a scene lays its board out on, the pixel ratio it renders
 * at, and the CSS size it pins the canvas at.
 */
export interface CanvasSize {
  /** The canvas's width, in device pixels. */
  readonly width: number;
  /** The canvas's height, in device pixels. */
  readonly height: number;
  /** The device pixels to a CSS pixel the canvas renders at. */
  readonly pixelRatio: number;
  /** The width the canvas is shown at, in CSS pixels. */
  readonly cssWidth: number;
  /** The height the canvas is shown at, in CSS pixels. */
  readonly cssHeight: number;
}

/**
 * Returns the size the host makes a canvas that fills a box of `bounds` CSS
 * pixels on a display whose ratio is `devicePixelRatio`, at the pixel ratio
 * {@link pixelRatioFor} gives it: the box's device pixels as the browser
 * `counted` them, where the canvas renders at the display's own ratio and
 * the count agrees with the box, each of the canvas's pixels then landing
 * on one of the screen's; or else the box in whole CSS pixels, at least one
 * each way, at the ratio.
 *
 * A count that disagrees with the box predates a resize the browser has yet
 * to report, and one of no pixels would make no canvas, so neither is taken.
 */
export function canvasSizeFor(
  bounds: { readonly width: number; readonly height: number },
  devicePixelRatio: number,
  counted: DevicePixelSize | null = null,
): CanvasSize {
  const pixelRatio = pixelRatioFor(
    devicePixelRatio,
    bounds.width,
    bounds.height,
  );
  const agrees =
    counted !== null &&
    counted.width > 0 &&
    counted.height > 0 &&
    pixelRatio === devicePixelRatio &&
    Math.abs(counted.width - bounds.width * pixelRatio) <= 1 &&
    Math.abs(counted.height - bounds.height * pixelRatio) <= 1;
  if (agrees) {
    return {
      width: counted.width,
      height: counted.height,
      pixelRatio,
      cssWidth: bounds.width,
      cssHeight: bounds.height,
    };
  }
  const cssWidth = Math.max(1, Math.floor(bounds.width));
  const cssHeight = Math.max(1, Math.floor(bounds.height));
  return {
    width: cssWidth * pixelRatio,
    height: cssHeight * pixelRatio,
    pixelRatio,
    cssWidth,
    cssHeight,
  };
}
