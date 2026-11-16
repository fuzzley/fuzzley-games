// The moments the mocks stage, each written once as plain data for
// `sceneSvg()` (./scene.mjs). A moment is written for the laptop's field,
// 82.4 by 40 units, and laid on any other as the game lays a paused field on
// a new room: every place at the same share of the way across and down.
// What hangs on the pod (its shots, its crew, the sparks it draws in) is
// written from the pod, so it keeps its own distances on any field.

import { TURN, polar } from "../../art/lib/core.mjs";
import { sparksAbout } from "./scene.mjs";

/** @import { Point } from "../../art/lib/core.mjs" */
/** @import { Palette } from "../../art/lib/palettes.mjs" */
/** @import { RockKind, RockSize } from "../../art/lib/rocks.mjs" */
/** @import { Moment, RockThing, SparkThing } from "./scene.mjs" */

/** The laptop's field at 1280 by 720: where it lies, in CSS pixels, and its size in field units. */
export const LAPTOP = {
  x: 24,
  y: 97,
  unit: 14.95,
  width: 1232 / 14.95,
  height: 40,
};

/** An upright phone's field at 390 by 844, under a compact bar and over the deck. */
export const PHONE = {
  x: 12,
  y: 68,
  unit: 9.15,
  width: 40,
  height: 564 / 9.15,
};

/**
 * @typedef {object} Field Where a moment is staged.
 * @property {Palette} palette
 * @property {number} width In field units.
 * @property {number} height
 * @property {number} unit
 * @property {boolean} [thin] Whether the rocks marked for a wide field alone are left out.
 */

/**
 * Returns a function that lays a place written for the laptop's field on a
 * field of another shape, at the same share of the way across and down.
 *
 * @param {Field} field
 * @returns {(at: Point) => Point}
 */
function layOn(field) {
  return ([x, y]) => [
    (x / LAPTOP.width) * field.width,
    (y / LAPTOP.height) * field.height,
  ];
}

/**
 * Returns a place a way off another.
 *
 * @param {Point} from
 * @param {number} dx
 * @param {number} dy
 * @returns {Point}
 */
function off([x, y], dx, dy) {
  return [x + dx, y + dy];
}

/**
 * The rocks of wave 9, Crowd, as today's screenshot has them: size, place,
 * seed, turn, and whether a field half the area leaves it out.
 *
 * @type {[RockSize, number, number, number, number, boolean?][]}
 */
const CROWD_ROCKS = [
  ["large", 30.8, 0.8, 11, 0.4],
  ["large", 37.4, 4.6, 12, 2.1],
  ["large", 46.5, 6.4, 13, 4.0, true],
  ["large", 36.1, 12.2, 14, 1.2],
  ["medium", 24.8, 13.9, 15, 0.7],
  ["small", 20.2, 16.9, 16, 2.6],
  ["small", 22.1, 16.2, 17, 5.1, true],
  ["large", 28.4, 18.2, 18, 3.3],
  ["medium", 35.8, 23.4, 19, 5.6],
  ["small", 21.5, 27.4, 20, 1.9, true],
  ["large", 35.3, 32.4, 21, 0.2],
  ["small", 51.3, 13.2, 22, 3.7],
  ["small", 56.4, 13.1, 23, 0.9, true],
  ["small", 63.4, 17.9, 24, 4.4],
  ["medium", 75.1, 28.5, 25, 2.9],
  ["medium", 55.7, 1.1, 26, 1.4, true],
  ["large", 60.5, 39.9, 27, 5.2],
  ["medium", 66.0, 0.3, 28, 3.0, true],
];

/**
 * Returns the moment the first mocks stage, on a field: wave 9, Crowd, in
 * the Inner belt, as today's screenshot has it, with what the uplift adds.
 * The pod at the lower left fires up the field with two of its crew in
 * tow; a stray pleads at the upper left; a large rock breaks at mid right;
 * sparks hang where a rock broke a moment ago, and three are on their way
 * in to the pod; a Spread drifts; static is at its second step.
 *
 * @param {Field} field
 * @returns {Moment}
 */
