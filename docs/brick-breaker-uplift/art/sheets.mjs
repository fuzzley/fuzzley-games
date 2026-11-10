// What every sheet of the Brick Breaker uplift's art is laid out with: its
// width, a palette's band, a boxed section, headings, labels and callouts.

import { kit } from "./kit.mjs";

/** @typedef {import("./kit.mjs").Palette} Palette */
/** @typedef {[number, number]} Point */

const { rect, text, line, circle } = kit;

export const SHEET_WIDTH = 1640;
export const MARGIN = 48;
export const CONTENT = SHEET_WIDTH - 2 * MARGIN;

/**
 * Draws the band a palette's part of a sheet lies on, with its name and
 * what the sheet is.
 *
 * @param {Palette} pal
 * @param {number} y
 * @param {number} height
 * @param {string} name The band's title.
 * @param {string} what What the sheet is, at the band's right.
 * @returns {string}
 */
export function band(pal, y, height, name, what) {
  return (
    rect(0, y, SHEET_WIDTH, height, { fill: pal.panel }) +
    text(MARGIN, y + 58, name, { size: 30, weight: 700, fill: pal.text }) +
    text(SHEET_WIDTH - MARGIN, y + 58, what, {
      size: 14,
      fill: pal.muted,
      anchor: "end",
    })
  );
}

/**
 * Draws a section's letter and heading, and the box it fills.
 *
 * @param {Palette} pal
 * @param {number} x
 * @param {number} y The heading's baseline.
 * @param {number} w
 * @param {number} h The box's height, under the heading.
 * @param {string} letter
 * @param {string} words
 * @returns {string}
 */
export function section(pal, x, y, w, h, letter, words) {
  return (
    text(x, y, letter, { size: 13, weight: 700, fill: pal.text }) +
    text(x + 20, y, words, { size: 13, fill: pal.muted }) +
    rect(x, y + 14, w, h, {
      rx: 14,
      fill: pal.field,
      stroke: pal.fieldLine,
      sw: 1.5,
    })
  );
}

/**
 * Writes a label under a drawing.
 *
 * @param {Palette} pal
 * @param {number} cx
 * @param {number} y
 * @param {string} words
 * @param {number} [size]
 * @returns {string}
 */
export function label(pal, cx, y, words, size = 13) {
  return text(cx, y, words, { size, fill: pal.text, anchor: "middle" });
}

/**
 * Writes a quieter line under a label.
 *
 * @param {Palette} pal
 * @param {number} cx
 * @param {number} y
 * @param {string} words
 * @param {number} [size]
 * @returns {string}
 */
export function note(pal, cx, y, words, size = 11.5) {
  return text(cx, y, words, { size, fill: pal.muted, anchor: "middle" });
}

/**
 * Writes lines of text, one under the other.
 *
 * @param {number} x
 * @param {number} y The first line's baseline.
 * @param {string[]} lines
 * @param {{ size?: number, weight?: number, fill?: string, anchor?: "start" | "middle" | "end", leading?: number }} type
 * @returns {string}
 */
export function lines(x, y, lines, type) {
  const leading = type.leading ?? (type.size ?? 14) * 1.35;
  return lines
    .map((words, i) => text(x, y + i * leading, words, type))
    .join("");
}

/**
 * Draws a callout: words beside a drawing, and a thin line from them to a
 * point in it.
 *
 * @param {Palette} pal
 * @param {Point} from Where the line leaves the words.
 * @param {Point} to The point it marks.
 * @param {string[]} words
 * @param {"start" | "end" | "middle"} anchor
 * @returns {string}
 */
export function callout(pal, from, to, words, anchor) {
  const dx = anchor === "end" ? -8 : anchor === "start" ? 8 : 0;
  const top = from[1] - ((words.length - 1) * 17) / 2 + 4.5;
  return (
    line(from, to, { stroke: pal.muted, sw: 1 }) +
    circle(to[0], to[1], 2.6, { fill: pal.muted }) +
    lines(from[0] + dx, top, words, {
      size: 13,
      fill: pal.text,
      anchor,
      leading: 17,
    })
  );
}

/**
 * Draws an arrow from one point to another.
 *
 * @param {Point} from
 * @param {Point} to
 * @param {string} color
 * @param {number} [sw]
 * @returns {string}
 */
export function arrow(from, to, color, sw = 2.5) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const head = sw * 3.6;
  /** @type {(turn: number) => Point} */
  const wing = (turn) => [
    to[0] - head * Math.cos(angle + turn),
    to[1] - head * Math.sin(angle + turn),
  ];
  return (
    line(from, to, { stroke: color, sw }) +
    kit.polyline([wing(0.5), to, wing(-0.5)], { stroke: color, sw })
  );
}

/**
 * Draws a dotted path through points, as a ball's way is shown.
 *
 * @param {Point[]} points
 * @param {string} color
 * @param {number} [r]
 * @param {number} [gap]
 * @returns {string}
 */
export function dotted(points, color, r = 2.2, gap = 11) {
  /** @type {string[]} */
  const out = [];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const length = Math.hypot(bx - ax, by - ay);
    let d = carry;
    for (; d < length; d += gap) {
      out.push(
        circle(
          ax + ((bx - ax) * d) / length,
          ay + ((by - ay) * d) / length,
          r,
          {
            fill: color,
          },
        ),
      );
    }
    carry = d - length;
  }
  return out.join("");
}
