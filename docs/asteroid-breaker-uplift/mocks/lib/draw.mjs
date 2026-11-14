// What the mocks' own drawing shares, beside the art kit's helpers
// (../../art/lib/core.mjs): the face numbers are set in, an arc as a path,
// and the multiplier's pips.

import { TURN, mix, num, polar, rect } from "../../art/lib/core.mjs";

/** @import { Palette } from "../../art/lib/palettes.mjs" */

/** The numbers' face, for points on the field and figures in the bar. */
export const MONO = "ui-monospace, 'Cascadia Mono', Consolas, monospace";

/**
 * Returns an arc of a circle about the origin as a path's `d`, clockwise
 * from one angle to another.
 *
 * @param {number} r
 * @param {number} from In radians.
 * @param {number} to
 * @returns {string}
 */
export function arcD(r, from, to) {
  const [x0, y0] = polar(from, r);
  const [x1, y1] = polar(to, r);
  return `M${num(x0)} ${num(y0)}A${num(r)} ${num(r)} 0 ${to - from > TURN / 2 ? 1 : 0} 1 ${num(x1)} ${num(y1)}`;
}

/**
 * Returns static's four pips from their left end, about their middle line:
 * one lit in the accent for each step of the multiplier.
 *
 * @param {number} times The multiplier, 1 to 4.
 * @param {Palette} palette
 * @param {{ width?: number, height?: number, gap?: number }} [how] A pip's size and the room between two.
 * @returns {string}
 */
export function pipsSvg(
  times,
  palette,
  { width = 7, height = 5, gap = 2.5 } = {},
) {
  const unlit = mix(
    palette.panel,
    palette.barText,
    palette.mode === "light" ? 0.2 : 0.22,
  );
  return [0, 1, 2, 3]
    .map((i) =>
      rect(
        i * (width + gap),
        -height / 2,
        width,
        height,
        i < times ? palette.accent : unlit,
        { rx: Math.min(width, height) * 0.3 },
      ),
    )
    .join("");
}

/**
 * Returns how wide four pips are.
 *
 * @param {{ width?: number, gap?: number }} [how]
 * @returns {number}
 */
export function pipsWidth({ width = 7, gap = 2.5 } = {}) {
  return 4 * width + 3 * gap;
}