export function crowd(field) {
  const lay = layOn(field);
  const pod = lay([8.3, 34.6]);
  const turn = -TURN / 4;
  const broke = lay([58.6, 24.6]);
  // Where the medium rock broke a moment ago, up and to the right of the pod.
  const before = off(pod, 5.4, -2.2);
  /** @type {RockThing[]} */
  const rocks = CROWD_ROCKS.filter(
    ([, , , , , wide]) => !(field.thin && wide),
  ).map(([size, x, y, seed, spin]) => ({
    kind: /** @type {RockKind} */ ("stone"),
    size,
    seed,
    at: lay([x, y]),
    turn: spin,
  }));
  // The two pieces that rock left.
  rocks.push(
    {
      kind: "stone",
      size: "small",
      seed: 31,
      at: off(before, -1.9, -2.9),
      turn: 1.1,
    },
    {
      kind: "stone",
      size: "small",
      seed: 32,
      at: off(before, 3.1, 1.6),
      turn: 4.2,
    },
  );
  /** @type {SparkThing[]} */
  const sparks = [
    ...sparksAbout(before, 4, 3, [0.5, 1.7]),
    { at: off(pod, 4.3, 1.9), size: 1, drawn: 0.5, bend: -0.34 },
    { at: off(pod, 3.9, -3.6), size: 2, drawn: 0.62, bend: 0.3 },
    { at: off(pod, 5.6, -0.4), size: 1, drawn: 0.8, bend: 0.22 },
    // The three the breaking rock sheds, on their way out.
    { at: off(broke, -3.5, -1.5), size: 1, turn: 0.2, over: true },
    { at: off(broke, 2.9, -2.6), size: 2, turn: -0.2, over: true },
    { at: off(broke, 1.2, 3.6), size: 1, turn: 0.1, over: true },
  ];
  return {
    palette: field.palette,
    sector: "inner-belt",
    width: field.width,
    height: field.height,
    unit: field.unit,
    seed: 9,
    rocks,
    breaks: [
      {
        kind: "stone",
        size: "large",
        seed: 41,
        at: broke,
        t: 110,
        turn: 0.6,
        from: -0.5,
      },
    ],
    pod: {
      at: pod,
      turn,
      pilot: 0,
      face: "set",
      charge: 1,
      thrust: 0.55,
      trail: true,
      recharge: 0.7,
      muzzle: 0,
    },
    tow: { pilots: [1, 2], heading: turn + 0.14, phase: 0.5, sway: 0.5 },
    strays: [{ at: lay([27.0, 4.2]), pilot: 3, bob: -0.4 }],
    orbs: [{ id: "spread", at: lay([46.2, 20.6]), breath: 0.5 }],
    sparks,
    shots: [0, 1, 2, 3, 4, 5].map((i) => ({
      at: polar(turn, 2.5 + i * 4.5, pod),
      turn,
    })),
    labels: [{ at: off(broke, 0.3, -4.0), words: "+40", times: "×2" }],
  };
}

/**
 * Returns rocks from a short list of them: kind, size, place, seed and turn,
 * then the hits each has held.
 *
 * @param {[RockKind, RockSize, number, number, number, number, number?][]} list
 * @returns {RockThing[]}
 */
function rocksOf(list) {
  return list.map(([kind, size, x, y, seed, turn, hits]) => ({
    kind,
    size,
    seed,
    at: [x, y],
    turn,
    ...(hits ? { hits } : {}),
  }));
}

/**
 * Returns the zap's moment on the laptop's field: wave 17, Foundry, in the
 * Iron reach. The pod, at full static, is mid-dash across the middle of the
 * field: arcs leap from it to five rocks, one of them a volatile rock that
 * has begun its blast; its three in tow stream behind it; a burr it has
 * shaken off tumbles away; and a comet's warning lights at the right edge.
 *
 * @param {Field} field
 * @returns {Moment}
 */
