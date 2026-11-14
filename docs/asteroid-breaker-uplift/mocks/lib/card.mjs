// The cards of a mock, drawn as the game's HTML cards are: a rounded panel
// in the palette's panel color with a thin line, its words in the bar's
// text and the field's muted text, and one button in the accent. Each card
// here is one the plan changes or adds: the one card between waves, a
// sector's first wave, and the run's end.

import { mix, place, rect, ring, text } from "../../art/lib/core.mjs";
import { inkOf } from "../../art/lib/crew.mjs";
import { fuzzballSvg } from "../../art/lib/fuzzball.mjs";
import { podTones } from "../../art/lib/ship.mjs";
import { MONO } from "./scene.mjs";

/** @import { Face } from "../../art/lib/fuzzball.mjs" */
/** @import { Palette } from "../../art/lib/palettes.mjs" */

/** @typedef {{ width: number, height: number, svg: string }} Card A card drawn from its top left corner. */

/**
 * Returns the line a card's panel and its rules are drawn in.
 *
 * @param {Palette} palette
 * @returns {string}
 */
function lineOf(palette) {
  return mix(
    palette.panel,
    palette.barText,
    palette.mode === "light" ? 0.14 : 0.16,
  );
}

/**
 * Returns a card's panel from its top left corner, over the hard shadow it
 * casts on the dimmed field.
 *
 * @param {number} width
 * @param {number} height
 * @param {Palette} palette
 * @returns {string}
 */
function panel(width, height, palette) {
  return [
    rect(
      0,
      8,
      width,
      height,
      palette.mode === "light" ? palette.fieldText : palette.page,
      { rx: 18, opacity: palette.mode === "light" ? 0.12 : 0.45 },
    ),
    rect(0, 0, width, height, palette.panel, {
      rx: 18,
      stroke: lineOf(palette),
      "stroke-width": 1,
    }),
  ].join("");
}

/**
 * Returns a button from its top left corner: filled with the accent, or an
 * outline for the choice beside it.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {string} label
 * @param {Palette} palette
 * @param {{ primary?: boolean }} [how]
 * @returns {string}
 */
function button(x, y, width, label, palette, { primary = true } = {}) {
  const height = 44;
  return [
    primary
      ? rect(x, y, width, height, palette.accent, { rx: 22 })
      : rect(x, y, width, height, mix(palette.panel, palette.barText, 0.06), {
          rx: 22,
          stroke: lineOf(palette),
          "stroke-width": 1,
        }),
    text(x + width / 2, y + 27.4, label, {
      fill: primary ? palette.onAccent : palette.barText,
      "font-size": 15,
      "font-weight": 700,
      "text-anchor": "middle",
    }),
  ].join("");
}

/**
 * Returns a small label in capitals, as a figure's is.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} words
 * @param {Palette} palette
 * @param {"start" | "middle"} [anchor]
 * @returns {string}
 */
function label(x, y, words, palette, anchor = "middle") {
  return text(x, y, words.toUpperCase(), {
    fill: palette.fieldMuted,
    "font-size": 10,
    "font-weight": 700,
    "letter-spacing": 1.2,
    "text-anchor": anchor,
  });
}

/**
 * Returns fuzzballs in a row about its middle, each with a face, the first
 * in a canopy's rim if it flew the pod, each hopping as high as told.
 *
 * @param {object} row
 * @param {number[]} row.pilots
 * @param {Face} row.face
 * @param {number} [row.size]
 * @param {number} [row.gap]
 * @param {number[]} [row.hops] How high each hops, in pixels, in turn.
 * @param {boolean} [row.canopy] Whether the first sits in a canopy's rim.
 * @param {Palette} palette
 * @returns {string}
 */
function crewRow(
  { pilots, face, size = 30, gap = 12, hops = [0], canopy = false },
  palette,
) {
  const tones = podTones(palette);
  const all = pilots.length * size + (pilots.length - 1) * gap;
  return pilots
    .map((pilot, i) => {
      const x = -all / 2 + size / 2 + i * (size + gap);
      const y = -(hops[i % hops.length] ?? 0);
      const head = fuzzballSvg(
        { ink: inkOf(pilot, palette), size, face, small: false },
        palette,
      );
      return place(
        canopy && i === 0
          ? head + ring(0, 0, size * 0.56, tones.rimLit, 2)
          : head,
        { x, y },
      );
    })
    .join("");
}

/**
 * Returns the one card between waves: the cleared wave's tally, the crew
 * cheering, the next wave's name, and one button.
 *
 * @param {Palette} palette
 * @returns {Card}
 */
