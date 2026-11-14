// The sheet of the uplift's small things: the pickups as glass orbs, now
// and after; the motes; the comet and its warning; and the burr. Run it
// with `node sheets/pickups-and-hazards.mjs`; it writes
// `pickups-and-hazards.svg` and `preview/pickups-and-hazards.png`.

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { TURN, place, rect, turned } from "../lib/core.mjs";
import { breakFx, glowDefs, shipPlaceholder } from "../lib/fx.mjs";
import { PALETTES } from "../lib/palettes.mjs";
import { writeRaster, writeText } from "../lib/raster.mjs";
import { makeRock, rockDefs, rockSvg } from "../lib/rocks.mjs";
import { panel, sheetFile } from "../lib/sheet.mjs";
import { clipped, note, resetClips, specks } from "../lib/strips.mjs";
import {
  PICKUP_GROUPS,
  PICKUP_IDS,
  PICKUP_NAMES,
  burrSvg,
  burredShipSvg,
  cometSvg,
  cometTodaySvg,
  makeBurr,
  makeComet,
  makeMotes,
  moteDrawnSvg,
  motePath,
  moteSvg,
  orbSvg,
  pickupTodaySvg,
  shakenFx,
  warningSvg,
  warningTodaySvg,
} from "../lib/things.mjs";

/** @import { Point } from "../lib/core.mjs" */
/** @import { Palette } from "../lib/palettes.mjs" */
/** @import { Section } from "../lib/sheet.mjs" */
/** @import { RockKind, RockSize } from "../lib/rocks.mjs" */

const ART = join(import.meta.dirname, "..");
const DARK = PALETTES.casino;
const LIGHT = PALETTES.classic;
const EVERY = [PALETTES.casino, PALETTES.midnight, PALETTES.classic, PALETTES.pastel];
const HALF = 752;
const GAP = 16;

/** What each group's rim is, in a few words. */
const RIMS = { weapon: "weapon: one ring", guard: "protection: a doubled ring", field: "field effect: a ring in four arcs" };

// --- Pickups ------------------------------------------------------------

/**
 * Returns the eight orbs large, with their names and what their rims say.
 *
 * @param {number} px
 * @param {number} py
 * @param {number} width
 * @param {Palette} palette
 * @returns {string}
 */
function heroRow(px, py, width, palette) {
  const parts = [panel(px, py, width, 214, palette)];
  PICKUP_IDS.forEach((id, i) => {
    const cx = px + 104 + i * 187;
    parts.push(place(orbSvg(id, palette, { unit: 44 }), { x: cx, y: py + 104 }));
    parts.push(note(cx, py + 186, PICKUP_NAMES[id], palette, { anchor: "middle", size: 13 }));
    parts.push(note(cx, py + 202, RIMS[PICKUP_GROUPS[id]], palette, { anchor: "middle", size: 10 }));
  });
  return parts.join("");
}

/**
 * Returns the eight pickups in a palette, as they are today and as orbs, at 22 and at 6 px a unit.
 *
 * @param {number} px
 * @param {number} py
 * @param {number} width
 * @param {Palette} palette
 * @returns {string}
 */
function nowAndAfter(px, py, width, palette) {
  const parts = [panel(px, py, width, 172, palette)];
  const rows = /** @type {const} */ ([
    ["today", py + 62],
    ["uplift", py + 124],
  ]);
  for (const [name, y] of rows) {
    parts.push(note(px + 16, y + 4, name, palette));
    PICKUP_IDS.forEach((id, i) => {
      const draw = (/** @type {number} */ unit) => (name === "today" ? pickupTodaySvg(id, palette, { unit }) : orbSvg(id, palette, { unit }));
      parts.push(place(draw(22), { x: px + 120 + i * 96, y }));
      parts.push(place(draw(6), { x: px + 950 + i * 30, y }));
      parts.push(place(draw(10), { x: px + 1230 + i * 38, y }));
    });
  }
  parts.push(note(px + 120 + 3.5 * 96, py + 164, "22 px a unit", palette, { anchor: "middle", size: 10 }));
  parts.push(note(px + 950 + 3.5 * 30, py + 164, "6 px a unit: about 14 px across", palette, { anchor: "middle", size: 10 }));
  parts.push(note(px + 1230 + 3.5 * 38, py + 164, "10 px a unit", palette, { anchor: "middle", size: 10 }));
  return parts.join("");
}

