// The small things of the uplift's field: the pickups, as round glass orbs
// with a bold symbol each; the motes a broken rock sheds; the comet and its
// warning; and the burr. Each is made as plain data first, in field units
// or in shares of its own size, then drawn for a palette at a unit.
//
// Shape says what each is before color does: an orb is round, so a friend;
// a mote is a spark; the comet is a long wedge with a tail, so fast and
// deadly; a burr is a round seed in a whorl of hooks, so it clings.

import {
  TURN,
  between,
  circle,
  lerp,
  mix,
  normalOf,
  num,
  path,
  place,
  polar,
  polygon,
  polyline,
  rect,
  ring,
  seeded,
  turned,
} from "./core.mjs";
import { PILOT_INKS, tonesOf } from "./palettes.mjs";
import { litBy, toneAt } from "./rocks.mjs";
import { FX_MS, dashFx, dashedAt, easeOut, energyOf, glow, seen, shareOf, shipPlaceholder, sparkPoints } from "./fx.mjs";

/** @import { Point, Vec3 } from "./core.mjs" */
/** @import { Palette } from "./palettes.mjs" */

// --- Pickups ------------------------------------------------------------

/** @typedef {"spread" | "rapid" | "shield" | "ship" | "lance" | "magnet" | "slow" | "nova"} PickupId */
/** @typedef {"weapon" | "guard" | "field"} PickupGroup */

/** Every pickup, in How to play's order. */
export const PICKUP_IDS = /** @type {PickupId[]} */ (["spread", "rapid", "shield", "ship", "lance", "magnet", "slow", "nova"]);

/** Each pickup's name, as How to play has it. */
export const PICKUP_NAMES = /** @type {Record<PickupId, string>} */ ({
  spread: "Spread",
  rapid: "Rapid",
  shield: "Shield",
  ship: "Extra ship",
  lance: "Lance",
  magnet: "Magnet",
  slow: "Slow",
  nova: "Nova",
});

/**
 * What each pickup is for, which its rim says: a weapon's rim is one plain
 * ring, a guard's is doubled, and a field effect's is cut in four arcs.
 */
export const PICKUP_GROUPS = /** @type {Record<PickupId, PickupGroup>} */ ({
  spread: "weapon",
  rapid: "weapon",
  lance: "weapon",
  shield: "guard",
  ship: "guard",
  magnet: "field",
  slow: "field",
  nova: "field",
});

/** An orb's sizes, in field units: its radius, its rim's width, how far its halo reaches and its symbol's square. */
export const ORB = { radius: 1.1, rim: 0.17, halo: 2.05, symbol: 1.32 };

/**
 * @typedef {object} Symbol A pickup's symbol, in shares of its square, about its middle.
 * @property {{ points: Point[], width: number }[]} lines
 * @property {Point[][]} fills
 * @property {{ points: Point[], width: number }[]} cuts Lines drawn over it in the color under it.
 */

/**
 * Returns a pickup's symbol.
 *
 * Each has a silhouette of its own that holds at nine pixels: three bolts
 * fanning apart, two roofs, a slanted arrow through a bar, a crest, a
 * dart with a plus, a tilted horseshoe, an hourglass and a star.
 *
 * @param {PickupId} id
 * @param {{ small?: boolean }} [how] Small, for under 10 px a unit, where the Extra ship's plus is left out and its dart fills the square.
 * @returns {Symbol}
 */