export function clearedCard(palette) {
  const width = 364;
  const height = 404;
  const pad = 30;
  /** @type {[string, string][]} */
  const tally = [
    ["Rocks", "2,340"],
    ["Sparks", "310"],
    ["A stray caught", "1,000"],
    ["No hit taken", "500"],
  ];
  const parts = [
    panel(width, height, palette),
    text(width / 2, 54, "Wave 9 cleared", {
      fill: palette.barText,
      "font-size": 25,
      "font-weight": 760,
      "text-anchor": "middle",
    }),
  ];
  tally.forEach(([name, points], i) => {
    const y = 96 + i * 27;
    parts.push(
      text(pad, y, name, { fill: palette.barText, "font-size": 14.5 }),
      text(width - pad, y, points, {
        fill: palette.barText,
        "font-family": MONO,
        "font-size": 14.5,
        "font-weight": 600,
        "text-anchor": "end",
      }),
    );
  });
  parts.push(
    rect(pad, 191, width - 2 * pad, 1, lineOf(palette)),
    text(pad, 218, "Total", {
      fill: palette.barText,
      "font-size": 15.5,
      "font-weight": 720,
    }),
    text(width - pad, 218, "4,150", {
      fill: palette.accent,
      "font-family": MONO,
      "font-size": 18,
      "font-weight": 700,
      "text-anchor": "end",
    }),
    place(
      crewRow(
        {
          pilots: [0, 1, 2],
          face: "happy",
          size: 32,
          gap: 14,
          hops: [5, 0, 7],
          canopy: true,
        },
        palette,
      ),
      { x: width / 2, y: 262 },
    ),
    text(width / 2, 302, "Next: wave 10, Boulder", {
      fill: palette.fieldMuted,
      "font-size": 13.5,
      "text-anchor": "middle",
    }),
    button(pad, 318, width - 2 * pad, "Next wave", palette),
    text(width / 2, 384, "or just start flying", {
      fill: palette.fieldMuted,
      "font-size": 12,
      "text-anchor": "middle",
    }),
  );
  return { width, height, svg: parts.join("") };
}

/**
 * Returns the card of a sector's first wave: its name, its waves, and one
 * line about what is new there.
 *
 * @param {Palette} palette
 * @returns {Card}
 */
export function sectorCard(palette) {
  const width = 400;
  const height = 214;
  const parts = [
    panel(width, height, palette),
    label(width / 2, 38, "A new sector", palette),
    text(width / 2, 80, "Iron reach", {
      fill: palette.barText,
      "font-size": 34,
      "font-weight": 780,
      "text-anchor": "middle",
    }),
    text(width / 2, 105, "Waves 11 to 20", {
      fill: palette.fieldMuted,
      "font-size": 14,
      "text-anchor": "middle",
    }),
    rect(width / 2 - 26, 121, 52, 2, palette.accent, { rx: 1 }),
    text(width / 2, 150, "Iron holds its hits.", {
      fill: palette.barText,
      "font-size": 14,
      "text-anchor": "middle",
    }),
    text(width / 2, 170, "Burrs cling: dash to shake them off.", {
      fill: palette.barText,
      "font-size": 14,
      "text-anchor": "middle",
    }),
    text(width / 2, 196, "Wave 11, Ore · starts when you fly", {
      fill: palette.fieldMuted,
      "font-size": 12,
      "text-anchor": "middle",
    }),
  ];
  return { width, height, svg: parts.join("") };
}

/**
 * Returns the card of the run's end: everyone is home, the wave it ended
 * on, the score and the best, the fuzzballs who flew, and two buttons.
 *
 * @param {Palette} palette
 * @returns {Card}
 */
export function endCard(palette) {
  const width = 408;
  const height = 348;
  const pad = 30;
  const half = (width - 2 * pad - 12) / 2;
  const figure = (
    /** @type {number} */ x,
    /** @type {string} */ name,
    /** @type {string} */ points,
  ) =>
    [
      rect(x, 104, half, 62, mix(palette.panel, palette.barText, 0.05), {
        rx: 10,
        stroke: lineOf(palette),
        "stroke-width": 1,
      }),
      label(x + half / 2, 124, name, palette),
      text(x + half / 2, 152, points, {
        fill: palette.barText,
        "font-family": MONO,
        "font-size": 22,
        "font-weight": 700,
        "text-anchor": "middle",
      }),
    ].join("");
  const parts = [
    panel(width, height, palette),
    text(width / 2, 56, "Everyone is home.", {
      fill: palette.barText,
      "font-size": 27,
      "font-weight": 780,
      "text-anchor": "middle",
    }),
    text(width / 2, 82, "The run ended on wave 14, Anvil, at Normal", {
      fill: palette.fieldMuted,
      "font-size": 13.5,
      "text-anchor": "middle",
    }),
    figure(pad, "Score", "38,460"),
    figure(pad + half + 12, "Best", "52,180"),
    label(width / 2, 196, "The fuzzballs who flew", palette),
    place(
      crewRow(
        { pilots: [0, 1, 2, 5, 3], face: "rest", size: 30, gap: 12 },
        palette,
      ),
      { x: width / 2, y: 228 },
    ),
    button(pad, 272, half, "Try again", palette),
    button(pad + half + 12, 272, half, "Choose a sector", palette, {
      primary: false,
    }),
  ];
  return { width, height, svg: parts.join("") };
}