/**
 * Returns an orb's states on a panel: at rest, breathing, blinking, and held dim.
 *
 * @param {number} px
 * @param {number} py
 * @param {Palette} palette
 * @returns {string}
 */
function statesPanel(px, py, palette) {
  const parts = [panel(px, py, HALF, 236, palette)];
  const unit = 26;
  /** @type {[string, string, Parameters<typeof orbSvg>[2]][]} */
  const states = [
    ["at rest", "", {}],
    ["breathing", "out", { breath: 0 }],
    ["", "in", { breath: 1 }],
    ["blinking, last 2 s", "on", {}],
    ["", "off", { dim: true, opacity: 0.3 }],
    ["reduced motion", "held dim", { dim: true }],
  ];
  states.forEach(([name, sub, how], i) => {
    const cx = px + 78 + i * 120;
    parts.push(place(orbSvg("shield", palette, { unit, ...how }), { x: cx, y: py + 96 }));
    parts.push(note(cx, py + 164, name, palette, { anchor: "middle" }));
    parts.push(note(cx, py + 178, sub, palette, { anchor: "middle", size: 10 }));
    parts.push(place(orbSvg("shield", palette, { unit: 6, ...how }), { x: cx, y: py + 206 }));
  });
  parts.push(note(px + 16, py + 210, "6 px", palette, { size: 10 }));
  return parts.join("");
}

// --- Motes --------------------------------------------------------------

/**
 * Returns the motes on a panel: their three sizes, twelve shed by a break,
 * and a few drawn in to the ship.
 *
 * @param {number} px
 * @param {number} py
 * @param {Palette} palette
 * @returns {string}
 */
function motesPanel(px, py, palette) {
  const parts = [panel(px, py, HALF, 270, palette)];
  parts.push(note(px + 16, py + 46, "Three sizes: 0.15, 0.25 and 0.35 units", palette));
  /** @type {(0 | 1 | 2)[]} */ ([0, 1, 2]).forEach((size) => {
    parts.push(place(moteSvg(size, palette, { unit: 60 }), { x: px + 46 + size * 62, y: py + 96 }));
    parts.push(place(moteSvg(size, palette, { unit: 22 }), { x: px + 46 + size * 62, y: py + 160 }));
    parts.push(place(moteSvg(size, palette, { unit: 6 }), { x: px + 46 + size * 62, y: py + 208 }));
  });
  parts.push(note(px + 196, py + 100, "60 px", palette, { size: 10 }));
  parts.push(note(px + 196, py + 164, "22 px", palette, { size: 10 }));
  parts.push(note(px + 196, py + 212, "6 px", palette, { size: 10 }));
  // Twelve shed by a break.
  const unit = 16;
  const at = /** @type {Point} */ ([px + 370, py + 150]);
  parts.push(note(px + 270, py + 46, "Twelve shed by a break", palette));
  parts.push(specks(px + 270, py + 60, 200, 190, palette, { seed: 6, count: 7, unit }));
  parts.push(place(breakFx(makeRock("stone", "medium", 4), 260, palette, { unit, turn: 0.4, seed: 2, from: 0.3 }), { x: at[0], y: at[1] }));
  for (const mote of makeMotes(3, { reach: [1.4, 5.2] })) {
    parts.push(place(moteSvg(mote.size, palette, { unit, turn: mote.turn }), { x: at[0] + mote.at[0] * unit, y: at[1] + mote.at[1] * unit }));
  }
  // A few drawn in to the ship.
  const ship = /** @type {Point} */ ([px + 646, py + 164]);
  parts.push(note(px + 500, py + 46, "Drawn in to the ship, on curved paths", palette));
  /** @type {[Point, number, number, 0 | 1 | 2][]} */
  const drawn = [
    [[-7.6, -4.6], 0.28, 0.3, 1],
    [[-6.2, 3.4], -0.3, 0.55, 0],
    [[3.6, -5.6], -0.34, 0.42, 2],
    [[4.8, 3.6], 0.3, 0.7, 0],
    [[-2.2, -5.8], 0.3, 0.82, 1],
    [[-8.4, 0.2], 0.2, 0.12, 0],
  ];
  for (const [from, bend, share, size] of drawn) {
    parts.push(place(moteDrawnSvg(motePath(from, [0, 0], bend), share, size, palette, { unit }), { x: ship[0], y: ship[1] }));
  }
  parts.push(place(shipPlaceholder(palette, { unit, turn: -0.5 }), { x: ship[0], y: ship[1] }));
  return parts.join("");
}