export function makeSymbol(id, { small = false } = {}) {
  if (id === "ship" && small) {
    return { lines: [], fills: [[[0, -0.48], [0.4, 0.44], [0, 0.2], [-0.4, 0.44]]], cuts: [] };
  }
  switch (id) {
    case "spread":
      return {
        // Three bolts flying apart, each a round head on a thin tail, as the shots are.
        lines: [
          { points: [[-0.1, 0.36], [-0.4, -0.2]], width: 0.1 },
          { points: [[0, 0.38], [0, -0.36]], width: 0.1 },
          { points: [[0.1, 0.36], [0.4, -0.2]], width: 0.1 },
          { points: [[-0.33, -0.08], [-0.42, -0.25]], width: 0.24 },
          { points: [[0, -0.22], [0, -0.41]], width: 0.24 },
          { points: [[0.33, -0.08], [0.42, -0.25]], width: 0.24 },
        ],
        fills: [],
        cuts: [],
      };
    case "rapid":
      return {
        lines: [
          { points: [[-0.36, -0.02], [0, -0.38], [0.36, -0.02]], width: 0.17 },
          { points: [[-0.36, 0.4], [0, 0.04], [0.36, 0.4]], width: 0.17 },
        ],
        fills: [],
        cuts: [],
      };
    case "lance":
      return {
        lines: [
          { points: [[-0.42, 0.42], [0.2, -0.2]], width: 0.16 },
          { points: [[-0.36, -0.04], [0.04, 0.36]], width: 0.15 },
        ],
        fills: [[[0.48, -0.48], [0.0, -0.36], [0.36, 0.0]]],
        cuts: [],
      };
    case "shield":
      return {
        lines: [],
        fills: [
          [[-0.4, -0.42], [0.4, -0.42], [0.4, 0.0], [0.35, 0.19], [0.21, 0.35], [0, 0.47], [-0.21, 0.35], [-0.35, 0.19], [-0.4, 0.0]],
        ],
        cuts: [],
      };
    case "ship":
      return {
        lines: [
          { points: [[0.3, -0.44], [0.3, -0.1]], width: 0.13 },
          { points: [[0.13, -0.27], [0.47, -0.27]], width: 0.13 },
        ],
        fills: [[[-0.12, -0.42], [0.2, 0.42], [-0.12, 0.22], [-0.44, 0.42]]],
        cuts: [],
      };
    case "magnet": {
      /** @type {Point[]} */
      const shoe = [[-0.27, -0.36]];
      for (let i = 0; i <= 8; i++) shoe.push(polar(TURN / 2 - (i / 8) * (TURN / 2), 0.27, [0, 0.08]));
      shoe.push([0.27, -0.36]);
      const tilt = 0.62;
      const tilted = (/** @type {Point[]} */ points) => points.map((p) => turned(p, tilt));
      return {
        lines: [{ points: tilted(shoe), width: 0.21 }],
        fills: [],
        cuts: [
          { points: tilted([[-0.42, -0.2], [-0.12, -0.2]]), width: 0.065 },
          { points: tilted([[0.12, -0.2], [0.42, -0.2]]), width: 0.065 },
        ],
      };
    }
    case "slow":
      return {
        lines: [
          { points: [[-0.34, -0.43], [0.34, -0.43]], width: 0.13 },
          { points: [[-0.34, 0.43], [0.34, 0.43]], width: 0.13 },
        ],
        fills: [
          [[-0.3, -0.36], [0.3, -0.36], [0.03, 0.02], [-0.03, 0.02]],
          [[-0.03, -0.02], [0.03, -0.02], [0.3, 0.36], [-0.3, 0.36]],
        ],
        cuts: [],
      };
    case "nova": {
      /** @type {Point[]} */
      const star = [];
      for (let i = 0; i < 16; i++) {
        const reach = i % 2 === 1 ? 0.16 : i % 4 === 0 ? 0.5 : 0.31;
        star.push(polar((i / 16) * TURN - TURN / 4, reach));
      }
      return { lines: [], fills: [star], cuts: [] };
    }
  }
}

/**
 * Returns a pickup's symbol drawn in a color, about its middle.
 *
 * @param {PickupId} id
 * @param {string} color
 * @param {number} side Its square's side, in pixels.
 * @param {{ ground?: string, least?: number, small?: boolean }} [how] The color under it, the thinnest a line gets, in pixels, and whether it is drawn as it is under 10 px a unit.
 * @returns {string}
 */
export function symbolSvg(id, color, side, { ground = "none", least = 1.3, small = false } = {}) {
  const symbol = makeSymbol(id, { small });
  const px = (/** @type {Point[]} */ points) => points.map(([x, y]) => /** @type {Point} */ ([x * side, y * side]));
  return [
    ...symbol.fills.map((points) => polygon(px(points), color, { stroke: color, "stroke-width": Math.max(0.5, 0.03 * side), "stroke-linejoin": "round" })),
    ...symbol.lines.map(({ points, width }) => polyline(px(points), color, Math.max(least, width * side))),
    ...(ground === "none" ? [] : symbol.cuts.map(({ points, width }) => polyline(px(points), ground, Math.max(0.8, width * side), { "stroke-linecap": "butt" }))),
  ].join("");
}

/**
 * Returns an arc of a circle about the origin, as a path's `d`.
 *
 * @param {number} r
 * @param {number} from In radians.
 * @param {number} to
 * @returns {string}
 */
function arcD(r, from, to) {
  const [x0, y0] = polar(from, r);
  const [x1, y1] = polar(to, r);
  return `M${num(x0)} ${num(y0)}A${num(r)} ${num(r)} 0 ${to - from > TURN / 2 ? 1 : 0} 1 ${num(x1)} ${num(y1)}`;
}

/**
 * Returns a pickup as a round glass orb, about its middle: a soft halo, a
 * glass ball in a rim that says its group, a glint at its upper left, and
 * its symbol.
 *
 * @param {PickupId} id
 * @param {Palette} palette
 * @param {{ unit?: number, breath?: number, dim?: boolean, opacity?: number }} [how]
 *   Its breath, from 0, breathed out, to 1, in; dim, as it is while it
 *   blinks off, or holds where motion isn't welcome, before it fades.
 * @returns {string}
 */