export function zap(field) {
  /** @type {Point} */
  const pod = [38.6, 20.6];
  const turn = -0.16;
  const rocks = rocksOf([
    // The four the zap strikes, then the rest.
    ["iron", "large", 43.2, 13.6, 50, 0.5, 1],
    ["iron", "medium", 41.4, 26.6, 30, 2.2, 1],
    ["iron", "large", 34.4, 28.0, 3, 4.1, 2],
    ["volatile", "medium", 33.6, 14.2, 54, 1.0],
    ["iron", "large", 53.6, 13.4, 55, 3.2],
    ["iron", "medium", 52.2, 26.4, 56, 5.0],
    ["iron", "small", 49.8, 30.6, 57, 0.8],
    ["iron", "large", 12.4, 8.2, 58, 1.7],
    ["iron", "medium", 20.6, 30.4, 59, 2.9],
    ["iron", "small", 25.6, 9.6, 60, 4.6],
    ["iron", "large", 63.4, 29.6, 57, 0.2, 1],
    ["iron", "large", 68.6, 9.4, 62, 5.5],
    ["volatile", "medium", 59.6, 20.4, 63, 2.4],
    ["iron", "small", 8.2, 26.4, 64, 3.9],
    ["iron", "medium", 15.4, 19.2, 65, 1.3],
    ["iron", "large", 24.2, 39.6, 66, 0.9],
    ["volatile", "medium", 74.6, 21.8, 67, 4.0],
    ["iron", "medium", 3.4, 37.2, 68, 2.0],
    ["iron", "large", 81.6, 2.2, 69, 3.4],
  ]);
  for (const i of [0, 1, 2]) {
    Object.assign(/** @type {RockThing} */ (rocks[i]), { struck: 0.85 });
  }
  Object.assign(/** @type {RockThing} */ (rocks[3]), { flare: 0.9 });
  return {
    palette: field.palette,
    sector: "iron-reach",
    width: field.width,
    height: field.height,
    unit: field.unit,
    seed: 17,
    rocks,
    blasts: [{ size: "medium", seed: 71, at: [46.4, 20.0], t: 104, turn: 0.4 }],
    pod: {
      at: pod,
      turn,
      pilot: 0,
      dash: true,
      charge: 3,
      recharge: 0,
    },
    tow: { pilots: [3, 6, 2], heading: turn, phase: 0.2, sway: 0.28 },
    arcs: [
      { to: 0, seed: 3 },
      { to: 1, seed: 8 },
      { to: 2, seed: 5 },
      { to: 3, seed: 12 },
      { to: -1, seed: 9 },
    ],
    burrs: [
      { at: off(pod, 0.5, -4.3), turn: 1.2, seed: 3, scale: 1, flung: -1.45 },
    ],
    warning: {
      at: [field.width, 34.6],
      turn: TURN / 2,
      frame: 1,
      lane: field.width,
    },
    sparks: sparksAbout([58.4, 31.4], 3, 6, [0.6, 1.6]),
  };
}

/**
 * Returns the moment a fuzzball is knocked loose, on the laptop's field:
 * wave 24, Wildfire, in the Storm. A medium rock has just hit the pod and
 * broken a size down beside it; the pod's guard ring is up, its pilot
 * startled; the last of its two in tow flies off, its thread snapped; and
 * a comet crosses the upper field.
 *
 * @param {Field} field
 * @returns {Moment}
 */
export function loose(field) {
  /** @type {Point} */
  const pod = [31.4, 24.2];
  const turn = -0.95;
  // The way from the pod to the rock that hit it.
  const hit = 0.34;
  return {
    palette: field.palette,
    sector: "storm",
    width: field.width,
    height: field.height,
    unit: field.unit,
    seed: 24,
    rocks: rocksOf([
      ["volatile", "large", 44.6, 28.6, 81, 0.7],
      ["ice", "large", 21.4, 13.6, 82, 2.3],
      ["volatile", "medium", 17.2, 27.4, 83, 4.4],
      ["ice", "large", 58.4, 20.6, 84, 1.1],
      ["ice", "medium", 44.6, 12.6, 85, 3.6],
      ["volatile", "large", 68.6, 31.2, 86, 5.2],
      ["ice", "small", 26.4, 34.2, 87, 0.3],
      ["volatile", "medium", 74.2, 14.8, 88, 2.8],
      ["ice", "large", 9.4, 5.6, 89, 4.9],
      ["ice", "medium", 51.4, 34.4, 90, 1.9],
      ["volatile", "large", 0.8, 21.6, 91, 3.1],
      ["ice", "large", 70.4, 39.7, 92, 0.5],
      ["ice", "small", 63.2, 12.2, 93, 5.7],
      ["volatile", "medium", 8.6, 34.6, 94, 1.5],
      ["ice", "small", 47.8, 19.4, 95, 2.6],
    ]),
    breaks: [
      {
        kind: "ice",
        size: "medium",
        seed: 96,
        at: polar(hit, 3.9, pod),
        t: 150,
        turn: 0.9,
        from: hit + TURN / 2,
      },
    ],
    pod: {
      at: pod,
      turn,
      pilot: 1,
      face: "eep",
      look: polar(hit, 1),
      charge: 0,
      guard: 1,
      recharge: 1,
      struck: true,
      struckFrom: hit,
    },
    tow: {
      pilots: [4, 7],
      heading: turn - 0.2,
      phase: 1.4,
      sway: 0.9,
      loose: 1,
      flung: 2.4,
      face: "eep",
    },
    comet: { at: [50.6, 7.6], turn: 0.1, seed: 2 },
    sparks: [
      ...sparksAbout([55.2, 28.4], 3, 4, [0.5, 1.5]),
      ...sparksAbout([27.6, 18.2], 2, 9, [0.4, 1.1]),
    ],
    orbs: [{ id: "magnet", at: [62.4, 6.4], breath: 0.3 }],
  };
}

