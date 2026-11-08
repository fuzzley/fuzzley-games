/** Describes the subscription surface of a `MediaQueryList`. */
export interface PixelRatioQuery {
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

/** Describes the slice of a window the pixel ratio of its display is watched through. */
export interface PixelRatioWindow {
  /** Device pixels per CSS pixel for the display the window is on. */
  readonly devicePixelRatio: number;
  /**
   * Matches a media query; a window without them leaves its pixel ratio
   * unwatched.
   */
  matchMedia?(query: string): PixelRatioQuery;
}

/**
 * Calls `onChange` each time the pixel ratio of the display a window is on
 * changes, as a change of zoom or of display changes it, through a
 * `(resolution)` media query for the ratio the window has, armed again for
 * each new one. Returns a function that stops it, or null where the window
 * has no media queries.
 *
 * A change of zoom can leave an element's device pixels as they were, which
 * a `ResizeObserver` on the device-pixel box doesn't report, and a move to
 * another display can leave its CSS pixels as they were, which one on the
 * CSS box doesn't, so whatever is sized from both watches this too.
 */
export function watchDevicePixelRatio(
  view: PixelRatioWindow | null,
  onChange: () => void,
): (() => void) | null {
  if (!view?.matchMedia) return null;
  let query: PixelRatioQuery | null = null;
  const changed = (): void => {
    arm();
    onChange();
  };
  const arm = (): void => {
    query?.removeEventListener("change", changed);
    // The display's own ratio, below 1 too, as zoomed out, where a change
    // of zoom moves the CSS pixels alone.
    const ratio = view.devicePixelRatio || 1;
    query = view.matchMedia?.(`(resolution: ${String(ratio)}dppx)`) ?? null;
    query?.addEventListener("change", changed);
  };
  arm();
  return () => {
    query?.removeEventListener("change", changed);
    query = null;
  };
}