export function orbSvg(id, palette, { unit = 16, breath = 0, dim = false, opacity } = {}) {
  const light = palette.mode === "light";
  const accent = palette.accent;
  const r = ORB.radius * unit;
  const rim = Math.max(1.2, ORB.rim * unit);
  const small = unit < 10;
  const glass = mix(palette.field, accent, light ? 0.13 : 0.26);
  const inner = mix(palette.field, accent, light ? 0.24 : 0.4);
  const ink = light ? mix(accent, palette.fieldText, 0.42) : mix(accent, "#ffffff", 0.74);
  const group = PICKUP_GROUPS[id];
  const parts = [];
  if (!dim) parts.push(glow(0, 0, ORB.halo * unit * (1 + 0.1 * breath), accent, palette, 0.72 + 0.28 * breath));
  parts.push(circle(0, 0, r + Math.max(1, 0.12 * unit), palette.field));
  parts.push(circle(0, 0, r, glass));
  if (!small) parts.push(circle(0.07 * r, 0.1 * r, r * 0.74, inner, { opacity: 0.55 }));
  const at = r - rim / 2;
  if (group === "field") {
    // Four arcs, cut at the top, the bottom and each side.
    const gap = small ? 0.3 : 0.24;
    for (let i = 0; i < 4; i++) {
      const from = (i / 4) * TURN + gap;
      parts.push(path(arcD(at, from, from + TURN / 4 - 2 * gap), { fill: "none", stroke: accent, "stroke-width": rim, "stroke-linecap": "round" }));
    }
  } else if (group === "guard" && small) {
    parts.push(ring(0, 0, r - rim * 0.85, accent, rim * 1.7));
  } else {
    parts.push(ring(0, 0, at, accent, rim));
    if (group === "guard") parts.push(ring(0, 0, r - rim - 0.1 * unit - 0.04 * unit, accent, Math.max(1, 0.08 * unit)));
  }
  const side = ORB.symbol * unit * (group === "guard" ? 0.86 : group === "field" ? 0.96 : 1);
  parts.push(symbolSvg(id, ink, side, { ground: glass, least: small ? 1.5 : 1.3, small }));
  // The glint, on the rim, where the field's light falls.
  parts.push(path(arcD(at, TURN * 0.555, TURN * 0.68), { fill: "none", stroke: "#ffffff", "stroke-width": Math.max(1, rim * 0.62), "stroke-linecap": "round", opacity: 0.9 }));
  if (!small) parts.push(circle(...polar(TURN * 0.615, r * 0.6), Math.max(0.8, 0.07 * unit), "#ffffff", { opacity: light ? 0.9 : 0.7 }));
  return place(parts.join(""), { scale: 1 + 0.07 * breath, ...seen(opacity ?? (dim ? 0.5 : undefined)) });
}

/**
 * Returns a pickup as the game draws it today: a rounded hexagon in the
 * accent, with its symbol in thin lines.
 *
 * @param {PickupId} id
 * @param {Palette} palette
 * @param {{ unit?: number }} [how]
 * @returns {string}
 */
export function pickupTodaySvg(id, palette, { unit = 16 } = {}) {
  const corner = 0.27 * unit;
  const reach = 0.95 * unit - corner / Math.cos(TURN / 12);
  /** @type {Point[]} */
  const hexagon = [];
  for (let i = 0; i < 6; i++) hexagon.push(polar(TURN / 12 + (i / 6) * TURN, reach));
  const outline = Math.max(1, 0.12 * unit);
  const pen = Math.max(1, 0.14 * unit);
  const on = palette.onAccent;
  const px = (/** @type {Point[]} */ points) => points.map(([x, y]) => /** @type {Point} */ ([x * unit, y * unit]));
  const line = (/** @type {Point[]} */ points) => polyline(px(points), on, pen);
  /** @type {string[]} */
  let symbol = [];
  switch (id) {
    case "spread":
      symbol = [line([[0, 0.42], [-0.4, -0.34]]), line([[0, 0.42], [0, -0.44]]), line([[0, 0.42], [0.4, -0.34]])];
      break;
    case "rapid":
      symbol = [line([[-0.34, 0.02], [0, -0.32], [0.34, 0.02]]), line([[-0.34, 0.38], [0, 0.04], [0.34, 0.38]])];
      break;
    case "shield":
      symbol = [ring(0, 0, 0.4 * unit, on, pen), circle(0, 0, 0.14 * unit, on)];
      break;
    case "ship":
      // A pilot in its window: here a dot stands in for the fuzzball.
      symbol = [circle(0, 0, 0.56 * unit, on), circle(0, 0.03 * unit, 0.4 * unit, PILOT_INKS[palette.mode][0] ?? palette.danger)];
      break;
    case "lance":
      symbol = [ring(0, 0, 0.26 * unit, on, pen), line([[-0.5, 0], [0.5, 0]]), line([[0.3, -0.18], [0.5, 0], [0.3, 0.18]])];
      break;
    case "magnet": {
      /** @type {Point[]} */
      const shoe = [[-0.3, -0.4]];
      for (let i = 0; i <= 8; i++) shoe.push(polar(TURN / 2 - (i / 8) * (TURN / 2), 0.3, [0, 0.04]));
      shoe.push([0.3, -0.4]);
      symbol = [line(shoe)];
      break;
    }
    case "slow":
      symbol = [polygon(px([[-0.3, -0.42], [0.3, -0.42], [0, 0]]), on), polygon(px([[0, 0], [0.3, 0.42], [-0.3, 0.42]]), on)];
      break;
    case "nova":
      for (let i = 0; i < 8; i++) symbol.push(line([polar((i / 8) * TURN, 0.16), polar((i / 8) * TURN, 0.46)]));
      break;
  }
  return [
    polygon(hexagon, palette.field, { stroke: palette.field, "stroke-width": 2 * (corner + outline), "stroke-linejoin": "round" }),
    polygon(hexagon, palette.accent, { stroke: palette.accent, "stroke-width": 2 * corner, "stroke-linejoin": "round" }),
    ...symbol,
  ].join("");
}

