import { type DevicePixelSize, type Viewport, canvasSizeFor } from "../layout";
import {
  canvasInsetsOf,
  watchDevicePixelRatio,
  watchDevicePixels,
} from "../measure";

/**
 * Hands `onChange` the canvas an element makes for a `<fz-phaser-canvas>`
 * that fills it, as the host sizes it, at once and then each time the
 * element changes size in CSS pixels or in device pixels, as a change of
 * zoom or of display changes it: its size and the pixel ratio it renders
 * at, from the element's device pixels where the browser counts them, and
 * the insets the element declares for it, so a placeholder lays its board
 * out as the scene will. Returns a function that stops watching, or null,
 * having measured nothing, where the browser can't watch an element.
 */
export function watchCanvasViewport(
  element: Element,
  onChange: (viewport: Viewport) => void,
): (() => void) | null {
  const view = element.ownerDocument.defaultView;
  let counted: DevicePixelSize | null = null;
  const measure = (): void => {
    const { width, height, pixelRatio } = canvasSizeFor(
      element.getBoundingClientRect(),
      view?.devicePixelRatio ?? 1,
      counted,
    );
    onChange({ width, height, pixelRatio, insets: canvasInsetsOf(element) });
  };
  const stopWatchingSize = watchDevicePixels(element, (size) => {
    counted = size;
    measure();
  });
  if (!stopWatchingSize) return null;
  const stopWatchingRatio = watchDevicePixelRatio(view, measure);
  const stop = (): void => {
    stopWatchingSize();
    stopWatchingRatio?.();
  };
  // The browser first reports the size after a paint, which would show what
  // is laid out from it, such as a placeholder, wrong for a frame.
  try {
    measure();
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}