// --- The comet ----------------------------------------------------------

/**
 * Returns the comet on a panel: close up, at 22 px a unit beside a rock
 * and today's comet, and at 6 px a unit.
 *
 * @param {number} px
 * @param {number} py
 * @param {Palette} palette
 * @returns {string}
 */
function cometPanel(px, py, palette) {
  const parts = [panel(px, py, HALF, 322, palette)];
  const comet = makeComet(1);
  parts.push(note(px + 16, py + 46, "At 34 px a unit: a long wedge cut in eight facets, lit from the upper left, in a tail of streaks", palette));
  parts.push(clipped(px + 1, py + 54, HALF - 2, 110, place(cometSvg(comet, palette, { unit: 34 }), { x: px + 400, y: py + 110 })));
  parts.push(note(px + 16, py + 180, "At 22 px a unit, beside a large stone and today's comet", palette));
  const turn = 0.5;
  parts.push(clipped(px + 1, py + 188, 330, 133, place(cometSvg(comet, palette, { unit: 22, turn }), { x: px + 236, y: py + 262 })));
  parts.push(place(rockSvg(makeRock("stone", "large", 7), palette, { unit: 22, turn: 0.6 }), { x: px + 416, y: py + 254 }));
  parts.push(place(cometTodaySvg(palette, { unit: 22, turn }), { x: px + 566, y: py + 256 }));
  parts.push(note(px + 560, py + 310, "today", palette, { anchor: "middle", size: 10 }));
  parts.push(place(cometSvg(comet, palette, { unit: 6, turn }), { x: px + 668, y: py + 240 }));
  parts.push(place(rockSvg(makeRock("stone", "large", 7), palette, { unit: 6, turn: 0.6 }), { x: px + 714, y: py + 236 }));
  parts.push(place(rockSvg(makeRock("stone", "small", 3), palette, { unit: 6, turn: 0.6 }), { x: px + 700, y: py + 270 }));
  parts.push(note(px + 690, py + 310, "6 px a unit", palette, { anchor: "middle", size: 10 }));
  return parts.join("");
}

/**
 * Returns a small field with a comet's warning on it, or the comet crossing it.
 *
 * @param {Palette} palette
 * @param {number} unit
 * @param {"warned" | "crossing"} moment
 * @returns {string}
 */