// --- Motes --------------------------------------------------------------

/** How far a mote of each size reaches, in field units. */
export const MOTE_SIZES = /** @type {[number, number, number]} */ ([0.15, 0.25, 0.35]);

/**
 * Returns a mote about its middle: a glowing bit in the accent, a diamond
 * at its smallest and a four-point spark at the other two sizes.
 *
 * @param {0 | 1 | 2} size
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, opacity?: number }} [how]
 * @returns {string}
 */
export function moteSvg(size, palette, { unit = 16, turn = 0, opacity } = {}) {
  const tones = energyOf(palette.accent, palette);
  const r = Math.max(1.3, MOTE_SIZES[size] * unit);
  const pinch = /** @type {number} */ ([0.62, 0.34, 0.27][size]);
  return place(
    [
      glow(0, 0, Math.max(3.4, r * 2.7), tones.halo, palette, 0.85),
      polygon(sparkPoints(r, pinch, turn), tones.body, { stroke: tones.body, "stroke-width": 0.4, "stroke-linejoin": "round" }),
      r >= 2 ? polygon(sparkPoints(r * 0.55, pinch, turn), tones.hot) : "",
    ].join(""),
    seen(opacity),
  );
}

/**
 * @typedef {object} Mote
 * @property {Point} at In field units, from the break.
 * @property {0 | 1 | 2} size
 * @property {number} turn
 */

/**
 * Returns the motes a broken rock sheds, scattered about its middle: half
 * small, a third medium and the rest large.
 *
 * @param {number} seed
 * @param {{ count?: number, reach?: [number, number] }} [how] How far they scatter, in field units.
 * @returns {Mote[]}
 */
export function makeMotes(seed, { count = 12, reach = [1.2, 4.2] } = {}) {
  const random = seeded(seed * 449 + 21);
  /** @type {Mote[]} */
  const motes = [];
  for (let i = 0; i < count; i++) {
    const size = /** @type {0 | 1 | 2} */ (i % 6 === 5 ? 2 : i % 3 === 1 ? 1 : 0);
    motes.push({
      at: polar(((i + between(random, -0.35, 0.35)) / count) * TURN, between(random, reach[0], reach[1])),
      size,
      turn: between(random, -0.3, 0.3),
    });
  }
  return motes;
}

/**
 * Returns the curved way a mote is drawn in by, as points from where it
 * lay to the ship.
 *
 * @param {Point} from
 * @param {Point} to
 * @param {number} bend How far its middle swings to one side, as a share of its length.
 * @returns {Point[]}
 */
export function motePath(from, to, bend) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  /** @type {Point} */
  const pull = [(from[0] + to[0]) / 2 - dy * bend, (from[1] + to[1]) / 2 + dx * bend];
  /** @type {Point[]} */
  const points = [];
  for (let i = 0; i <= 16; i++) {
    const s = i / 16;
    points.push([
      (1 - s) ** 2 * from[0] + 2 * s * (1 - s) * pull[0] + s * s * to[0],
      (1 - s) ** 2 * from[1] + 2 * s * (1 - s) * pull[1] + s * s * to[1],
    ]);
  }
  return points;
}

/**
 * Returns a mote on its way in to the ship: the mote a share of the way
 * along its path, a tail fading behind it, and the rest of its way dotted.
 *
 * @param {Point[]} way As `motePath()` returns it, in field units.
 * @param {number} share
 * @param {0 | 1 | 2} size
 * @param {Palette} palette
 * @param {{ unit?: number, guide?: boolean }} [how] Whether the rest of its way is dotted in, for a drawing that explains it.
 * @returns {string}
 */
