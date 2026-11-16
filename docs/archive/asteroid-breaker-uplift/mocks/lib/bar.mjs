// The game bar of a mock, drawn simply in the palette's roles. In the game
// the bar is HTML (`@fz/game-ui`'s game bar); this redraws it at the sizes
// today's has at 1280 by 720, with the figures the plan gives it: the wave,
// the score, the crew behind a face cam of the pilot, and static, as a
// number and four pips, in place of the chain.

import {
  TURN,
  circle,
  mix,
  path,
  place,
  polar,
  polygon,
  polyline,
  rect,
  ring,
  text,
} from "../../art/lib/core.mjs";
import { faceCamSvg, inkOf } from "../../art/lib/crew.mjs";
import { fuzzballSvg } from "../../art/lib/fuzzball.mjs";
import { MONO, arcD, pipsSvg, pipsWidth } from "./draw.mjs";

/** @import { Point } from "../../art/lib/core.mjs" */
/** @import { Face } from "../../art/lib/fuzzball.mjs" */
/** @import { Palette } from "../../art/lib/palettes.mjs" */

/**
 * @typedef {object} BarCrew The crew as the bar shows it.
 * @property {number} pilot Who is at the controls.
 * @property {Face} [face] Its face, as on the field.
 * @property {number} [charge] Its fur, as on the field.
 * @property {Point} [look]
 * @property {number[]} tow Who rides in tow, the nearest the pod first.
 * @property {number} [loose] How many of the last in tow have been knocked loose.
 */

/**
 * @typedef {object} BarFigures What a bar says.
 * @property {number} wave
 * @property {string} score As written, grouped in thousands.
 * @property {BarCrew} crew
 * @property {1 | 2 | 3 | 4} times Static's multiplier.
 * @property {string} [speed] The speed's badge.
 */

/** The size of static's pips in each bar. */
const LAPTOP_PIPS = { width: 5.5, height: 5.5, gap: 2 };
const PHONE_PIPS = { width: 4.2, height: 4.2, gap: 2 };

/** How tall each bar is, in CSS pixels. */
export const BAR_HEIGHT = { laptop: 72, phone: 56 };

/**
 * Returns the colors the bar's chrome is drawn in.
 *
 * @param {Palette} palette
 * @returns {{ tile: string, line: string, button: string }}
 */
function chrome(palette) {
  return {
    tile: palette.panel,
    line: mix(
      palette.panel,
      palette.barText,
      palette.mode === "light" ? 0.12 : 0.1,
    ),
    button: palette.panel,
  };
}

/**
 * Returns a figure's tile: a rounded box with a small label at its top.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {string} label
 * @param {Palette} palette
 * @param {{ labelAt?: number, anchor?: "start" | "middle" }} [how] Where the label's anchor lies from the tile's left edge.
 * @returns {string}
 */
function tile(
  x,
  y,
  width,
  height,
  label,
  palette,
  { labelAt = width / 2, anchor = "middle" } = {},
) {
  const tones = chrome(palette);
  return [
    rect(x, y, width, height, tones.tile, {
      rx: 7,
      stroke: tones.line,
      "stroke-width": 1,
    }),
    text(x + labelAt, y + 15.5, label.toUpperCase(), {
      fill: palette.fieldMuted,
      "font-size": 9.5,
      "font-weight": 700,
      "letter-spacing": 1.1,
      "text-anchor": anchor,
    }),
  ].join("");
}

/**
 * Returns a figure's value, in the numbers' face.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} words
 * @param {Palette} palette
 * @param {{ size?: number, anchor?: "start" | "middle" | "end" }} [how]
 * @returns {string}
 */
function figure(x, y, words, palette, { size = 18, anchor = "middle" } = {}) {
  return text(x, y, words, {
    fill: palette.barText,
    "font-family": MONO,
    "font-size": size,
    "font-weight": 700,
    "text-anchor": anchor,
  });
}

/**
 * Returns the crew in tow as a row of small fuzzballs from its left end,
 * about its middle line, those knocked loose faded inside a dashed ring.
 *
 * @param {BarCrew} crew
 * @param {number} size
 * @param {number} gap
 * @param {Palette} palette
 * @returns {string}
 */
