/**
 * The highest pixel ratio a canvas is rendered at, beyond which sharpness
 * stops visibly improving while the pixel count keeps growing.
 */
export const MAX_PIXEL_RATIO = 3;

/**
 * The pixel ratio a canvas of any size may render at. Above it, the canvas
 * must also hold no more than {@link MAX_BUDGETED_DEVICE_PIXELS}.
 */
export const UNBUDGETED_PIXEL_RATIO = 2;

/**
 * The most device pixels a canvas rendered above
 * {@link UNBUDGETED_PIXEL_RATIO} may hold: room for a large phone at 3x,
 * whose canvas a browser would otherwise stretch, but not for a laptop,
 * which keeps to 2x.
 */
export const MAX_BUDGETED_DEVICE_PIXELS = 4_500_000;

/**
 * Returns the pixel ratio a canvas renders at on a display whose ratio is
 * `devicePixelRatio`: the display's, at least 1 and at most
 * {@link MAX_PIXEL_RATIO}.
 *
 * Above {@link UNBUDGETED_PIXEL_RATIO}, a canvas too large for its budget of
 * device pixels renders lower still, as `canvasSizeFor()` works out from its
 * size, so what is sized by this matches the canvas most often, not always.
 */
export function canvasPixelRatio(devicePixelRatio: number): number {
  return Math.min(Math.max(devicePixelRatio || 1, 1), MAX_PIXEL_RATIO);
}

/**
 * Returns the pixel ratio the host renders a canvas of `cssWidth` by
 * `cssHeight` CSS pixels at, on a display whose ratio is `devicePixelRatio`:
 * the display's, as {@link canvasPixelRatio} bounds it, but above
 * {@link UNBUDGETED_PIXEL_RATIO} only as far as the canvas stays within
 * {@link MAX_BUDGETED_DEVICE_PIXELS}.
 *
 * The canvas is counted in whole CSS pixels, at least one each way, as the
 * host sizes it.
 */
export function pixelRatioFor(
  devicePixelRatio: number,
  cssWidth: number,
  cssHeight: number,
): number {
  const wanted = canvasPixelRatio(devicePixelRatio);
  if (wanted <= UNBUDGETED_PIXEL_RATIO) return wanted;

  const cssPixels =
    Math.max(1, Math.floor(cssWidth)) * Math.max(1, Math.floor(cssHeight));
  const affordable = Math.sqrt(MAX_BUDGETED_DEVICE_PIXELS / cssPixels);
  return Math.max(UNBUDGETED_PIXEL_RATIO, Math.min(wanted, affordable));
}