export function moteDrawnSvg(way, share, size, palette, { unit = 16, guide = true } = {}) {
  const tones = energyOf(palette.accent, palette);
  const px = (/** @type {Point[]} */ points) => points.map(([x, y]) => /** @type {Point} */ ([x * unit, y * unit]));
  const at = share * (way.length - 1);
  const whole = Math.floor(at);
  const a = /** @type {Point} */ (way[whole]);
  const b = /** @type {Point} */ (way[Math.min(whole + 1, way.length - 1)]);
  /** @type {Point} */
  const head = [lerp(a[0], b[0], at - whole), lerp(a[1], b[1], at - whole)];
  const parts = [];
  if (guide) {
    parts.push(polyline(px([head, ...way.slice(whole + 1)]), tones.body, Math.max(1, 0.05 * unit), { opacity: 0.35, "stroke-dasharray": `${num(0.18 * unit)} ${num(0.3 * unit)}` }));
  }
  const tail = [...way.slice(Math.max(0, whole - 4), whole + 1), head];
  for (let i = 0; i + 1 < tail.length; i++) {
    const near = (i + 1) / (tail.length - 1);
    parts.push(polyline(px([/** @type {Point} */ (tail[i]), /** @type {Point} */ (tail[i + 1])]), tones.body, Math.max(1, MOTE_SIZES[size] * unit * 0.9 * near), { opacity: 0.6 * near }));
  }
  parts.push(place(moteSvg(size, palette, { unit }), { x: head[0] * unit, y: head[1] * unit }));
  return parts.join("");
}

// --- The comet ----------------------------------------------------------

/**
 * @typedef {object} CometShape The comet, flying along x, about the middle it hits with, in field units.
 * @property {number} radius How far from its middle it meets what it touches.
 * @property {Point[]} outline Its head's.
 * @property {{ points: Point[], normal: Vec3 }[]} facets
 * @property {Point[]} edge Its leading edge, which glows.
 * @property {{ y: number, from: number, length: number, half: number }[]} tail Streaks behind its head.
 * @property {{ y: number, from: number, length: number }[]} streaks Thin lines beside it, for its speed.
 */

/**
 * Returns the comet: a long, sharp wedge cut in facets, with a tail of
 * streaks behind it.
 *
 * @param {number} [seed]
 * @returns {CometShape}
 */
export function makeComet(seed = 1) {
  const random = seeded(seed * 577 + 31);
  const j = () => between(random, -0.05, 0.05);
  /** @type {Point} */
  const nose = [1.8, 0];
  /** @type {Point} */
  const s1 = [-0.12 + j(), -0.84 + j()];
  /** @type {Point} */
  const b1 = [-1.08 + j(), -0.5 + j()];
  /** @type {Point} */
  const notch = [-0.66, j()];
  /** @type {Point} */
  const b2 = [-1.02 + j(), 0.56 + j()];
  /** @type {Point} */
  const s2 = [-0.2 + j(), 0.86 + j()];
  /** @type {Point} */
  const r1 = [0.6, j()];
  /** @type {Point} */
  const r2 = [-0.32, j()];
  const flat = (/** @type {Point} */ p) => /** @type {Vec3} */ ([p[0], p[1], 0]);
  const high = (/** @type {Point} */ p, /** @type {number} */ z) => /** @type {Vec3} */ ([p[0], p[1], z]);
  const R1 = high(r1, 0.5);
  const R2 = high(r2, 0.72);
  /** @type {[Point[], Vec3][]} */
  const cuts = [
    [[nose, s1, r1], normalOf(flat(nose), flat(s1), R1)],
    [[s1, r2, r1], normalOf(flat(s1), R2, R1)],
    [[s1, b1, r2], normalOf(flat(s1), flat(b1), R2)],
    [[b1, notch, r2], normalOf(flat(b1), flat(notch), R2)],
    [[nose, r1, s2], normalOf(flat(nose), R1, flat(s2))],
    [[s2, r1, r2], normalOf(flat(s2), R1, R2)],
    [[s2, r2, b2], normalOf(flat(s2), R2, flat(b2))],
    [[b2, r2, notch], normalOf(flat(b2), R2, flat(notch))],
  ];
  return {
    radius: 1,
    outline: [nose, s1, b1, notch, b2, s2],
    facets: cuts.map(([points, normal]) => ({ points, normal })),
    edge: [lerpPoint(s1, nose, 0.35), nose, lerpPoint(s2, nose, 0.35)],
    tail: [
      { y: 0, from: -0.6, length: 6.4, half: 0.3 },
      { y: -0.36, from: -0.85, length: 4.3, half: 0.17 },
      { y: 0.38, from: -0.85, length: 4.8, half: 0.18 },
      { y: -0.66, from: -0.5, length: 2.6, half: 0.1 },
      { y: 0.68, from: -0.55, length: 3.0, half: 0.1 },
    ],
    streaks: [
      { y: -1.25, from: -0.6, length: 2.2 },
      { y: 1.3, from: -1.4, length: 2.8 },
      { y: -1.0, from: -4.2, length: 1.8 },
      { y: 1.05, from: -5.2, length: 1.6 },
      { y: -1.55, from: -3.2, length: 1.2 },
      { y: 0.2, from: -7.4, length: 1.5 },
    ],
  };
}