function towRow(crew, size, gap, palette) {
  const loose = crew.loose ?? 0;
  return crew.tow
    .map((pilot, i) => {
      const x = i * (size + gap) + size / 2;
      const gone = i >= crew.tow.length - loose;
      const head = fuzzballSvg(
        {
          ink: inkOf(pilot, palette),
          size,
          face: gone ? "eep" : "rest",
          small: false,
        },
        palette,
      );
      return place(
        gone
          ? place(head, { opacity: 0.4 }) +
              ring(0, 0, size * 0.58, palette.fieldMuted, 1, {
                "stroke-dasharray": "2.4 2.4",
              })
          : head,
        { x },
      );
    })
    .join("");
}

/**
 * Returns how wide a row of the crew in tow is.
 *
 * @param {number} count
 * @param {number} size
 * @param {number} gap
 * @returns {number}
 */
function towRowWidth(count, size, gap) {
  return count === 0 ? 0 : count * size + (count - 1) * gap;
}

/**
 * Returns a round button of the bar about its middle, with an icon in it.
 *
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {string} icon
 * @param {Palette} palette
 * @returns {string}
 */
function roundButton(cx, cy, r, icon, palette) {
  const tones = chrome(palette);
  return place(
    circle(0, 0, r, tones.button, { stroke: tones.line, "stroke-width": 1 }) +
      icon,
    { x: cx, y: cy },
  );
}

/**
 * Returns the bar's icons, each about its middle, in simple shapes.
 *
 * @param {Palette} palette
 * @returns {Record<"pause" | "sound" | "sectors" | "help" | "settings" | "more", string>}
 */
function icons(palette) {
  const ink = palette.barText;
  const pen = {
    fill: "none",
    stroke: ink,
    "stroke-width": 1.7,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  };
  /** @type {Point[]} */
  const gear = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TURN;
    gear.push(
      polar(a - 0.2, 6.1),
      polar(a - 0.13, 8.2),
      polar(a + 0.13, 8.2),
      polar(a + 0.2, 6.1),
    );
  }
  return {
    pause:
      rect(-4.5, -6, 3, 12, ink, { rx: 1 }) +
      rect(1.5, -6, 3, 12, ink, { rx: 1 }),
    sound: [
      polygon(
        [
          [-7.5, -2.6],
          [-4.2, -2.6],
          [-0.4, -6],
          [-0.4, 6],
          [-4.2, 2.6],
          [-7.5, 2.6],
        ],
        "none",
        pen,
      ),
      path(arcD(3.6, -0.75, 0.75), { ...pen, transform: "translate(1.2 0)" }),
      path(arcD(7, -0.72, 0.72), { ...pen, transform: "translate(1.4 0)" }),
    ].join(""),
    sectors: [
      [-7.6, -7.6],
      [1.6, -7.6],
      [-7.6, 1.6],
      [1.6, 1.6],
    ]
      .map(([x, y]) => rect(x ?? 0, y ?? 0, 6, 6, "none", { ...pen, rx: 1.4 }))
      .join(""),
    help:
      ring(0, 0, 8.4, ink, 1.7) +
      text(0, 4.4, "?", {
        fill: ink,
        "font-size": 12.5,
        "font-weight": 750,
        "text-anchor": "middle",
      }),
    settings: polygon(gear, "none", pen) + ring(0, 0, 2.7, ink, 1.7),
    more: [-6, 0, 6].map((x) => circle(x, 0, 1.7, ink)).join(""),
  };
}

/**
 * Returns the laptop's bar from its top left corner: 1280 wide and 72 tall,
 * with the line under it.
 *
 * @param {BarFigures} figures
 * @param {Palette} palette
 * @param {number} [width]
 * @returns {string}
 */
