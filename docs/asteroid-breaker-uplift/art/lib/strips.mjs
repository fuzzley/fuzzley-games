// What the sheets of effects and things share: a storyboard strip, which
// draws one effect at several times side by side on a panel, with each
// frame's time under it; a frame cut to its cell; and the field's specks,
// for telling a small thing from a star.

import { between, circle, num, place, rect, seeded, text } from "./core.mjs";
import { SHEET, caption, panel } from "./sheet.mjs";

/** @import { Palette } from "./palettes.mjs" */

let clips = 0;

/** Starts the clips' ids again, so a sheet built twice is the same bytes. */
export function resetClips() {
  clips = 0;
}

/**
 * Returns a drawing cut to a rectangle.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {string} inner
 * @returns {string}
 */
export function clipped(x, y, width, height, inner) {
  const id = `cut-${++clips}`;
  return `<clipPath id="${id}"><rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}

/**
 * @typedef {object} Strip A storyboard: one effect drawn at several times.
 * @property {number[]} times In milliseconds.
 * @property {number} cell How wide each frame's cell is.
 * @property {number} height
 * @property {(t: number, index: number) => string} draw Draws the effect at a time, about the cell's anchor.
 * @property {[number, number]} [anchor] Where in a cell the effect's origin lies, as shares across and down; its middle unless told.
 * @property {string} [label] The panel's label, in place of the palette's name.
 * @property {() => string} [still] Draws what shows where motion isn't welcome, in a last cell.
 * @property {string} [stillWords] That cell's caption.
 * @property {(t: number) => string} [words] A frame's caption, in place of its time.
 */

/**
 * Returns a storyboard strip on a panel, each frame cut to its cell, with
 * its time under it on the page.
 *
 * @param {number} x
 * @param {number} y
 * @param {Palette} palette
 * @param {Strip} strip
 * @returns {{ svg: string, width: number, height: number }}
 */
export function strip(
  x,
  y,
  palette,
  {
    times,
    cell,
    height,
    draw,
    anchor = [0.5, 0.5],
    label,
    still,
    stillWords = "reduced motion",
    words,
  },
) {
  const count = times.length + (still ? 1 : 0);
  const width = count * cell;
  const parts = [
    panel(x, y, width, height, palette, label === undefined ? {} : { label }),
  ];
  const line = palette.mode === "light" ? SHEET.line : palette.fieldLine;
  for (let i = 0; i < count; i++) {
    const left = x + i * cell;
    const t = times[i];
    const inner =
      t === undefined ? /** @type {() => string} */ (still)() : draw(t, i);
    parts.push(
      clipped(
        left + 1,
        y + 1,
        cell - 2,
        height - 2,
        place(inner, { x: left + cell * anchor[0], y: y + height * anchor[1] }),
      ),
    );
    if (i > 0)
      parts.push(
        rect(left - 0.5, y + 6, 1, height - 12, line, {
          opacity: t === undefined ? 1 : 0.6,
        }),
      );
    parts.push(
      caption(
        left + cell / 2,
        y + height + 15,
        t === undefined ? stillWords : words ? words(t) : `${t} ms`,
        { anchor: "middle", size: 11 },
      ),
    );
  }
  return { svg: parts.join(""), width, height: height + 22 };
}

/**
 * Returns the field's specks, as the game scatters them today, over a rectangle.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {Palette} palette
 * @param {{ seed?: number, count?: number, unit?: number }} [how]
 * @returns {string}
 */
export function specks(
  x,
  y,
  width,
  height,
  palette,
  { seed = 1, count = 12, unit = 22 } = {},
) {
  const random = seeded(seed * 83 + 3);
  const parts = [];
  for (let i = 0; i < count; i++) {
    parts.push(
      circle(
        x + between(random, 0, width),
        y + between(random, 0, height),
        Math.max(0.7, 0.14 * unit),
        palette.fieldMuted,
        { opacity: 0.5 },
      ),
    );
  }
  return parts.join("");
}

/**
 * Returns a small label on a panel, in the palette's muted text, as the
 * panel's own name is written.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} words
 * @param {Palette} palette
 * @param {{ anchor?: "start" | "middle" | "end", size?: number }} [how]
 * @returns {string}
 */
export function note(
  x,
  y,
  words,
  palette,
  { anchor = "start", size = 11 } = {},
) {
  return text(x, y, words, {
    fill: palette.fieldMuted,
    "font-size": size,
    "text-anchor": anchor,
    "letter-spacing": 0.3,
  });
}