/**
 * Returns a point a share of the way between two.
 *
 * @param {Point} a
 * @param {Point} b
 * @param {number} share
 * @returns {Point}
 */
function lerpPoint(a, b, share) {
  return [lerp(a[0], b[0], share), lerp(a[1], b[1], share)];
}

/**
 * Returns the comet drawn in the palette's danger color, about its middle:
 * its head cut and lit as a rock is, its leading edge and its tail glowing.
 *
 * @param {CometShape} comet
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, tail?: boolean }} [how] The way it flies, in radians; whether its tail and its streaks are drawn.
 * @returns {string}
 */
export function cometSvg(comet, palette, { unit = 16, turn = 0, tail = true } = {}) {
  const tones = tonesOf(palette.danger, palette);
  const energy = energyOf(palette.danger, palette);
  const small = unit < 10;
  const at = (/** @type {Point} */ p) => {
    const [x, y] = turned(p, turn);
    return /** @type {Point} */ ([x * unit, y * unit]);
  };
  const degrees = (turn / TURN) * 360;
  const parts = [];
  if (tail) {
    const [hx, hy] = at([-2.6, 0]);
    parts.push(glow(hx, hy, 4.4 * unit, energy.halo, palette, 0.7, { ry: 1.25 * unit, turn: degrees }));
    comet.streaks.slice(0, small ? 3 : 6).forEach((streak) => {
      parts.push(polyline([at([streak.from, streak.y]), at([streak.from - streak.length, streak.y])], energy.body, Math.max(1, 0.07 * unit), { opacity: 0.4 }));
    });
    comet.tail.forEach((streak, i) => {
      const shape = (/** @type {number} */ share) => [at([streak.from, streak.y - streak.half]), at([streak.from - streak.length * share, streak.y]), at([streak.from, streak.y + streak.half])];
      parts.push(polygon(shape(1), energy.body, { opacity: 0.28 }));
      parts.push(polygon(shape(0.6), energy.body, { opacity: 0.4 }));
      if (i === 0) parts.push(polygon(shape(0.34).map((p, k) => (k === 1 ? p : lerpPoint(p, at([streak.from, streak.y]), 0.45))), energy.hot, { opacity: 0.9 }));
    });
  }
  const [nx, ny] = at([0.5, 0]);
  parts.push(glow(nx, ny, 2.1 * unit, energy.halo, palette, 0.75));
  const width = Math.max(2.5, 0.28 * unit);
  parts.push(polygon(comet.outline.map(at), palette.field, { stroke: palette.field, "stroke-width": width, "stroke-linejoin": "round" }));
  for (const facet of comet.facets) {
    const fill = toneAt(litBy(facet.normal, turn), tones);
    parts.push(polygon(facet.points.map(at), fill, { stroke: fill, "stroke-width": 0.6, "stroke-linejoin": "round" }));
  }
  if (!small) parts.push(polyline(comet.edge.map(at), energy.hot, Math.max(1, 0.08 * unit), { "stroke-linejoin": "miter", opacity: 0.95 }));
  return parts.join("");
}

/**
 * Returns the comet as the game draws it today: a disc with a short curved tail.
 *
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number }} [how]
 * @returns {string}
 */
export function cometTodaySvg(palette, { unit = 16, turn = 0 } = {}) {
  const u = unit;
  const d = `M0 ${num(-u)}Q${num(-1.54 * u)} ${num(-0.55 * u)} ${num(-2.8 * u)} 0Q${num(-1.54 * u)} ${num(0.55 * u)} 0 ${num(u)}Z`;
  return place(
    [path(d, { fill: palette.danger }), circle(0, 0, 1.1 * u + Math.max(1, 0.12 * u), palette.field), circle(0, 0, 1.1 * u, palette.danger)].join(""),
    { turn: (turn / TURN) * 360 },
  );
}

/**
 * Returns the comet's warning, about the point on the field's edge it will
 * come in by, pointing along x into the field: a bar on the edge, three
 * chevrons that light in turn, and a faint lane across the field as wide as
 * the comet, which says where it will fly and which way.
 *
 * @param {0 | 1 | 2 | "still"} frame The chevron that is lit; still, for all three held, each fainter than the one before.
 * @param {Palette} palette
 * @param {{ unit?: number, lane?: number }} [how] How long its lane is, in field units.
 * @returns {string}
 */
