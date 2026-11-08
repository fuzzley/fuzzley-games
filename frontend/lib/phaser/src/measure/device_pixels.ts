import type { DevicePixelSize } from "../layout";

/**
 * Starts reporting an element's size each time it changes in device pixels,
 * as the browser counts them, or, where it cannot count them, each time it
 * changes in CSS pixels, as null. Returns a function that stops it, or null
 * where the host cannot watch the element at all.
 *
 * A change of zoom or of display can leave the size it watches as it was,
 * which `watchDevicePixelRatio()` hears.
 */
export type WatchDevicePixels = (
  target: object,
  onResize: (counted: DevicePixelSize | null) => void,
) => (() => void) | null;

/**
 * Watches an element with a `ResizeObserver`, counting its content box in device
 * pixels where the browser can.
 */
export const watchDevicePixels: WatchDevicePixels = (target, onResize) => {
  if (
    typeof ResizeObserver === "undefined" ||
    typeof Element === "undefined" ||
    !(target instanceof Element)
  ) {
    return null;
  }
  const observer = new ResizeObserver((entries) => {
    // Optional because a browser without the box leaves it out.
    const latest = entries[entries.length - 1] as
      | Partial<Pick<ResizeObserverEntry, "devicePixelContentBoxSize">>
      | undefined;
    const box = latest?.devicePixelContentBoxSize?.[0];
    onResize(box ? { width: box.inlineSize, height: box.blockSize } : null);
  });
  try {
    observer.observe(target, { box: "device-pixel-content-box" });
  } catch {
    // A browser without the box, such as Safari, still reports a change of
    // CSS pixels.
    observer.observe(target);
  }
  return () => {
    observer.disconnect();
  };
};
