// The places sheet of the Brick Breaker uplift's art: the pattern each set
// of levels takes for its backdrop, on the field and on the page, in a dark
// palette and a light one.

import { kit } from "./kit.mjs";
import { PLACES, backdrop } from "./scene.mjs";
import { CONTENT, MARGIN, SHEET_WIDTH, band, label, note } from "./sheets.mjs";

/** @typedef {import("./kit.mjs").Palette} Palette */

const { rect } = kit;

const BAND_HEIGHT = 560;

/**
 * Draws the places in one palette.
 *
 * @param {Palette} pal
 * @param {number} top
 * @returns {string}
 */
function bandOf(pal, top) {
  /** @type {string[]} */
  const out = [
    band(
      pal,
      top,
      BAND_HEIGHT,
      pal.name,
      `Brick Breaker uplift · the places · ${pal.id} palette`,
    ),
  ];
  const gap = 20;
  const w = (CONTENT - (PLACES.length - 1) * gap) / PLACES.length;
  PLACES.forEach((place, i) => {
    const x = MARGIN + i * (w + gap);
    const y = top + 104;
    // The page, with the pattern louder, and a field on it, quieter.
    out.push(
      rect(x, y, w, 330, {
        rx: 12,
        fill: pal.page,
        stroke: pal.fieldLine,
        sw: 1.5,
      }),
      backdrop(pal, place.id, x + 2, y + 2, w - 4, 326, 62, pal.page, 0.055),
      rect(x + 44, y + 28, w - 88, 274, { fill: pal.field }),
      backdrop(
        pal,
        place.id,
        x + 44,
        y + 28,
        w - 88,
        274,
        62,
        pal.field,
        0.045,
      ),
      rect(x + 44, y + 28, w - 88, 274, { stroke: pal.fieldLine, sw: 2 }),
      label(pal, x + w / 2, y + 362, place.name, 15),
      note(pal, x + w / 2, y + 382, `${place.set}: ${place.says}`),
    );
  });
  return out.join("\n");
}

/**
 * Draws the places, in a dark palette and a light one.
 *
 * @returns {{ width: number, height: number, body: string }}
 */
export function placesSheet() {
  return {
    width: SHEET_WIDTH,
    height: 2 * BAND_HEIGHT,
    body: [kit.DARK, kit.LIGHT]
      .map((pal, i) => bandOf(pal, i * BAND_HEIGHT))
      .join("\n"),
  };
}