function cometField(palette, unit, moment) {
  const w = 72 * unit;
  const h = 40 * unit;
  const tilt = 0.26;
  const entry = /** @type {Point} */ ([-w / 2, -h / 2 + 11 * unit]);
  /** @type {[RockKind, RockSize, number, Point][]} */
  const rocks = [
    ["stone", "large", 3, [18, 8]],
    ["ice", "medium", 2, [44, 30]],
    ["stone", "medium", 5, [58, 9]],
    ["iron", "small", 4, [30, 33]],
    ["stone", "small", 6, [9, 30]],
  ];
  const inner = [];
  inner.push(specks(-w / 2, -h / 2, w, h, palette, { seed: 12, count: 18, unit }));
  if (moment === "warned") inner.push(place(warningSvg(1, palette, { unit, lane: 80 }), { x: entry[0], y: entry[1], turn: (tilt / TURN) * 360 }));
  for (const [kind, size, seed, at] of rocks) inner.push(place(rockSvg(makeRock(kind, size, seed), palette, { unit, turn: seed * 0.7 }), { x: at[0] * unit - w / 2, y: at[1] * unit - h / 2 }));
  inner.push(place(shipPlaceholder(palette, { unit, turn: -1.1 }), { x: 38 * unit - w / 2, y: 22 * unit - h / 2 }));
  if (moment === "crossing") {
    const [dx, dy] = turned([27 * unit, 0], tilt);
    inner.push(place(cometSvg(makeComet(1), palette, { unit, turn: tilt }), { x: entry[0] + dx, y: entry[1] + dy }));
  }
  return [clipped(-w / 2, -h / 2, w, h, inner.join("")), rect(-w / 2, -h / 2, w, h, "none", { stroke: palette.fieldLine, "stroke-width": 2 })].join("");
}

/**
 * Returns the comet's warning on a panel: its three pulse frames close up,
 * its still form, today's, and the field as it is warned and crossed.
 *
 * @param {number} px
 * @param {number} py
 * @param {number} width
 * @param {Palette} palette
 * @returns {string}
 */
function warningPanel(px, py, width, palette) {
  const parts = [panel(px, py, width, 262, palette)];
  const unit = 18;
  parts.push(note(px + 16, py + 46, "At the field's left edge, at 18 px a unit: a bar on the edge, three chevrons lit in turn, and a faint lane as wide as the comet", palette));
  /** @type {[string, () => string][]} */
  const cells = [
    ["today", () => warningTodaySvg(palette, { unit })],
    ["0 ms", () => warningSvg(0, palette, { unit })],
    ["250 ms", () => warningSvg(1, palette, { unit })],
    ["500 ms", () => warningSvg(2, palette, { unit })],
    ["reduced motion", () => warningSvg("still", palette, { unit })],
  ];
  cells.forEach(([name, draw], i) => {
    const left = px + 22 + i * 148;
    const top = py + 66;
    parts.push(clipped(left, top, 134, 150, place(draw(), { x: left + 2, y: top + 75 })));
    parts.push(rect(left, top, 2, 150, palette.fieldLine));
    parts.push(note(left + 67, top + 172, name, palette, { anchor: "middle" }));
  });
  const small = 5;
  parts.push(place(cometField(palette, small, "warned"), { x: px + 770 + 180, y: py + 142 }));
  parts.push(note(px + 770 + 180, py + 254, "warned for 1.5 s, at 5 px a unit", palette, { anchor: "middle", size: 10 }));
  parts.push(place(cometField(palette, small, "crossing"), { x: px + 1146 + 180, y: py + 142 }));
  parts.push(note(px + 1146 + 180, py + 254, "then crossing, 26 units a second", palette, { anchor: "middle", size: 10 }));
  return parts.join("");
}

// --- The burr -----------------------------------------------------------

/**
 * Returns the burr on a panel: close up, drifting, beside what it must not
 * be taken for, clinging to the ship, and shaken off by a dash.
 *
 * @param {number} px
 * @param {number} py
 * @param {number} width
 * @param {Palette} palette
 * @returns {string}
 */