export function warningSvg(frame, palette, { unit = 16, lane = 40 } = {}) {
  const energy = energyOf(palette.danger, palette);
  const light = palette.mode === "light";
  const pen = Math.max(1.4, 0.3 * unit);
  const parts = [
    rect(0, -unit, lane * unit, 2 * unit, palette.danger, { opacity: light ? 0.07 : 0.09 }),
    polyline([[3.9 * unit, 0], [lane * unit, 0]], palette.danger, Math.max(1, 0.1 * unit), {
      opacity: 0.45,
      "stroke-dasharray": `${num(0.7 * unit)} ${num(0.7 * unit)}`,
      "stroke-linecap": "butt",
    }),
    polyline([[0, -1.15 * unit], [0, 1.15 * unit]], palette.danger, Math.max(2, 0.36 * unit), { "stroke-linecap": "butt" }),
  ];
  [0, 1, 2].forEach((i) => {
    const x = (0.95 + i * 1.05) * unit;
    const size = /** @type {number} */ ([1, 0.86, 0.72][i]) * unit;
    const lit = frame === "still" ? /** @type {number} */ ([1, 0.7, 0.45][i]) : frame === i ? 1 : 0.32;
    const points = /** @type {Point[]} */ ([[x - 0.4 * size, -0.8 * size], [x + 0.4 * size, 0], [x - 0.4 * size, 0.8 * size]]);
    if (frame === i) parts.push(glow(x, 0, 1.5 * size, energy.halo, palette, 0.8));
    parts.push(polyline(points, palette.danger, pen, { opacity: lit, "stroke-linejoin": "miter" }));
    if (frame === i && !light) parts.push(polyline(points, energy.hot, pen * 0.36, { "stroke-linejoin": "miter" }));
  });
  return parts.join("");
}

/**
 * Returns the comet's warning as the game draws it today: two chevrons just inside the edge.
 *
 * @param {Palette} palette
 * @param {{ unit?: number }} [how]
 * @returns {string}
 */
export function warningTodaySvg(palette, { unit = 16 } = {}) {
  const px = (/** @type {Point[]} */ points) => points.map(([x, y]) => /** @type {Point} */ ([(x + 1.5) * unit, y * unit]));
  const pen = Math.max(1, 0.32 * unit);
  return [
    polyline(px([[-0.45, -0.8], [0.35, 0], [-0.45, 0.8]]), palette.danger, pen),
    polyline(px([[-1.15, -0.55], [-0.6, 0], [-1.15, 0.55]]), palette.danger, pen),
  ].join("");
}

// --- The burr -----------------------------------------------------------

/** How far a burr reaches to its hooks' ends, in field units. */
export const BURR_RADIUS = 0.6;

/**
 * @typedef {object} BurrShape A burr, in shares of how far it reaches.
 * @property {Point[]} core Its round seed.
 * @property {Point[][]} spines Each a thin curve out from the seed, hooked at its end.
 */

/**
 * Returns a burr: a round seed in a whorl of thin spines, long and short
 * by turns, each barbed the same way round at its end, which is what clings.
 *
 * @param {number} [seed]
 * @param {{ spines?: number }} [how]
 * @returns {BurrShape}
 */
export function makeBurr(seed = 1, { spines = 13 } = {}) {
  const random = seeded(seed * 269 + 37);
  /** @type {Point[]} */
  const core = [];
  for (let i = 0; i < 16; i++) core.push(polar((i / 16) * TURN, between(random, 0.43, 0.48)));
  /** @type {Point[][]} */
  const whorl = [];
  for (let i = 0; i < spines; i++) {
    const a = ((i + between(random, -0.2, 0.2)) / spines) * TURN;
    // Long and short by turns, so its outline is ragged, as a burr's is.
    const reach = (i % 2 === 0 ? 1 : 0.8) * between(random, 0.93, 1);
    const tip = polar(a + 0.1, reach * 0.96);
    whorl.push([polar(a, 0.4), polar(a + 0.02, 0.4 + (reach - 0.4) * 0.55), tip, polar(a + 0.1 + TURN * 0.36, 0.2, tip)]);
  }
  return { core, spines: whorl };
}

/**
 * Returns the ink a burr is drawn in: the palette's warning, dulled toward
 * the field's muted text, so it is a seed's brown and no ember.
 *
 * @param {Palette} palette
 * @returns {string}
 */
export function burrInk(palette) {
  return mix(palette.warning, palette.fieldMuted, 0.4);
}

/**
 * Returns a burr drawn about its middle.
 *
 * @param {BurrShape} burr
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, scale?: number, opacity?: number }} [how]
 * @returns {string}
 */
