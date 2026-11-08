import type { Insets } from "../insets";

/**
 * The custom properties an element declares a canvas's insets in, for the
 * canvas that fills it: how far in from each edge the app's chrome, such as
 * a bar, lies over the canvas, in CSS pixels.
 */
export const CANVAS_INSET_PROPERTIES: {
  readonly [Edge in keyof Insets]: string;
} = {
  top: "--fz-canvas-inset-top",
  right: "--fz-canvas-inset-right",
  bottom: "--fz-canvas-inset-bottom",
  left: "--fz-canvas-inset-left",
};

/** Describes the slice of `Window` that computes an element's style. */
export interface StyleWindow {
  getComputedStyle(element: StyledElement): {
    getPropertyValue(property: string): string;
  };
}

/** Describes an element as far as its own window computes its style. */
export interface StyledElement {
  readonly ownerDocument: { readonly defaultView: StyleWindow | null };
}

/**
 * Returns the insets an element declares for the canvas that fills it, as
 * its own window computes its style: 0 for an edge it declares none for, or
 * every edge in a document with no window.
 *
 * Reading a computed style can make the browser lay the page out again, so
 * it is read as the canvas changes size, not each frame.
 */
export function canvasInsetsOf(element: StyledElement): Insets {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const read = (edge: keyof Insets): number => {
    const property = CANVAS_INSET_PROPERTIES[edge];
    const inset = Number.parseFloat(style?.getPropertyValue(property) ?? "");
    return Number.isFinite(inset) ? inset : 0;
  };
  return {
    top: read("top"),
    right: read("right"),
    bottom: read("bottom"),
    left: read("left"),
  };
}