function burrPanel(px, py, width, palette) {
  const parts = [panel(px, py, width, 218, palette)];
  const burr = makeBurr(1);
  const y = py + 112;
  parts.push(place(burrSvg(burr, palette, { unit: 80 }), { x: px + 86, y }));
  parts.push(note(px + 86, py + 198, "at 80 px a unit", palette, { anchor: "middle", size: 10 }));
  // At the two sizes it is judged at: a laptop's and a phone's.
  /** @type {[number, number, string][]} */ ([
    [15, px + 200, "15 px a unit: 18 px"],
    [9, px + 318, "9 px a unit: 11 px"],
  ]).forEach(([unit, left, words]) => {
    parts.push(place(burrSvg(burr, palette, { unit, turn: 0.3 }), { x: left, y: y - 22 }));
    parts.push(place(burrSvg(makeBurr(2), palette, { unit, turn: 1.4 }), { x: left + 2.6 * unit, y: y - 2 }));
    parts.push(place(burrSvg(makeBurr(3), palette, { unit, turn: 2.2, scale: 0.82 }), { x: left + 0.9 * unit, y: y + 26 }));
    parts.push(note(left + 1.3 * unit, py + 198, words, palette, { anchor: "middle", size: 10 }));
  });
  // Beside a small stone, a small piece of ice, a mote and an orb.
  const unit = 15;
  let x = px + 420;
  for (const [svg, step] of /** @type {[string, number][]} */ ([
    [rockSvg(makeRock("stone", "small", 3), palette, { unit, turn: 0.4 }), 34],
    [rockSvg(makeRock("ice", "small", 2), palette, { unit, turn: 0.9 }), 32],
    [burrSvg(burr, palette, { unit, turn: 0.3 }), 28],
    [moteSvg(2, palette, { unit }), 34],
    [orbSvg("slow", palette, { unit }), 0],
  ])) {
    parts.push(place(svg, { x, y }));
    x += step;
  }
  parts.push(note(px + 484, py + 198, "a small stone, small ice, a burr, a mote, an orb", palette, { anchor: "middle", size: 10 }));
  // Clinging: close up, and at the two sizes.
  parts.push(place(burredShipSvg(palette, { unit: 34, turn: -0.4 }), { x: px + 676, y }));
  parts.push(place(burredShipSvg(palette, { unit: 15, turn: -0.4 }), { x: px + 778, y: y - 24 }));
  parts.push(place(burredShipSvg(palette, { unit: 9, turn: -0.4 }), { x: px + 782, y: y + 30 }));
  parts.push(note(px + 714, py + 198, "three clinging to the ship, at 34, 15 and 9 px", palette, { anchor: "middle", size: 10 }));
  // Shaken off.
  [40, 150, 280].forEach((t, i) => {
    const left = px + 856 + i * 218;
    parts.push(clipped(left, py + 40, 212, 140, place(shakenFx(t, palette, { unit: 15, seed: 2 }), { x: left + 44, y })));
    parts.push(rect(left - 4, py + 44, 1, 140, palette.fieldLine));
    parts.push(note(left + 106, py + 198, `shaken off by a dash, ${t} ms`, palette, { anchor: "middle", size: 10 }));
  });
  return parts.join("");
}