export function burrSvg(burr, palette, { unit = 16, turn = 0, scale = 1, opacity } = {}) {
  const r = BURR_RADIUS * unit * scale;
  const tones = tonesOf(burrInk(palette), palette);
  const light = palette.mode === "light";
  const at = (/** @type {Point} */ p) => {
    const [x, y] = turned(p, turn);
    return /** @type {Point} */ ([x * r, y * r]);
  };
  const pen = Math.max(1, 0.085 * r);
  const outline = Math.max(1, 0.12 * unit);
  const parts = [];
  for (const spine of burr.spines) parts.push(polyline(spine.map(at), palette.field, pen + 2 * outline));
  parts.push(polygon(burr.core.map(at), palette.field, { stroke: palette.field, "stroke-width": 2 * outline, "stroke-linejoin": "round" }));
  for (const spine of burr.spines) parts.push(polyline(spine.map(at), light ? tones.shade : tones.lit, pen));
  parts.push(polygon(burr.core.map(at), light ? tones.ink : tones.shade));
  parts.push(circle(-0.08 * r, -0.1 * r, 0.33 * r, light ? tones.lit : tones.ink));
  if (r >= 8) {
    parts.push(circle(-0.17 * r, -0.2 * r, 0.09 * r, light ? "#ffffff" : tones.lit, { opacity: 0.85 }));
    for (const [x, y] of /** @type {Point[]} */ ([[0.14, 0.05], [-0.06, 0.22], [0.22, -0.16]])) {
      const [dx, dy] = at([x, y]);
      parts.push(circle(dx, dy, 0.05 * r, tones.deep, { opacity: 0.7 }));
    }
  }
  return place(parts.join(""), seen(opacity));
}

/** Where three burrs cling to the placeholder ship, in field units from its middle, and each one's turn. */
export const BURR_HOLDS = /** @type {{ at: Point, turn: number }[]} */ ([
  { at: [0.42, -0.34], turn: 0.4 },
  { at: [-0.72, 0.52], turn: 2.1 },
  { at: [-0.5, -0.5], turn: 4.2 },
]);

/**
 * Returns the placeholder ship with three burrs clinging to it, about its middle.
 *
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number }} [how] The ship's heading, in radians.
 * @returns {string}
 */
export function burredShipSvg(palette, { unit = 16, turn = 0 } = {}) {
  const parts = [shipPlaceholder(palette, { unit, turn })];
  BURR_HOLDS.forEach((hold, i) => {
    const [x, y] = turned(hold.at, turn);
    parts.push(place(burrSvg(makeBurr(i + 2), palette, { unit, turn: hold.turn + turn, scale: 0.82 }), { x: x * unit, y: y * unit }));
  });
  return parts.join("");
}

/**
 * Returns three burrs shaken off by a dash, at a time since it began,
 * about where it began, the ship dashing along x: each lets go in turn and
 * tumbles off behind, fading.
 *
 * @param {number} t In milliseconds; they are gone by `FX_MS.shaken`.
 * @param {Palette} palette
 * @param {{ unit?: number, seed?: number }} [how]
 * @returns {string}
 */
export function shakenFx(t, palette, { unit = 16, seed = 1 } = {}) {
  const random = seeded(seed * 601 + 41);
  const energy = energyOf(palette.accent, palette);
  const parts = [dashFx(t, palette, { unit, seed })];
  BURR_HOLDS.forEach((hold, i) => {
    const lets = 20 + i * 35;
    const heading = Math.atan2(hold.at[1], hold.at[0] - 0.9) + between(random, -0.3, 0.3);
    const far = between(random, 1.6, 2.8);
    const spin = between(random, 2.5, 5) * (i % 2 === 0 ? 1 : -1);
    const s = shareOf(t, lets, FX_MS.shaken);
    if (s >= 1) return;
    // Until it lets go it rides the ship.
    const from = /** @type {Point} */ ([hold.at[0] + dashedAt(Math.min(t, lets)), hold.at[1]]);
    const [x, y] = polar(heading, far * easeOut(s), from);
    if (s > 0 && s < 0.6) {
      // A tick or two where it tore free.
      const [tx, ty] = [from[0] * unit, from[1] * unit];
      parts.push(polyline([polar(heading + 0.5, 0.25 * unit, [tx, ty]), polar(heading + 0.5, 0.6 * unit, [tx, ty])], energy.body, Math.max(1, 0.07 * unit), { opacity: 0.8 * (1 - s / 0.6) }));
      parts.push(polyline([polar(heading - 0.5, 0.25 * unit, [tx, ty]), polar(heading - 0.5, 0.6 * unit, [tx, ty])], energy.body, Math.max(1, 0.07 * unit), { opacity: 0.8 * (1 - s / 0.6) }));
    }
    parts.push(place(burrSvg(makeBurr(i + 2), palette, { unit, turn: hold.turn + spin * s, scale: 0.82 * (1 - 0.15 * s) }), { x: x * unit, y: y * unit, opacity: 1 - s ** 3 }));
  });
  return parts.join("");
}
