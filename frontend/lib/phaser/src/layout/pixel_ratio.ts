/**
 * The highest pixel ratio a canvas is rendered at, beyond which sharpness
 * stops visibly improving while the pixel count keeps growing.
 */
export const MAX_PIXEL_RATIO = 3;

/**
 * Returns the pixel ratio a canvas renders at on a display whose ratio is
 * `devicePixelRatio`: the display's, at least 1 and at most
 * {@link MAX_PIXEL_RATIO}.
 *
 * Above the ratio the host renders any canvas at, one too large for its
 * budget of device pixels renders lower still, so what is sized by this
 * matches the canvas most often, not always.
 */
export function canvasPixelRatio(devicePixelRatio: number): number {
  return Math.min(Math.max(devicePixelRatio || 1, 1), MAX_PIXEL_RATIO);
}