/** The sheet's sections, in order. */
const SECTIONS = /** @type {Section[]} */ ([
  {
    heading: "Pickups: eight glass orbs",
    note: "Round is a friend, so each pickup is a glass ball 1.1 units in radius: a soft halo of the accent, a rim, a glint at the upper left where the field's light falls, and one bold symbol. The rim says what a pickup is for without color: a weapon's is one ring, protection's is doubled, a field effect's is cut in four arcs. Each symbol has a silhouette of its own: three bolts fanning apart, two roofs, a slanted arrow through a bar, a crest, a dart with a plus (a placeholder for the pod), a tilted horseshoe, an hourglass, a star.",
    height: 214,
    draw: (x, y, width) => heroRow(x, y, width, DARK),
  },
  {
    heading: "Now and after, in every palette",
    note: "Today's pickup is a rounded hexagon in the accent with its symbol in thin lines; the orb is beside it. At 6 px a unit an orb is about 14 px across: the inner glint and the glass's second tone are left out, a doubled rim becomes one thick rim, the Extra ship's plus goes and its dart fills the orb, and no line of a symbol is thinner than a pixel and a half.",
    height: 4 * 184 - 12,
    draw: (x, y, width) => EVERY.map((palette, i) => nowAndAfter(x, y + i * 184, width, palette)).join(""),
  },
  {
    heading: "An orb's states",
    note: "At rest; breathing, between its own size and 7% larger, its halo with it; and blinking for its last 2 seconds, between whole and a faint ghost of itself with no halo, 2.5 times a second as today. Reduced motion: no breath, and for its last 2 seconds it holds dim, without its halo, instead of blinking.",
    height: 236,
    draw: (x, y) => [statesPanel(x, y, DARK), statesPanel(x + HALF + GAP, y, LIGHT)].join(""),
  },
  {
    heading: "Motes",
    note: "Tiny glowing bits a broken rock sheds and the ship gathers: a diamond at the smallest size and a four-point spark at the other two, in the accent, each in a small halo. They are sparks, so never rocks, and too small and too still to be shots. Drawn in, each takes a curved path and leaves a short tail.",
    height: 270,
    draw: (x, y) => [motesPanel(x, y, DARK), motesPanel(x + HALF + GAP, y, LIGHT)].join(""),
  },
  {
    heading: "The comet",
    note: "Pointed with a tail is fast and deadly. Its head is cut and lit as a rock is, but it is a long sharp wedge in the danger color, which no rock is; its leading edge glows; five streaks trail it, the middle one hot; and thin lines beside it say 26 units a second. Under 10 px a unit the leading edge and half the thin lines are left out.",
    height: 322,
    draw: (x, y) => [cometPanel(x, y, DARK), cometPanel(x + HALF + GAP, y, LIGHT)].join(""),
  },
  {
    heading: "The comet's warning",
    note: "For 1.5 seconds before it comes: a bar on the edge it will come in by, three chevrons pointing the way it will fly, lit one after another, a step every 250 ms, so the run passes twice before it comes, and a faint lane across the whole field, two units wide as the comet is, so the player sees where not to be. Reduced motion: the three chevrons hold, each fainter than the one before, which still points the way.",
    height: 2 * 274 - 12,
    draw: (x, y, width) => [warningPanel(x, y, width, DARK), warningPanel(x, y + 274, width, LIGHT)].join(""),
  },
  {
    heading: "The burr",
    note: "A hazard that harms nothing: a small dark seed with six bold thorns, each longer than the seed is wide, sharp, and barbed at its end, all the same way round. It clings to the ship and slows it until a dash shakes it off. It is judged at 15 px a unit, where it is 18 px across, and at 9, where it is 11 and its barbs are left out so its thorns stay sharp. Its ink is a dull chestnut brown, between the warning and danger colors and sunk toward the field, at 3.5 to 1 against it or better: no accent's gold, no comet's red. It is mostly gaps, so no rock; it is brown and does not glow, so no spark; it has six arms and a core, so no orb. On the hull its outline in the field's color is half as wide again, so each thorn is cased apart from the accent. Reduced motion: shaken burrs are simply gone.",
    height: 2 * 230 - 12,
    draw: (x, y, width) => [burrPanel(x, y, width, DARK), burrPanel(x, y + 230, width, LIGHT)].join(""),
  },
]);

/**
 * Builds the sheet, writing its SVG and its PNG preview.
 *
 * @returns {Promise<void>}
 */
export async function build() {
  const sheet = {
    title: "Asteroid Breaker uplift: pickups, motes and hazards",
    lead: "Concept art, drawn by lib/things.mjs. Shape says what each thing is before color does: an orb is round, a mote is a spark, the comet is a wedge with a tail, a burr is a small seed with barbed thorns. Every tone is a role of the palette or a mix of two.",
    sections: SECTIONS,
  };
  resetClips();
  const draft = sheetFile(sheet);
  resetClips();
  const svg = sheetFile({ ...sheet, defs: [...EVERY.map((palette) => rockDefs(palette)), glowDefs(draft)].join("") });
  await writeText(join(ART, "pickups-and-hazards.svg"), svg);
  await writeRaster(svg, join(ART, "preview/pickups-and-hazards.png"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await build();