export function laptopBar(figures, palette, width = 1280) {
  const tones = chrome(palette);
  const icon = icons(palette);
  const { crew } = figures;
  const parts = [
    rect(0, 0, width, BAR_HEIGHT.laptop, palette.bar),
    rect(0, BAR_HEIGHT.laptop, width, 1, palette.barLine),
  ];
  // The mark, the wordmark, the game and its speed.
  parts.push(
    place(fuzzballSvg({ ink: palette.accent, size: 28 }, palette), {
      x: 37,
      y: 34.5,
    }),
    text(59, 40.5, "fuzzley games", {
      fill: palette.barText,
      "font-size": 19,
      "font-weight": 750,
      "letter-spacing": -0.3,
    }),
    rect(200, 22, 1, 28, tones.line),
    text(213, 41.5, "Asteroid Breaker", {
      fill: palette.barText,
      "font-size": 17.5,
      "font-weight": 650,
    }),
    rect(361, 25, 72, 22, tones.tile, { rx: 11 }),
    text(372, 40.3, figures.speed ?? "Normal", {
      fill: palette.fieldMuted,
      "font-size": 11.5,
      "font-weight": 650,
    }),
    polyline(
      [
        [419, 34.5],
        [422, 37.5],
        [425, 34.5],
      ],
      palette.fieldMuted,
      1.5,
    ),
  );

  // The buttons, from the right edge, as today's bar lays them.
  const mid = 36;
  const pause = { x: 784, width: 102 };
  parts.push(
    rect(pause.x, mid - 22, pause.width, 44, tones.button, {
      rx: 22,
      stroke: tones.line,
      "stroke-width": 1,
    }),
    place(icon.pause, { x: pause.x + 28, y: mid }),
    text(pause.x + 44, mid + 5.2, "Pause", {
      fill: palette.barText,
      "font-size": 15,
      "font-weight": 650,
    }),
    roundButton(920, mid, 22, icon.sound, palette),
    roundButton(976, mid, 22, icon.sectors, palette),
    rect(1010, mid - 22, 134, 44, palette.accent, { rx: 22 }),
    polyline(
      [
        [1033, mid],
        [1045, mid],
      ],
      palette.onAccent,
      1.9,
    ),
    polyline(
      [
        [1039, mid - 6],
        [1039, mid + 6],
      ],
      palette.onAccent,
      1.9,
    ),
    text(1054, mid + 5.2, "New game", {
      fill: palette.onAccent,
      "font-size": 15,
      "font-weight": 700,
    }),
    roundButton(1178, mid, 22, icon.help, palette),
    roundButton(1234, mid, 22, icon.settings, palette),
  );

  // The figures, in the room between the speed's badge and Pause.
  const cam = 34;
  const head = 15;
  const between = 3;
  const row = towRowWidth(crew.tow.length, head, between);
  const widths = {
    wave: 50,
    score: Math.max(60, 18 + figures.score.length * 10.4),
    crew: 8 + cam + 8 + Math.max(30, row) + 10,
    static: 72,
  };
  const gap = 6;
  const all =
    widths.wave + widths.score + widths.crew + widths.static + 3 * gap;
  const top = 10;
  const tall = 52;
  let x = (433 + pause.x) / 2 - all / 2;
  parts.push(
    tile(x, top, widths.wave, tall, "Wave", palette),
    figure(x + widths.wave / 2, top + 39.5, String(figures.wave), palette),
  );
  x += widths.wave + gap;
  parts.push(
    tile(x, top, widths.score, tall, "Score", palette),
    figure(x + widths.score / 2, top + 39.5, figures.score, palette),
  );
  x += widths.score + gap;
  parts.push(
    tile(x, top, widths.crew, tall, "Crew", palette, {
      labelAt: 8 + cam + 8,
      anchor: "start",
    }),
    place(
      faceCamSvg(
        {
          pilot: crew.pilot,
          size: cam,
          face: crew.face ?? "rest",
          charge: crew.charge ?? 0,
          ...(crew.look ? { look: crew.look } : {}),
        },
        palette,
      ),
      { x: x + 8 + cam / 2, y: top + tall / 2 },
    ),
    place(towRow(crew, head, between, palette), {
      x: x + 8 + cam + 8,
      y: top + 35,
    }),
  );
  x += widths.crew + gap;
  parts.push(
    tile(x, top, widths.static, tall, "Static", palette),
    text(x + 10, top + 40, `×${figures.times}`, {
      fill: palette.barText,
      "font-family": MONO,
      "font-size": 18,
      "font-weight": 700,
    }),
    place(pipsSvg(figures.times, palette, LAPTOP_PIPS), {
      x: x + widths.static - 9 - pipsWidth(LAPTOP_PIPS),
      y: top + 34,
    }),
  );
  return parts.join("");
}

