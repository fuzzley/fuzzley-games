import { InjectionToken } from "@angular/core";
import type { SnapdomOptions } from "@zumer/snapdom";

/** Describes a page drawn, which gives its picture as a canvas. */
export interface DrawnPage {
  /** Returns the picture on a canvas, for the browser to encode. */
  toCanvas(): Promise<Pick<HTMLCanvasElement, "toDataURL">>;
}

/** Draws an element of the page as snapdom does: the part of snapdom a picture takes. */
export type DrawPage = (
  element: Element,
  options: SnapdomOptions,
) => Promise<DrawnPage>;

/**
 * Loads what draws the page, snapdom, only as a picture is taken, so it is in
 * no app's first download. A spec provides one of its own, as jsdom draws
 * nothing.
 */
export const PAGE_DRAWER = new InjectionToken<() => Promise<DrawPage>>(
  "PAGE_DRAWER",
  {
    providedIn: "root",
    factory: () => async () => (await import("@zumer/snapdom")).snapdom,
  },
);