/**
 * Returns the field a wave leaves as it is cleared: no rock, the pod and
 * its two in tow coasting, a few sparks still hanging.
 *
 * @param {Field} field
 * @returns {Moment}
 */
export function cleared(field) {
  const lay = layOn(field);
  const pod = lay([20.6, 23.4]);
  return {
    palette: field.palette,
    sector: "inner-belt",
    width: field.width,
    height: field.height,
    unit: field.unit,
    seed: 9,
    pod: {
      at: pod,
      turn: -0.5,
      pilot: 0,
      face: "happy",
      charge: 1,
      recharge: 1,
    },
    tow: { pilots: [1, 2], heading: -0.36, phase: 0.9, sway: 0.7 },
    sparks: [
      ...sparksAbout(lay([63.2, 14.6]), 3, 2, [0.5, 1.6]),
      ...sparksAbout(lay([69.4, 27.2]), 2, 5, [0.4, 1.2]),
    ],
    dim: 0.5,
  };
}

/**
 * Returns the Iron reach's first wave, Ore, waiting for the player's first
 * move: the pod in the field's middle, its rocks laid about it.
 *
 * @param {Field} field
 * @returns {Moment}
 */
export function ore(field) {
  const lay = layOn(field);
  const rocks = rocksOf([
    ["iron", "large", 9.4, 8.2, 101, 0.4],
    ["stone", "large", 17.6, 30.4, 102, 2.2],
    ["iron", "large", 69.6, 31.2, 103, 4.0],
    ["stone", "large", 73.4, 8.6, 104, 1.2],
    ["stone", "large", 5.2, 21.4, 105, 3.3],
    ["iron", "large", 60.4, 5.2, 106, 5.1],
    ["stone", "large", 25.8, 6.4, 107, 0.9],
    ["iron", "large", 78.6, 20.2, 108, 2.7],
    ["stone", "large", 56.2, 35.8, 109, 4.6],
    ["stone", "large", 30.2, 37.6, 110, 1.8],
  ]).map((rock) => ({ ...rock, at: lay(rock.at) }));
  return {
    palette: field.palette,
    sector: "iron-reach",
    width: field.width,
    height: field.height,
    unit: field.unit,
    seed: 11,
    rocks,
    pod: {
      at: lay([41.2, 30.6]),
      turn: -TURN / 4,
      pilot: 0,
      charge: 0,
      recharge: 1,
    },
    tow: { pilots: [1, 2, 3], heading: -TURN / 4 - 0.5, phase: 0.4, sway: 0.5 },
    dim: 0.42,
  };
}

/**
 * Returns the field a run leaves as it ends, on wave 14, Anvil: its rocks
 * adrift, and nobody on it.
 *
 * @param {Field} field
 * @returns {Moment}
 */
export function ended(field) {
  const lay = layOn(field);
  const rocks = rocksOf([
    ["iron", "large", 12.4, 9.6, 135, 0.6, 2],
    ["iron", "large", 24.6, 29.4, 122, 2.4],
    ["iron", "medium", 31.8, 12.2, 123, 4.3],
    ["iron", "large", 66.2, 27.6, 60, 1.0, 1],
    ["crystal", "large", 71.4, 9.8, 125, 3.5],
    ["iron", "small", 56.6, 33.4, 126, 5.3],
    ["iron", "large", 4.6, 33.8, 127, 0.1],
    ["iron", "medium", 58.2, 6.4, 128, 2.9],
    ["iron", "small", 18.4, 19.6, 129, 4.8],
    ["iron", "large", 79.4, 38.6, 130, 1.6],
    ["iron", "medium", 49.6, 37.2, 131, 3.8],
  ]).map((rock) => ({ ...rock, at: lay(rock.at) }));
  return {
    palette: field.palette,
    sector: "iron-reach",
    width: field.width,
    height: field.height,
    unit: field.unit,
    seed: 14,
    rocks,
    dim: 0.55,
  };
}