/**
 * Returns the phone's compact bar from its top left corner: 56 tall, with
 * the line under it.
 *
 * @param {BarFigures} figures
 * @param {Palette} palette
 * @param {number} [width]
 * @returns {string}
 */
export function phoneBar(figures, palette, width = 390) {
  const tones = chrome(palette);
  const icon = icons(palette);
  const { crew } = figures;
  const mid = BAR_HEIGHT.phone / 2;
  const parts = [
    rect(0, 0, width, BAR_HEIGHT.phone, palette.bar),
    rect(0, BAR_HEIGHT.phone, width, 1, palette.barLine),
  ];
  parts.push(
    place(fuzzballSvg({ ink: palette.accent, size: 25.6 }, palette), {
      x: 23,
      y: mid - 0.5,
    }),
    text(41, mid + 5, "Asteroid Breaker", {
      fill: palette.barText,
      "font-size": 14.5,
      "font-weight": 650,
      "letter-spacing": -0.2,
    }),
  );
  // From the right: the overflow menu, Pause, the crew and the score.
  const top = 8;
  const tall = 40;
  let right = width - 10;
  parts.push(roundButton(right - 18, mid, 18, icon.more, palette));
  right -= 36 + 6;
  parts.push(roundButton(right - 18, mid, 18, icon.pause, palette));
  right -= 36 + 6;
  // The crew's tile: the face cam with the crew's count on its corner, and
  // beside it the multiplier as a number over its four pips.
  const cam = 30;
  const column = pipsWidth(PHONE_PIPS);
  const crewWidth = 5 + cam + 7 + column + 7;
  const count = 1 + crew.tow.length - (crew.loose ?? 0);
  const left = right - crewWidth;
  const badge = { x: left + 5 + cam - 2.5, y: mid + cam / 2 - 3, r: 7 };
  parts.push(
    rect(left, top, crewWidth, tall, tones.tile, {
      rx: 7,
      stroke: tones.line,
      "stroke-width": 1,
    }),
    place(
      faceCamSvg(
        {
          pilot: crew.pilot,
          size: cam,
          face: crew.face ?? "rest",
          charge: crew.charge ?? 0,
          ...(crew.look ? { look: crew.look } : {}),
        },
        palette,
      ),
      { x: left + 5 + cam / 2, y: mid },
    ),
    circle(badge.x, badge.y, badge.r, palette.barText, {
      stroke: tones.tile,
      "stroke-width": 1.5,
    }),
    text(badge.x, badge.y + 3.4, String(count), {
      fill: palette.bar,
      "font-family": MONO,
      "font-size": 10,
      "font-weight": 700,
      "text-anchor": "middle",
    }),
    figure(
      left + 5 + cam + 7 + column / 2,
      mid + 1.5,
      `×${figures.times}`,
      palette,
      { size: 13.5 },
    ),
    place(pipsSvg(figures.times, palette, PHONE_PIPS), {
      x: left + 5 + cam + 7,
      y: mid + 10,
    }),
  );
  right -= crewWidth + 6;
  const scoreWidth = Math.max(50, 12 + figures.score.length * 8.7);
  parts.push(
    rect(right - scoreWidth, top, scoreWidth, tall, tones.tile, {
      rx: 7,
      stroke: tones.line,
      "stroke-width": 1,
    }),
    text(right - scoreWidth / 2, top + 13.5, "SCORE", {
      fill: palette.fieldMuted,
      "font-size": 8.5,
      "font-weight": 700,
      "letter-spacing": 1,
      "text-anchor": "middle",
    }),
    figure(right - scoreWidth / 2, top + 32, figures.score, palette, {
      size: 14.5,
    }),
  );
  return parts.join("");
}
