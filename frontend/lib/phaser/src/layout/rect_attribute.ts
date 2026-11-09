import type { CssRect } from "./layout";

/** A name a rectangle is listed by: one word, with no comma in it. */
const RECT_NAME = /^[^\s,]+$/;

/**
 * Returns a rectangle as an element's attribute gives it to the layout
 * check, "x y width height", which `@fz/dev/board-page`'s `readRect()`
 * reads.
 */
export function rectAttribute({ x, y, width, height }: CssRect): string {
  return `${String(x)} ${String(y)} ${String(width)} ${String(height)}`;
}

/**
 * Returns named rectangles as an element's attribute lists them for the
 * layout check, in the order given, each its name and its rectangle as
 * {@link rectAttribute} gives it, parted by commas, as
 * "stick 0 600 180 200, buttons 180 600 180 200", which
 * `@fz/dev/board-page`'s `readNamedRects()` reads. It throws for a name that
 * isn't one word free of commas, which the list couldn't be read back by.
 */
export function namedRectsAttribute(
  rects: readonly (readonly [name: string, rect: CssRect])[],
): string {
  return rects
    .map(([name, rect]) => {
      if (!RECT_NAME.test(name)) {
        throw new Error(
          `A rectangle is listed by a name of one word with no comma, not "${name}".`,
        );
      }
      return `${name} ${rectAttribute(rect)}`;
    })
    .join(", ");
}

/**
 * Returns the styles that lay an element over a rectangle on the canvas, in
 * CSS pixels, as a board lays its focus ring where the scene drew the board.
 *
 * It clears the element's margin, so a stylesheet's `margin: auto`, which
 * centers the element where the stylesheet works the rectangle out until the
 * scene has drawn, doesn't move it.
 */
export function cssRectStyle({
  x,
  y,
  width,
  height,
}: CssRect): Record<string, string> {
  return {
    left: `${String(x)}px`,
    top: `${String(y)}px`,
    width: `${String(width)}px`,
    height: `${String(height)}px`,
    margin: "0",
  };
}
