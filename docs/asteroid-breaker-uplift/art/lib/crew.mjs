// The crew as the bar shows it: the pilots left, as a row of small heads,
// and the face cam, one larger tile of the pilot at the controls, since a
// face on a phone's field is two dots and can say no more than that. Both
// are drawn in pixels, as the bar is laid out in CSS, not in field units.

import { TURN, circle, place, polar, polyline, rect, ring } from "./core.mjs";
import { GRID, fuzzballSvg, furReach } from "./fuzzball.mjs";
import { PILOT_INKS } from "./palettes.mjs";
import { podTones } from "./ship.mjs";
import { TOWARD_LIGHT, arcPoints } from "./strays.mjs";

/** @import { Point } from "./core.mjs" */
/** @import { Face } from "./fuzzball.mjs" */
/** @import { Palette } from "./palettes.mjs" */

/**
 * Returns a pilot's ink in a palette, from its number or as given.
 *
 * @param {number | string} pilot
 * @param {Palette} palette
 * @returns {string}
 */
export function inkOf(pilot, palette) {
  return typeof pilot === "string"
    ? pilot
    : (PILOT_INKS[palette.mode][pilot % 8] ?? palette.accent);
}

/**
 * Returns how wide a crew row is, in pixels.
 *
 * @param {number} count
 * @param {number} [size]
 * @param {number} [gap]
 * @returns {number}
 */
export function crewRowWidth(count, size = 22, gap = 5) {
  return count * size + (count - 1) * gap + (count > 0 ? size * 0.24 : 0);
}

/**
 * Returns the pilots left as a row of heads, from its left end, about its
 * middle line: the one at the controls first, in a canopy's rim, then
 * those waiting at home.
 *
 * @param {object} row
 * @param {(number | string)[]} row.pilots The one at the controls first.
 * @param {number} [row.size] How many pixels a head's grid takes.
 * @param {number} [row.gap]
 * @param {Face} [row.face] The face of the one at the controls.
 * @param {number} [row.charge] Its static charge.
 * @param {Palette} palette
 * @returns {string}
 */
export function crewRowSvg(
  { pilots, size = 22, gap = 5, face = "rest", charge = 0 },
  palette,
) {
  const tones = podTones(palette);
  /** @type {string[]} */
  const parts = [];
  let x = 0;
  pilots.forEach((pilot, i) => {
    const ink = inkOf(pilot, palette);
    if (i === 0) {
      // The one flying sits in its canopy, a little larger than the rest.
      const r = size * 0.62;
      const within = size * 1.12;
      parts.push(
        place(
          [
            circle(0, 0, r, tones.glass),
            fuzzballSvg(
              {
                ink,
                size: within * 0.84,
                face,
                charge,
                within: (r - 1) / ((within * 0.84) / GRID),
                small: false,
              },
              palette,
            ),
            ring(0, 0, r, tones.rimLit, Math.max(1.5, size * 0.09)),
          ].join(""),
          { x: x + r },
        ),
      );
      x += 2 * r + gap;
    } else {
      parts.push(
        place(fuzzballSvg({ ink, size, face: "rest" }, palette), {
          x: x + size / 2,
        }),
      );
      x += size + gap;
    }
  });
  return parts.join("");
}

/**
 * @typedef {object} FaceCam What the face cam shows.
 * @property {number | string} pilot
 * @property {number} [size] The tile's side, in pixels.
 * @property {Face} [face]
 * @property {Point} [look]
 * @property {number} [charge]
 * @property {Point} [lean]
 * @property {number} [puff]
 * @property {number} [seed]
 */

/**
 * Returns the face cam about its middle: a tile with the pilot at the
 * controls behind the canopy's glass, large enough for its face and its
 * static charge to read where the field's own pilot is too small.
 *
 * @param {FaceCam} cam
 * @param {Palette} palette
 * @returns {string}
 */
export function faceCamSvg(
  {
    pilot,
    size = 44,
    face = "rest",
    look,
    charge = 0,
    lean,
    puff = 0,
    seed = 1,
  },
  palette,
) {
  const tones = podTones(palette);
  const ink = inkOf(pilot, palette);
  const r = size * 0.42;
  const rim = Math.max(1.5, size * 0.055);
  // With no charge the fur leaves a third of the glass clear, for a charge to fill.
  const across = (GRID * 0.7 * r) / furReach(0);
  const pose = {
    face,
    charge,
    puff,
    seed,
    within: (r - rim / 2) / (across / GRID),
    small: false,
  };
  return [
    rect(-size / 2, -size / 2, size, size, palette.panel, {
      rx: size * 0.2,
      stroke: palette.barLine,
      "stroke-width": 1,
    }),
    circle(0, 0, r, tones.glass),
    fuzzballSvg(
      {
        ...pose,
        ...(look ? { look } : {}),
        ...(lean ? { lean } : {}),
        ink,
        size: across,
      },
      palette,
    ),
    ring(0, 0, r, tones.rim, rim),
    polyline(
      arcPoints(
        [0, 0],
        r,
        TOWARD_LIGHT - TURN * 0.16,
        TOWARD_LIGHT + TURN * 0.16,
        16,
      ),
      tones.rimLit,
      rim,
      { "stroke-linecap": "butt" },
    ),
    polyline(
      arcPoints([0, 0], r * 0.74, TOWARD_LIGHT - 0.34, TOWARD_LIGHT + 0.2),
      "#ffffff",
      Math.max(1.2, size * 0.035),
      { opacity: 0.9 },
    ),
    circle(
      ...polar(TOWARD_LIGHT + 0.5, r * 0.74),
      Math.max(0.7, size * 0.02),
      "#ffffff",
      { opacity: 0.9 },
    ),
  ].join("");
}
