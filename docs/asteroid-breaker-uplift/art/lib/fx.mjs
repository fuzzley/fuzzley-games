// The energy and the effects of the uplift: what glows, and what happens
// for a moment and is gone. Energy is a bright middle and a soft halo in the
// thing's own color, under plain alpha; an effect is a function of the time
// since it began, in milliseconds, so it can be drawn at any moment and a
// storyboard is the same function at six times.
//
// Geometry is made first, as plain data in field units (`makeShot()`,
// `makeArc()`, `makeBreak()`), then drawn for a palette at a unit. A broken
// rock's shards are the rock's own facets, from `makeRock()`, so they keep
// its cut and its light as they fly.

import {
  TURN,
  between,
  circle,
  clamp,
  ellipse,
  hexOf,
  lerp,
  mix,
  num,
  place,
  polar,
  polygon,
  polyline,
  rgbOf,
  ring,
  seeded,
  turned,
  unit as unitVector,
} from "./core.mjs";
import { PILOT_INKS, ROCK_INKS, tonesOf } from "./palettes.mjs";
import { hull, litBy, makeRock, rockSvg, toneAt } from "./rocks.mjs";

/** @import { Point, Vec3 } from "./core.mjs" */
/** @import { Palette } from "./palettes.mjs" */
/** @import { Facet, RockKind, RockShape, RockSize } from "./rocks.mjs" */

// --- Time ---------------------------------------------------------------

/** How long each effect lasts, in milliseconds, from its start to nothing left of it. */
export const FX_MS = {
  impact: 160,
  zap: 180,
  break: 450,
  held: 200,
  blast: 520,
  boulder: 700,
  exhaust: 400,
  dash: 440,
  nova: 380,
  shield: 360,
  lost: 560,
  bailOut: 1400,
  caught: 300,
  rescued: 600,
  cleared: 700,
  shaken: 380,
};

/**
 * Returns how far a time is through a span, 0 to 1.
 *
 * @param {number} t
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export function shareOf(t, from, to) {
  return clamp((t - from) / (to - from), 0, 1);
}

/**
 * Returns a share eased out: fast first, settling.
 *
 * @param {number} share
 * @returns {number}
 */
export function easeOut(share) {
  return 1 - (1 - share) ** 3;
}

/**
 * Returns a share that rises to 1 and falls back, for a thing that appears and goes.
 *
 * @param {number} share
 * @param {number} [peak] Where it is fullest, 0 to 1.
 * @returns {number}
 */
export function swell(share, peak = 0.25) {
  if (share <= 0 || share >= 1) return 0;
  return share < peak ? share / peak : 1 - (share - peak) / (1 - peak);
}

// --- Glow ---------------------------------------------------------------

/**
 * @typedef {object} Energy The tones a glowing thing is drawn in.
 * @property {string} hot Its bright middle: near white on a dark field, its densest ink on a light one.
 * @property {string} body Its own color, around the middle.
 * @property {string} halo The color its halo fades from.
 * @property {number} glow How strong its halo is, less on a light field, where it is a tint.
 */

/**
 * Returns the tones a glowing thing of a color is drawn in.
 *
 * On a dark field the middle is the color lifted nearly to white. A light
 * field is already the brightest thing there is, so the middle is the
 * color's densest ink instead and the halo a tint of it: ink on paper.
 *
 * @param {string} color
 * @param {Palette} palette
 * @returns {Energy}
 */
export function energyOf(color, palette) {
  return palette.mode === "light"
    ? { hot: mix(color, palette.fieldText, 0.45), body: color, halo: color, glow: 0.62 }
    : { hot: mix(color, "#ffffff", 0.82), body: mix(color, "#ffffff", 0.22), halo: color, glow: 1 };
}

/**
 * Returns a soft halo: a disc of a color fading to nothing at its edge,
 * under plain alpha. `glowDefs()` writes the gradient it is filled with.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} color
 * @param {number} [strength] From 0 to 1.
 * @param {{ ry?: number, turn?: number }} [how] Another radius down than across, and a turn in degrees, for a long halo.
 * @returns {string}
 */
export function halo(x, y, r, color, strength = 1, { ry, turn = 0 } = {}) {
  if (strength <= 0.01 || r <= 0.2) return "";
  const id = `fxg-${hexOf(rgbOf(color)).slice(1)}`;
  const shape =
    ry === undefined ? circle(0, 0, r, `url(#${id})`) : ellipse(0, 0, r, ry, `url(#${id})`);
  return place(shape, { x, y, turn, opacity: clamp(strength, 0, 1) });
}

/**
 * Returns a halo for a palette: as `halo()`, at the strength the palette's
 * field lets a glow have.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} color
 * @param {Palette} palette
 * @param {number} [strength]
 * @param {{ ry?: number, turn?: number }} [how]
 * @returns {string}
 */
export function glow(x, y, r, color, palette, strength = 1, how = {}) {
  return halo(x, y, r, color, strength * (palette.mode === "light" ? 0.62 : 1), how);
}

/**
 * Returns the gradients a drawing's halos are filled with, for a file's
 * defs, found by the ids `halo()` wrote into it.
 *
 * @param {string} svg
 * @returns {string}
 */
export function glowDefs(svg) {
  const ids = [...new Set([...svg.matchAll(/url\(#(fxg-[0-9a-f]{6})\)/g)].map((m) => m[1]))].sort();
  return ids
    .map((id) => {
      const color = `#${String(id).slice(4)}`;
      return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="0.9"/><stop offset="0.3" stop-color="${color}" stop-opacity="0.42"/><stop offset="0.62" stop-color="${color}" stop-opacity="0.13"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
    })
    .join("");
}

/**
 * Returns the corners of a four-point spark about the origin.
 *
 * @param {number} r How far its points reach.
 * @param {number} [pinch] How far its waist reaches, as a share of that.
 * @param {number} [turn] In radians.
 * @param {number} [squash] How far its side points reach, as a share of its up and down ones.
 * @returns {Point[]}
 */
export function sparkPoints(r, pinch = 0.24, turn = 0, squash = 1) {
  /** @type {Point[]} */
  const points = [];
  for (let i = 0; i < 8; i++) {
    const reach = i % 2 === 1 ? r * pinch : i % 4 === 0 ? r * squash : r;
    points.push(polar(turn + (i / 8) * TURN, reach));
  }
  return points;
}

/**
 * Returns a spark: a four-point tick, bright in its middle, with a small halo.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} r In pixels.
 * @param {string} color
 * @param {Palette} palette
 * @param {{ turn?: number, opacity?: number, halo?: number, pinch?: number }} [how]
 * @returns {string}
 */
export function spark(x, y, r, color, palette, { turn = 0, opacity = 1, halo: haloStrength = 0.8, pinch = 0.24 } = {}) {
  if (opacity <= 0.02 || r <= 0.1) return "";
  const tones = energyOf(color, palette);
  return place(
    [
      glow(0, 0, r * 1.9, tones.halo, palette, haloStrength),
      polygon(sparkPoints(r, pinch, turn), tones.body),
      polygon(sparkPoints(r * 0.62, pinch * 0.8, turn), tones.hot),
    ].join(""),
    { x, y, opacity },
  );
}

/**
 * Returns an opacity as `place()` takes it: left out when there is none.
 *
 * @param {number | undefined} opacity
 * @returns {{ opacity?: number }}
 */
export function seen(opacity) {
  return opacity === undefined ? {} : { opacity };
}

// --- Placeholders -------------------------------------------------------

/** The placeholder ship's outline, a dart 2.4 units long, its nose along x, in field units. The real pod is drawn elsewhere. */
export const SHIP_DART = /** @type {Point[]} */ ([
  [1.2, 0],
  [-1.0, 0.86],
  [-0.56, 0],
  [-1.0, -0.86],
]);

/** The plates the placeholder ship breaks into, in field units. */
export const SHIP_PLATES = /** @type {Point[][]} */ ([
  [[1.2, 0], [0.3, 0.35], [0.3, -0.35]],
  [[0.3, 0.35], [-1.0, 0.86], [-0.56, 0]],
  [[0.3, -0.35], [-0.56, 0], [-1.0, -0.86]],
  [[0.3, 0.35], [-0.56, 0], [0.3, -0.35]],
]);

/**
 * Returns the placeholder ship, about its middle.
 *
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, ghost?: boolean, opacity?: number }} [how] A turn in radians; a ghost is its outline alone.
 * @returns {string}
 */
export function shipPlaceholder(palette, { unit = 16, turn = 0, ghost = false, opacity } = {}) {
  const points = SHIP_DART.map((p) => {
    const [x, y] = turned(p, turn);
    return /** @type {Point} */ ([x * unit, y * unit]);
  });
  if (ghost) {
    return place(polygon(points, "none", { stroke: palette.accent, "stroke-width": Math.max(1, 0.1 * unit), "stroke-linejoin": "round" }), seen(opacity));
  }
  const [wx, wy] = turned([0.02, 0], turn);
  return place(
    [
      polygon(points, palette.field, { stroke: palette.field, "stroke-width": Math.max(2.5, 0.28 * unit), "stroke-linejoin": "round" }),
      polygon(points, palette.accent, { stroke: palette.accent, "stroke-width": 0.6, "stroke-linejoin": "round" }),
      unit >= 10 ? circle(wx * unit, wy * unit, 0.3 * unit, mix(palette.accent, palette.field, 0.62)) : "",
    ].join(""),
    seen(opacity),
  );
}

/**
 * Returns the placeholder for a pilot in its bubble: a dot in a glass ball.
 *
 * @param {Palette} palette
 * @param {{ unit?: number, scale?: number, opacity?: number }} [how]
 * @returns {string}
 */
export function bubblePlaceholder(palette, { unit = 16, scale = 1, opacity } = {}) {
  const r = 1.15 * unit;
  const rim = Math.max(1, 0.1 * unit);
  return place(
    [
      circle(0, 0, r, mix(palette.field, palette.fieldText, 0.1), { opacity: 0.9 }),
      ring(0, 0, r - rim / 2, palette.fieldMuted, rim),
      circle(0, r * 0.12, r * 0.5, PILOT_INKS[palette.mode][0] ?? palette.danger),
      polyline([polar(TURN * 0.56, r * 0.72), polar(TURN * 0.62, r * 0.72), polar(TURN * 0.68, r * 0.72)], "#ffffff", Math.max(1, 0.09 * unit), { opacity: 0.8 }),
    ].join(""),
    { scale, ...seen(opacity) },
  );
}

// --- Shots --------------------------------------------------------------

/** @typedef {"gun" | "spread" | "rapid" | "lance"} WeaponId */

/**
 * @typedef {object} ShotShape A weapon's shot, flying along x, about the middle it hits with, in field units.
 * @property {WeaponId} weapon
 * @property {number} count The shots a pull fires.
 * @property {number} fan The angle between two of them, in degrees.
 * @property {Point[]} body
 * @property {Point[]} core Its bright middle.
 * @property {[number, number]} tail How far back its tail reaches from its middle, and its half width where it starts.
 * @property {[number, number, number]} halo Its halo's radius along it and across it, and how far ahead of its middle it sits.
 * @property {number} glow How strong its halo is.
 * @property {Point[][]} barbs Lines swept back from its head, left out under 10 px a unit.
 */

/**
 * Returns a capsule along x, round at its nose, flat at its back.
 *
 * @param {number} back
 * @param {number} nose
 * @param {number} half
 * @returns {Point[]}
 */
function bolt(back, nose, half) {
  /** @type {Point[]} */
  const points = [[back, -half]];
  for (let i = 0; i <= 6; i++) {
    const a = -TURN / 4 + (i / 6) * (TURN / 2);
    points.push([nose - half + Math.cos(a) * half, Math.sin(a) * half]);
  }
  points.push([back, half]);
  return points;
}

/**
 * Returns a weapon's shot.
 *
 * @param {WeaponId} weapon
 * @returns {ShotShape}
 */
export function makeShot(weapon) {
  switch (weapon) {
    case "gun":
      return { weapon, count: 1, fan: 0, body: bolt(-0.42, 0.52, 0.18), core: bolt(-0.26, 0.42, 0.085), tail: [1.9, 0.16], halo: [1.05, 0.62, 0.05], glow: 0.95, barbs: [] };
    case "spread":
      return { weapon, count: 3, fan: 12, body: bolt(-0.3, 0.4, 0.14), core: bolt(-0.18, 0.32, 0.065), tail: [1.25, 0.12], halo: [0.8, 0.46, 0.04], glow: 0.7, barbs: [] };
    case "rapid":
      return {
        weapon,
        count: 1,
        fan: 0,
        body: [[0.46, 0], [-0.24, 0.24], [-0.06, 0], [-0.24, -0.24]],
        core: [[0.34, 0], [-0.1, 0.11], [-0.02, 0], [-0.1, -0.11]],
        tail: [1.15, 0.07],
        halo: [0.72, 0.5, 0.05],
        glow: 0.8,
        barbs: [],
      };
    case "lance":
      return {
        weapon,
        count: 1,
        fan: 0,
        body: [[1.6, 0], [0.95, 0.19], [-0.9, 0.09], [-1.25, 0], [-0.9, -0.09], [0.95, -0.19]],
        core: [[1.42, 0], [0.92, 0.08], [-0.85, 0.035], [-0.85, -0.035], [0.92, -0.08]],
        tail: [2.3, 0.07],
        halo: [2.0, 0.56, 0.2],
        glow: 0.9,
        barbs: [
          [[0.78, 0.2], [0.42, 0.42]],
          [[0.78, -0.2], [0.42, -0.42]],
        ],
      };
  }
}

/**
 * Returns one shot of a weapon, about the middle it hits with.
 *
 * Its middle is the field's text, the clearest color there is, as the shot
 * is today; its body and its halo are the palette's accent, the ship's own.
 *
 * @param {WeaponId} weapon
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, opacity?: number }} [how] The way it flies, in radians.
 * @returns {string}
 */
export function shotSvg(weapon, palette, { unit = 16, turn = 0, opacity } = {}) {
  const shot = makeShot(weapon);
  const tones = energyOf(palette.accent, palette);
  const px = (/** @type {Point[]} */ points) => points.map(([x, y]) => /** @type {Point} */ ([x * unit, y * unit]));
  const [reach, half] = shot.tail;
  const tailOf = (/** @type {number} */ share) =>
    px([
      [-0.1, -half],
      [-reach * share, 0],
      [-0.1, half],
    ]);
  const parts = [
    glow(shot.halo[2] * unit, 0, shot.halo[0] * unit, tones.halo, palette, shot.glow, { ry: shot.halo[1] * unit }),
    polygon(tailOf(1), tones.body, { opacity: 0.3 }),
    polygon(tailOf(0.62), tones.body, { opacity: 0.45 }),
    polygon(tailOf(0.3), tones.body, { opacity: 0.6 }),
    polygon(px(shot.body), palette.field, { stroke: palette.field, "stroke-width": Math.max(1.6, 0.16 * unit), "stroke-linejoin": "round" }),
    polygon(px(shot.body), tones.body),
    polygon(px(shot.core), palette.fieldText),
  ];
  if (unit >= 10) {
    for (const barb of shot.barbs) parts.push(polyline(px(barb), tones.body, Math.max(1, 0.09 * unit)));
  }
  return place(parts.join(""), { turn: (turn / TURN) * 360, ...seen(opacity) });
}

/**
 * Returns a pull of a weapon: every shot it fires, a distance from the
 * muzzle they left, which is the origin.
 *
 * @param {WeaponId} weapon
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, distance?: number }} [how] How far they have flown, in field units.
 * @returns {string}
 */
export function volleySvg(weapon, palette, { unit = 16, turn = 0, distance = 3 } = {}) {
  const shot = makeShot(weapon);
  const parts = [];
  for (let i = 0; i < shot.count; i++) {
    const angle = turn + ((i - (shot.count - 1) / 2) * shot.fan * TURN) / 360;
    const [x, y] = polar(angle, distance * unit);
    parts.push(place(shotSvg(weapon, palette, { unit, turn: angle }), { x, y }));
  }
  return parts.join("");
}

/**
 * Returns the shot as the game draws it today: a plain dash in the field's text.
 *
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number }} [how]
 * @returns {string}
 */
export function shotTodaySvg(palette, { unit = 16, turn = 0 } = {}) {
  const w = 0.72 * unit;
  const h = 0.3 * unit;
  const line = Math.max(1, 0.12 * unit);
  return place(
    [
      `<rect x="${num(-w / 2 - line)}" y="${num(-h / 2 - line)}" width="${num(w + 2 * line)}" height="${num(h + 2 * line)}" rx="${num(h / 2 + line)}" fill="${palette.field}"/>`,
      `<rect x="${num(-w / 2)}" y="${num(-h / 2)}" width="${num(w)}" height="${num(h)}" rx="${num(h / 2)}" fill="${palette.fieldText}"/>`,
    ].join(""),
    { turn: (turn / TURN) * 360 },
  );
}

/**
 * Returns the flash at the muzzle as a shot leaves, in one of its two
 * frames, about the muzzle, pointing along x.
 *
 * @param {0 | 1} frame
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number }} [how]
 * @returns {string}
 */
export function muzzleFlashSvg(frame, palette, { unit = 16, turn = 0 } = {}) {
  const tones = energyOf(palette.accent, palette);
  // The second frame is the first fading: the same star, smaller and fainter,
  // so a still of either reads as a flash.
  const size = frame === 0 ? 1 : 0.64;
  const px = (/** @type {Point[]} */ points) => points.map(([x, y]) => /** @type {Point} */ ([x * unit * size, y * unit * size]));
  const star = [
    polygon(px([[1.3, 0], [0.3, 0.13], [0.52, 0.62], [0.08, 0.24], [-0.12, 0], [0.08, -0.24], [0.52, -0.62], [0.3, -0.13]]), tones.body),
    polygon(px([[0.85, 0], [0.18, 0.1], [0, 0], [0.18, -0.1]]), palette.fieldText),
  ].join("");
  return place(
    [
      glow(0.25 * unit * size, 0, 1.05 * unit * size, tones.halo, palette, frame === 0 ? 0.95 : 0.5),
      frame === 0 ? star : place(star, { opacity: 0.55 }),
    ].join(""),
    { turn: (turn / TURN) * 360 },
  );
}

/**
 * @typedef {object} Tick A short line thrown from a point.
 * @property {number} angle
 * @property {number} reach How far it flies, in field units.
 * @property {number} length
 * @property {number} delay In milliseconds.
 * @property {number} life
 */

/**
 * Returns ticks thrown from a point, within a fan about a heading.
 *
 * @param {() => number} random
 * @param {number} count
 * @param {{ toward?: number, fan?: number, reach?: [number, number], length?: [number, number], life?: [number, number], delay?: number }} [how]
 * @returns {Tick[]}
 */
function makeTicks(random, count, { toward = 0, fan = TURN, reach = [0.8, 1.4], length = [0.3, 0.5], life = [130, 200], delay = 30 } = {}) {
  /** @type {Tick[]} */
  const ticks = [];
  for (let i = 0; i < count; i++) {
    ticks.push({
      angle: toward + ((i + between(random, 0.15, 0.85)) / count - 0.5) * fan,
      reach: between(random, reach[0], reach[1]),
      length: between(random, length[0], length[1]),
      delay: between(random, 0, delay),
      life: between(random, life[0], life[1]),
    });
  }
  return ticks;
}

/**
 * Returns ticks at a time: each a short line flying out, bright at its head.
 *
 * @param {Tick[]} ticks
 * @param {number} t
 * @param {string} color
 * @param {Palette} palette
 * @param {{ unit: number, from?: number, width?: number }} how How far from the point they start, in field units.
 * @returns {string}
 */
function ticksAt(ticks, t, color, palette, { unit, from = 0.15, width = 0.1 }) {
  const tones = energyOf(color, palette);
  const parts = [];
  for (const tick of ticks) {
    const s = shareOf(t, tick.delay, tick.delay + tick.life);
    if (t < tick.delay || s >= 1) continue;
    const head = (from + tick.reach * easeOut(s)) * unit;
    const tail = Math.max(from * unit, head - tick.length * unit * (1 - s * 0.7));
    const opacity = 1 - s * s;
    const w = Math.max(1, width * unit * (1 - s * 0.4));
    parts.push(
      polyline([polar(tick.angle, tail), polar(tick.angle, head)], tones.body, w, { opacity }),
      polyline([polar(tick.angle, lerp(tail, head, 0.55)), polar(tick.angle, head)], tones.hot, w * 0.6, { opacity }),
    );
  }
  return parts.join("");
}

/**
 * Returns the spark where a shot lands, at a time, about the point it hit.
 *
 * @param {number} t Since it hit, in milliseconds; it is gone by `FX_MS.impact`.
 * @param {Palette} palette
 * @param {{ unit?: number, toward?: number, seed?: number, count?: number }} [how] The way back to where the shot came from, in radians.
 * @returns {string}
 */
export function impactFx(t, palette, { unit = 16, toward = TURN / 2, seed = 1, count = 5 } = {}) {
  if (t < 0 || t >= FX_MS.impact) return "";
  const random = seeded(seed * 97 + 5);
  const ticks = makeTicks(random, count, { toward, fan: TURN * 0.42, reach: [0.7, 1.3], life: [110, 150], delay: 10 });
  const tones = energyOf(palette.warning, palette);
  const s = shareOf(t, 0, 80);
  return [
    glow(0, 0, (0.9 + 0.4 * s) * unit, tones.halo, palette, 1 - shareOf(t, 0, 130)),
    ticksAt(ticks, t, palette.warning, palette, { unit }),
    s < 1 ? polygon(sparkPoints(0.42 * unit * (1 - s * 0.6), 0.3, toward), tones.hot, { opacity: 1 - s }) : "",
  ].join("");
}

// --- Static -------------------------------------------------------------

/**
 * @typedef {object} Arc A jagged line of static between two points, in field units.
 * @property {Point[]} main
 * @property {Point[][]} branches
 */

/**
 * Returns a line broken at its middle again and again, each break pushed
 * off to one side.
 *
 * @param {() => number} random
 * @param {Point} from
 * @param {Point} to
 * @param {number} depth
 * @param {number} sway How far a break is pushed, as a share of its stretch's length.
 * @returns {Point[]}
 */
function broken(random, from, to, depth, sway) {
  if (depth === 0) return [from, to];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const off = between(random, -sway, sway);
  /** @type {Point} */
  const mid = [(from[0] + to[0]) / 2 - dy * off, (from[1] + to[1]) / 2 + dx * off];
  return [...broken(random, from, mid, depth - 1, sway).slice(0, -1), ...broken(random, mid, to, depth - 1, sway)];
}

/**
 * Returns a line that zigzags from one point to another, each kink thrown
 * to the other side of it from the last, as lightning's are.
 *
 * @param {() => number} random
 * @param {Point} from
 * @param {Point} to
 * @param {number} steps
 * @param {number} sway How far a kink is thrown, as a share of the line's length.
 * @returns {Point[]}
 */
function zigzag(random, from, to, steps, sway) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const bow = between(random, -0.05, 0.05);
  let side = random() < 0.5 ? -1 : 1;
  /** @type {Point[]} */
  const points = [from];
  for (let i = 1; i < steps; i++) {
    const share = (i + between(random, -0.3, 0.3)) / steps;
    const off = side * between(random, 0.3, 1) * sway + bow * Math.sin(share * Math.PI);
    if (random() < 0.8) side = -side;
    points.push([from[0] + dx * share - dy * off, from[1] + dy * share + dx * off]);
  }
  points.push(to);
  return points;
}

/**
 * Returns an arc of static between two points, with a short branch or two.
 *
 * @param {Point} from
 * @param {Point} to
 * @param {number} seed
 * @param {{ sway?: number, branches?: number }} [how]
 * @returns {Arc}
 */
export function makeArc(from, to, seed, { sway = 0.065, branches = 2 } = {}) {
  const random = seeded(seed * 613 + 11);
  const along = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = clamp(Math.round(length / 1.05), 5, 12);
  const main = zigzag(random, from, to, steps, sway * Math.min(1, 9 / length));
  /** @type {Point[][]} */
  const forks = [];
  for (let i = 0; i < branches; i++) {
    const start = /** @type {Point} */ (main[2 + Math.floor(random() * (steps - 3))]);
    const side = i % 2 === 0 ? 1 : -1;
    const angle = along + side * between(random, 0.5, 0.95);
    forks.push(zigzag(random, start, polar(angle, Math.min(2.6, length * between(random, 0.16, 0.26)), start), 3, 0.16));
  }
  return { main, branches: forks };
}

/**
 * Returns an arc of static drawn: a near-white middle in a halo of a color.
 *
 * @param {Arc} arc
 * @param {Palette} palette
 * @param {{ unit?: number, color?: string, strength?: number }} [how] The palette's accent unless told otherwise.
 * @returns {string}
 */
export function arcSvg(arc, palette, { unit = 16, color = palette.accent, strength = 1 } = {}) {
  if (strength <= 0.02) return "";
  const tones = energyOf(color, palette);
  const px = (/** @type {Point[]} */ points) => points.map(([x, y]) => /** @type {Point} */ ([x * unit, y * unit]));
  const lines = [
    { points: px(arc.main), weight: 1 },
    ...arc.branches.map((points) => ({ points: px(points), weight: 0.62 })),
  ];
  const parts = [];
  for (const { points, weight } of lines) parts.push(polyline(points, tones.halo, 0.62 * unit * weight, { opacity: 0.2 * tones.glow }));
  for (const { points, weight } of lines) parts.push(polyline(points, tones.body, Math.max(2, 0.26 * unit * weight), { opacity: 0.6 }));
  for (const { points, weight } of lines) parts.push(polyline(points, tones.hot, Math.max(1.1, 0.11 * unit * weight), { "stroke-linejoin": "miter" }));
  return place(parts.join(""), { opacity: strength });
}

/**
 * Returns a zap at a time: an arc between two points that leaps anew every
 * few frames and fades, with a spark where it lands.
 *
 * @param {Point} from In field units.
 * @param {Point} to
 * @param {number} t Since it leapt; it is gone by `FX_MS.zap`.
 * @param {Palette} palette
 * @param {{ unit?: number, seed?: number }} [how]
 * @returns {string}
 */
export function zapFx(from, to, t, palette, { unit = 16, seed = 1 } = {}) {
  if (t < 0 || t >= FX_MS.zap) return "";
  const leap = Math.floor(t / 45);
  const strength = 1 - shareOf(t, 90, FX_MS.zap);
  const arc = makeArc(from, to, seed * 31 + leap * 7, { branches: leap === 0 ? 2 : 1 });
  return [
    arcSvg(arc, palette, { unit, strength }),
    spark(to[0] * unit, to[1] * unit, (0.55 - 0.08 * leap) * unit, palette.accent, palette, { turn: leap * 0.6, opacity: strength }),
    glow(from[0] * unit, from[1] * unit, 0.7 * unit, palette.accent, palette, 0.7 * strength),
  ].join("");
}

// --- A rock breaks ------------------------------------------------------

/** The size a rock's pieces come in. */
const SIZE_AFTER = /** @type {Partial<Record<RockSize, RockSize>>} */ ({ boulder: "large", large: "medium", medium: "small" });

/**
 * @typedef {object} BreakStyle How a kind of rock comes apart.
 * @property {number} heroes The shards that fly the whole time; the rest are gone in a few frames.
 * @property {[number, number]} reach How far a hero flies, in the rock's radii.
 * @property {number} spin The most a shard turns as it flies, in radians.
 * @property {number} shrink The size a shard ends at, as a share of its own.
 * @property {number} sparks
 * @property {number} glints
 * @property {number} dust How strong its dust is, 0 to 1 and over.
 * @property {"facets" | "slivers" | "plates"} cut What its shards are cut from its facets as.
 * @property {number} pieces The smaller rocks it leaves.
 * @property {RockKind | null} into Their kind; its own if null.
 */

/** @type {Record<RockKind, BreakStyle>} */
const BREAK_STYLES = {
  stone: { heroes: 6, reach: [0.85, 1.45], spin: 2.4, shrink: 0.45, sparks: 4, glints: 0, dust: 1, cut: "facets", pieces: 2, into: null },
  ice: { heroes: 12, reach: [1.1, 1.95], spin: 4.6, shrink: 0.3, sparks: 0, glints: 5, dust: 0.45, cut: "slivers", pieces: 3, into: null },
  crystal: { heroes: 5, reach: [0.85, 1.4], spin: 2.4, shrink: 0.45, sparks: 3, glints: 3, dust: 0.8, cut: "facets", pieces: 2, into: "stone" },
  iron: { heroes: 7, reach: [0.85, 1.25], spin: 0.9, shrink: 0.6, sparks: 9, glints: 0, dust: 0.4, cut: "plates", pieces: 2, into: null },
  volatile: { heroes: 7, reach: [1.0, 1.7], spin: 3, shrink: 0.35, sparks: 0, glints: 0, dust: 0, cut: "facets", pieces: 0, into: null },
  lodestone: { heroes: 6, reach: [0.85, 1.4], spin: 2.2, shrink: 0.45, sparks: 4, glints: 0, dust: 0.9, cut: "facets", pieces: 2, into: null },
  boulder: { heroes: 11, reach: [0.7, 1.25], spin: 1.8, shrink: 0.4, sparks: 10, glints: 0, dust: 1.5, cut: "facets", pieces: 3, into: "stone" },
};

/**
 * @typedef {object} Shard A piece of a broken rock that flies off and fades.
 * @property {Point[]} points Its corners about its own middle, in the rock's radii.
 * @property {Point} at Its middle as the rock breaks.
 * @property {Vec3} normal The way it faces, as the facet it was cut from did.
 * @property {"body" | "gem" | "band"} part
 * @property {number} heading
 * @property {number} reach How far it flies, in the rock's radii.
 * @property {number} spin
 * @property {number} shrink
 * @property {number} life In milliseconds.
 * @property {boolean} hero
 */

/**
 * @typedef {object} Piece A smaller rock a broken one leaves.
 * @property {RockShape} rock
 * @property {number} heading
 * @property {number} reach How far from the break it is as the effect ends, in field units.
 * @property {number} turn
 * @property {number} spin
 */

/**
 * @typedef {object} Break A rock's break, as plain data.
 * @property {RockShape} rock
 * @property {number} turn The rock's turn as it broke.
 * @property {Shard[]} shards
 * @property {Tick[]} sparks Their reach and length in the rock's radii.
 * @property {{ angle: number, at: number, r: number }[]} puffs Dust, about the ring it spreads on, in the rock's radii.
 * @property {{ at: Point, delay: number, r: number, turn: number }[]} glints
 * @property {Piece[]} pieces
 * @property {number} dust
 */

/**
 * Returns the middle of a polygon's corners.
 *
 * @param {readonly Point[]} points
 * @returns {Point}
 */
function middleOf(points) {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}

/**
 * Returns a polygon's area.
 *
 * @param {readonly Point[]} points
 * @returns {number}
 */
function areaOf(points) {
  let sum = 0;
  points.forEach((p, i) => {
    const q = /** @type {Point} */ (points[(i + 1) % points.length]);
    sum += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(sum) / 2;
}

/**
 * Returns a rock's facets cut for breaking: as they are, each triangle
 * split into two slivers, or joined into a few plates.
 *
 * @param {RockShape} rock
 * @param {BreakStyle["cut"]} cut
 * @returns {Facet[]}
 */
function cutFacets(rock, cut) {
  // A dent's facets are too small to fly.
  const facets = rock.facets.filter(({ points, part }) => part !== "body" || areaOf(points) > 0.024);
  if (cut === "slivers") {
    return facets.flatMap((facet) => {
      if (facet.points.length !== 3) return [facet];
      const [a, b, c] = /** @type {[Point, Point, Point]} */ (facet.points);
      const sides = [
        { length: Math.hypot(b[0] - a[0], b[1] - a[1]), ends: [a, b], apex: c },
        { length: Math.hypot(c[0] - b[0], c[1] - b[1]), ends: [b, c], apex: a },
        { length: Math.hypot(a[0] - c[0], a[1] - c[1]), ends: [c, a], apex: b },
      ].sort((p, q) => p.length - q.length);
      const short = /** @type {{ ends: Point[], apex: Point }} */ (sides[0]);
      const [e0, e1] = /** @type {[Point, Point]} */ (short.ends);
      const mid = middleOf([e0, e1]);
      return [
        { ...facet, points: [short.apex, e0, mid] },
        { ...facet, points: [short.apex, mid, e1] },
      ];
    });
  }
  if (cut === "plates") {
    const triangles = facets.filter(({ points }) => points.length === 3);
    const tops = facets.filter(({ points }) => points.length > 3);
    const run = Math.max(2, Math.round(triangles.length / 5));
    /** @type {Facet[]} */
    const plates = [];
    for (let i = 0; i < triangles.length; i += run) {
      const group = triangles.slice(i, i + run);
      const normal = unitVector(
        /** @type {Vec3} */ ([0, 1, 2].map((k) => group.reduce((sum, f) => sum + /** @type {number} */ (f.normal[k]), 0))),
      );
      plates.push({ points: hull(group.flatMap(({ points }) => points)), normal, part: "body" });
    }
    for (const top of tops) {
      const half = Math.floor(top.points.length / 2);
      plates.push({ ...top, points: top.points.slice(0, half + 1) });
      plates.push({ ...top, points: [...top.points.slice(half), /** @type {Point} */ (top.points[0])] });
    }
    return plates;
  }
  return facets;
}

/**
 * Returns a rock's break as plain data: its own facets as the shards that
 * fly, its dust, its sparks and the smaller rocks it leaves.
 *
 * @param {RockShape} rock
 * @param {{ seed?: number, turn?: number, from?: number, headings?: number[] }} [how] The rock's turn, the way the shot flew, both in radians, and the ways its pieces go, if not its own.
 * @returns {Break}
 */
export function makeBreak(rock, { seed = 1, turn = 0, from = 0, headings } = {}) {
  const style = BREAK_STYLES[rock.kind];
  const random = seeded(seed * 4099 + rock.kind.length * 17 + rock.size.length);
  const big = rock.size === "large" || rock.size === "boulder";
  const small = rock.size === "small";
  // The shot's way, as the rock sees it before its turn.
  const push = polar(from - turn, 0.38);
  const facets = cutFacets(rock, style.cut);
  const heroes = Math.max(3, Math.round(style.heroes * (big ? 1 : small ? 0.6 : 0.8)));
  // Heroes are spread around the rock, so none of its sides is left bare.
  const byAngle = facets
    .map((facet, i) => ({ i, angle: Math.atan2(middleOf(facet.points)[1], middleOf(facet.points)[0]), gem: facet.part === "gem" }))
    .sort((a, b) => a.angle - b.angle);
  const every = Math.max(1, byAngle.length / heroes);
  const chosen = new Set();
  for (let k = 0; k < heroes; k++) chosen.add(byAngle[Math.floor(k * every + every / 2) % byAngle.length]?.i);
  /** @type {Shard[]} */
  const shards = facets.map((facet, i) => {
    const at = middleOf(facet.points);
    const far = Math.hypot(at[0], at[1]);
    const out = far < 0.06 ? polar(between(random, 0, TURN), 1) : [at[0] / far, at[1] / far];
    const hero = chosen.has(i) || facet.part === "gem";
    const turnWay = random() < 0.5 ? -1 : 1;
    return {
      points: facet.points.map(([x, y]) => /** @type {Point} */ ([x - at[0], y - at[1]])),
      at,
      normal: facet.normal,
      part: facet.part,
      heading: Math.atan2(/** @type {number} */ (out[1]) + push[1], /** @type {number} */ (out[0]) + push[0]) + between(random, -0.28, 0.28),
      reach: hero ? between(random, style.reach[0], style.reach[1]) : between(random, 0.25, 0.55),
      spin: turnWay * between(random, 0.4, 1) * style.spin,
      shrink: style.shrink,
      life: hero ? between(random, 0.82, 1) * (FX_MS.break - 30) : between(random, 110, 190),
      hero,
    };
  });
  const count = small ? 0 : style.pieces;
  const into = /** @type {RockSize} */ (SIZE_AFTER[rock.size] ?? "small");
  /** @type {Piece[]} */
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const heading = headings?.[i] ?? from + (count === 2 ? (i === 0 ? -1 : 1) * between(random, 1.1, 1.3) : (i - 1) * between(random, 1.9, 2.2) + between(random, -0.15, 0.15));
    pieces.push({
      rock: makeRock(style.into ?? rock.kind, into, seed * 31 + i * 7 + 3),
      heading,
      reach: rock.radius * (rock.size === "boulder" ? 0.8 : count === 3 ? 0.8 : 0.72),
      turn: between(random, 0, TURN),
      spin: between(random, -0.5, 0.5),
    });
  }
  const sparkCount = Math.round(style.sparks * (big ? 1 : 0.6));
  const puffCount = style.dust > 0 ? (big ? 8 : 5) : 0;
  return {
    rock,
    turn,
    shards,
    sparks: makeTicks(random, sparkCount, { reach: [0.75, 1.35], length: [0.22, 0.4], life: [160, 240], delay: 40 }),
    puffs: Array.from({ length: puffCount }, (_, i) => ({
      angle: ((i + between(random, -0.3, 0.3)) / puffCount) * TURN,
      at: between(random, 0.9, 1.08),
      r: between(random, 0.11, 0.2),
    })),
    glints: Array.from({ length: Math.round(style.glints * (big ? 1 : 0.6)) }, () => ({
      at: polar(between(random, 0, TURN), between(random, 0.5, 1.5)),
      delay: between(random, 50, 250),
      r: between(random, 0.12, 0.22),
      turn: between(random, 0, 0.6),
    })),
    pieces,
    dust: style.dust,
  };
}

/**
 * Returns the tone a rock flashes in as it is hit: nearly white on a dark
 * field, and a pale tint of its ink on a light one, where white would be
 * the field itself.
 *
 * @param {string} ink
 * @param {Palette} palette
 * @returns {string}
 */
function flashTone(ink, palette) {
  return mix(ink, "#ffffff", palette.mode === "light" ? 0.62 : 0.9);
}

/**
 * Returns a rock's inks: its body's, and its gems'.
 *
 * @param {RockShape} rock
 * @param {Palette} palette
 * @returns {{ body: string, gem: string }}
 */
function inksOf(rock, palette) {
  const inks = ROCK_INKS[palette.mode];
  return { body: rock.kind === "crystal" ? inks.stone : inks[rock.kind], gem: inks.crystal };
}

/**
 * Returns a rock breaking, at a time since it broke, about its middle.
 *
 * In turn: a flash on the rock, a frame or two long; its facets flying
 * apart as shards that tumble, shrink and fade into the field's color, so
 * none is taken for a small rock, which keeps its outline and its light; a
 * ring of dust; a few sparks; and the smaller rocks it leaves, coming out
 * from its middle. It is over by `FX_MS.break`.
 *
 * @param {RockShape} rock
 * @param {number} t In milliseconds.
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, seed?: number, from?: number, headings?: number[], drop?: (shown: number) => string, pieces?: boolean, spread?: number, made?: Break }} [how]
 *   The rock's turn and the way the shot flew, in radians; what the rock
 *   lets go, drawn from how far it has come out, 0 to 1; whether its pieces
 *   are drawn; and how far apart its shards start, 1 for where they lay.
 * @returns {string}
 */
export function breakFx(rock, t, palette, { unit = 16, turn = 0, seed = 1, from = 0, headings, drop, pieces = true, spread = 1, made } = {}) {
  if (t < 0) return rockSvg(rock, palette, { unit, turn });
  const data = made ?? makeBreak(rock, { seed, turn, from, ...(headings ? { headings } : {}) });
  const R = rock.radius * unit;
  const inks = inksOf(rock, palette);
  const tones = { body: tonesOf(inks.body, palette), gem: tonesOf(inks.gem, palette), band: tonesOf(inks.body, palette) };
  const flash = t < 25 ? 0.86 : 0.86 * (1 - shareOf(t, 25, 95));
  const parts = [];
  // Dust, behind everything.
  if (data.dust > 0) {
    const s = shareOf(t, 15, FX_MS.break - 20);
    if (s > 0 && s < 1) {
      const dustTone = mix(inks.body, palette.field, palette.mode === "light" ? 0.45 : 0.3);
      const at = R * (0.7 + 1.05 * easeOut(s));
      parts.push(ring(0, 0, at, dustTone, Math.max(1, R * 0.16 * (1 - s) * data.dust), { opacity: 0.55 * (1 - s) }));
      for (const puff of data.puffs) {
        const [x, y] = polar(puff.angle + data.turn, at * puff.at);
        parts.push(circle(x, y, R * puff.r * (0.7 + 0.9 * s), dustTone, { opacity: 0.42 * (1 - s) * Math.min(1, data.dust) }));
      }
    }
  }
  // The rock itself, for the frame or two before it comes apart.
  if (t < 30) {
    parts.push(rockSvg(rock, palette, { unit, turn }));
    const outline = rock.outline.map((p) => {
      const [x, y] = turned(p, turn);
      return /** @type {Point} */ ([x * R, y * R]);
    });
    parts.push(polygon(outline, flashTone(inks.body, palette), { opacity: flash }));
  } else {
    for (const shard of data.shards) {
      const s = shareOf(t, 30, 30 + shard.life);
      if (s >= 1) continue;
      const far = shard.reach * easeOut(s);
      const cx = shard.at[0] * spread + Math.cos(shard.heading) * far;
      const cy = shard.at[1] * spread + Math.sin(shard.heading) * far;
      const size = lerp(1, shard.shrink, s);
      const rolled = shard.spin * s;
      const points = shard.points.map((p) => {
        const [x, y] = turned(p, rolled);
        const [wx, wy] = turned([cx + x * size, cy + y * size], data.turn);
        return /** @type {Point} */ ([wx * R, wy * R]);
      });
      const set = tones[shard.part];
      const lit = toneAt(litBy(shard.normal, data.turn + rolled), set);
      const fill = mix(mix(lit, flashTone(set.ink, palette), flash), palette.field, s ** 1.6 * 0.85);
      if (shard.part === "gem") {
        const [gx, gy] = turned([cx, cy], data.turn);
        parts.push(glow(gx * R, gy * R, R * 0.42 * size, inks.gem, palette, 0.8 * (1 - s)));
      }
      parts.push(polygon(points, fill, { opacity: 1 - s ** 3, stroke: fill, "stroke-width": 0.5, "stroke-linejoin": "round" }));
    }
  }
  // The pieces it leaves, from its middle, over its shards, so nothing hides a rock that can be hit.
  if (pieces && t >= 45) {
    const out = easeOut(shareOf(t, 45, FX_MS.break));
    const size = lerp(0.62, 1, easeOut(shareOf(t, 45, 220)));
    for (const piece of data.pieces) {
      const [x, y] = polar(piece.heading, piece.reach * unit * out);
      parts.push(place(rockSvg(piece.rock, palette, { unit, turn: piece.turn + piece.spin * (t / 1000) }), { x, y, scale: size, opacity: shareOf(t, 45, 115) }));
    }
  }
  if (drop && t >= 110) parts.push(drop(easeOut(shareOf(t, 110, 330))));
  // Sparks and glints, over everything.
  if (data.sparks.length > 0) {
    const scaled = data.sparks.map((tick) => ({ ...tick, reach: tick.reach * rock.radius, length: Math.max(0.3, tick.length * rock.radius * 0.6) }));
    parts.push(ticksAt(scaled, t, palette.warning, palette, { unit, from: rock.radius * 0.45, width: rock.kind === "iron" ? 0.14 : 0.1 }));
  }
  for (const glint of data.glints) {
    const s = shareOf(t, glint.delay, glint.delay + 150);
    if (t < glint.delay || s >= 1) continue;
    const [x, y] = turned(glint.at, data.turn);
    const r = R * glint.r * swell(s, 0.35) + 0.6;
    parts.push(polygon(sparkPoints(r, 0.2, glint.turn).map(([px, py]) => /** @type {Point} */ ([x * R + px, y * R + py])), palette.mode === "light" ? tones.body.ink : "#ffffff", { opacity: 0.95 }));
  }
  return parts.join("");
}

/**
 * Returns where a ray from a polygon's middle meets its outline.
 *
 * @param {readonly Point[]} outline About the origin, which lies inside it.
 * @param {number} angle
 * @returns {Point}
 */
export function rimPoint(outline, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let far = 0;
  outline.forEach((a, i) => {
    const b = /** @type {Point} */ (outline[(i + 1) % outline.length]);
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const across = dx * ey - dy * ex;
    if (Math.abs(across) < 1e-9) return;
    const along = (a[0] * ey - a[1] * ex) / across;
    const share = (a[0] * dy - a[1] * dx) / across;
    if (along > 0 && share >= -1e-6 && share <= 1 + 1e-6) far = Math.max(far, along);
  });
  return [dx * far, dy * far];
}

/**
 * Returns a jagged line that grows from its start, as far as a share of it.
 *
 * @param {Point[]} points
 * @param {number} share
 * @returns {Point[]}
 */
function grown(points, share) {
  if (share >= 1) return points;
  const at = share * (points.length - 1);
  const whole = Math.floor(at);
  const a = /** @type {Point} */ (points[whole]);
  const b = /** @type {Point} */ (points[whole + 1]);
  return [...points.slice(0, whole + 1), [lerp(a[0], b[0], at - whole), lerp(a[1], b[1], at - whole)]];
}

/**
 * Returns a rock holding a hit, at a time since the shot landed, about its
 * middle: a spark where it landed, the facets it struck lit for a few
 * frames, and a crack that appears and stays.
 *
 * @param {RockShape} rock
 * @param {number} t In milliseconds; the spark is gone by `FX_MS.held`, and the crack stays.
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, toward?: number, seed?: number, still?: boolean }} [how] The way from the rock's middle to where the shot landed, in radians; still, for the crack alone.
 * @returns {string}
 */
export function heldHitFx(rock, t, palette, { unit = 16, turn = 0, toward = TURN / 2, seed = 1, still = false } = {}) {
  const parts = [rockSvg(rock, palette, { unit, turn })];
  if (t < 0) return parts.join("");
  const R = rock.radius * unit;
  const random = seeded(seed * 211 + 9);
  const inks = inksOf(rock, palette);
  const tones = tonesOf(inks.body, palette);
  const outline = rock.outline.map((p) => turned(p, turn));
  const rim = rimPoint(outline, toward);
  const hit = /** @type {Point} */ ([rim[0] * 0.94, rim[1] * 0.94]);
  if (!still) {
    // The facets nearest the hit light up.
    const lit = 0.9 * (1 - shareOf(t, 0, 70)) + 0.3 * (1 - shareOf(t, 0, 170));
    if (lit > 0.02) {
      const near = rock.facets
        .filter(({ points }) => areaOf(points) > 0.024)
        .map((facet) => {
          const mid = turned(middleOf(facet.points), turn);
          return { facet, far: Math.hypot(mid[0] - hit[0], mid[1] - hit[1]) };
        })
        .sort((a, b) => a.far - b.far)
        .slice(0, 3);
      for (const { facet } of near) {
        parts.push(
          polygon(
            facet.points.map((p) => {
              const [x, y] = turned(p, turn);
              return /** @type {Point} */ ([x * R, y * R]);
            }),
            flashTone(inks.body, palette),
            { opacity: Math.min(1, lit) },
          ),
        );
      }
    }
  }
  // The crack, from the hit inward.
  const inward = Math.atan2(-hit[1], -hit[0]) + between(random, -0.35, 0.35);
  const end = polar(inward, between(random, 0.45, 0.62), hit);
  const crack = broken(random, hit, end, 2, 0.16);
  const fork = broken(random, /** @type {Point} */ (crack[2]), polar(inward + between(random, 0.6, 0.9), 0.24, /** @type {Point} */ (crack[2])), 1, 0.2);
  const share = still ? 1 : easeOut(shareOf(t, 0, 80));
  const px = (/** @type {Point[]} */ points) => points.map(([x, y]) => /** @type {Point} */ ([x * R, y * R]));
  const width = Math.max(1, 0.035 * R);
  parts.push(polyline(px(grown(crack, share)), tones.deep, width, { "stroke-linejoin": "miter" }));
  if (share > 0.6) parts.push(polyline(px(grown(fork, (share - 0.6) / 0.4)), tones.deep, width * 0.8));
  if (!still) parts.push(place(impactFx(t * (FX_MS.impact / FX_MS.held), palette, { unit, toward, seed, count: rock.kind === "iron" ? 7 : 5 }), { x: rim[0] * R, y: rim[1] * R }));
  return parts.join("");
}

// --- A volatile rock blasts ---------------------------------------------

/** How far a volatile rock's blast reaches, by its size, in field units, as the catalog has it. */
export const BLAST_REACH = { large: 6, medium: 4 };

/** How long a volatile rock's seams flare before it blasts, and how long after a blast reaches a neighbour it takes its hit. */
export const BLAST_BEATS = { flare: 70, chain: 90 };

/**
 * Returns how far a blast's ring has swept, in field units.
 *
 * @param {number} t Since the rock's seams began to flare.
 * @param {number} radius The rock's.
 * @param {number} reach
 * @returns {number}
 */
export function blastRingAt(t, radius, reach) {
  return lerp(radius * 0.9, reach, easeOut(shareOf(t, BLAST_BEATS.flare, 430)));
}

/**
 * Returns the color a blast's soft light is tinted in: the volatile rock's
 * own ink, lifted a little toward its seams' on a dark field.
 *
 * The seams' pale yellow alone, under plain alpha, turns olive over a blue
 * field, as Midnight blue's is; the rock's coral stays warm over any field.
 *
 * @param {Palette} palette
 * @returns {string}
 */
export function blastLight(palette) {
  const inks = ROCK_INKS[palette.mode];
  return palette.mode === "light" ? inks.volatile : mix(inks.volatile, inks.core, 0.3);
}

/**
 * Returns a volatile rock with its seams flaring, about its middle.
 *
 * @param {RockShape} rock
 * @param {Palette} palette
 * @param {number} flare From 0, as it flies, to 1, white.
 * @param {{ unit?: number, turn?: number }} [how]
 * @returns {string}
 */
export function flaringSvg(rock, palette, flare, { unit = 16, turn = 0 } = {}) {
  const R = rock.radius * unit;
  const core = ROCK_INKS[palette.mode].core;
  const hot = palette.mode === "light" ? mix(core, "#ffffff", 0.5) : "#ffffff";
  const parts = [rockSvg(rock, palette, { unit, turn, pulse: 1 })];
  if (flare <= 0) return parts.join("");
  parts.unshift(glow(0, 0, R * (1.25 + 0.6 * flare), blastLight(palette), palette, flare));
  for (const stroke of rock.strokes) {
    if (stroke.tone !== "core") continue;
    const points = stroke.points.map((p) => {
      const [x, y] = turned(p, turn);
      return /** @type {Point} */ ([x * R, y * R]);
    });
    parts.push(polyline(points, core, Math.max(1.5, stroke.width * R * (1.6 + 2.6 * flare)), { opacity: 0.5 * flare }));
    parts.push(polyline(points, hot, Math.max(1, stroke.width * R * (1 + 1.1 * flare)), { opacity: flare }));
  }
  return parts.join("");
}

/**
 * Returns a volatile rock's blast, at a time since its seams began to
 * flare, about its middle.
 *
 * In turn: its seams flare white; a flash disc; a shockwave ring that
 * sweeps out to its reach, hot at its inner edge; embers thrown and
 * fading; a brief puff of scorch smoke; and, where a neighbour lies within
 * its reach, the ring reaching it and its seams flaring in turn, then its
 * own blast. One blast is over by `FX_MS.blast`.
 *
 * @param {RockShape} rock
 * @param {number} t In milliseconds.
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, seed?: number, reach?: number, neighbour?: { rock: RockShape, at: Point, turn?: number }, still?: boolean }} [how]
 *   A neighbour's place is in field units from the rock's middle. Still, for the one mark a player sees where motion isn't welcome.
 * @returns {string}
 */
export function blastFx(rock, t, palette, { unit = 16, turn = 0, seed = 1, reach = BLAST_REACH[rock.size === "medium" ? "medium" : "large"], neighbour, still = false } = {}) {
  const R = rock.radius * unit;
  const inks = ROCK_INKS[palette.mode];
  const ember = energyOf(palette.warning, palette);
  const hot = palette.mode === "light" ? mix(inks.core, inks.volatile, 0.3) : mix(inks.core, "#ffffff", 0.6);
  if (still) {
    // One still ring at its reach, and no flash.
    return ring(0, 0, reach * unit, inks.volatile, Math.max(1.5, 0.16 * unit), { opacity: 0.8 });
  }
  const parts = [];
  const smokeRandom = seeded(seed * 733 + 3);
  const emberRandom = seeded(seed * 733 + 4);
  // The neighbour, under the ring.
  if (neighbour) {
    const far = Math.hypot(neighbour.at[0], neighbour.at[1]);
    let reached = BLAST_BEATS.flare;
    while (reached < 430 && blastRingAt(reached, rock.radius, reach) < far - neighbour.rock.radius * 0.9) reached += 5;
    const hitAt = reached + BLAST_BEATS.chain;
    const look = { unit, turn: neighbour.turn ?? 0 };
    const inner = t < hitAt ? flaringSvg(neighbour.rock, palette, easeOut(shareOf(t, reached, hitAt)), look) : blastFx(neighbour.rock, t - hitAt + BLAST_BEATS.flare, palette, { ...look, seed: seed + 5 });
    parts.push(place(inner, { x: neighbour.at[0] * unit, y: neighbour.at[1] * unit }));
  }
  if (t < BLAST_BEATS.flare) {
    parts.push(flaringSvg(rock, palette, easeOut(shareOf(t, 0, BLAST_BEATS.flare)), { unit, turn }));
    return parts.join("");
  }
  if (t >= FX_MS.blast) return parts.join("");
  const s = shareOf(t, BLAST_BEATS.flare, 430);
  const at = blastRingAt(t, rock.radius, reach) * unit;
  const band = unit * lerp(0.75, 0.16, s);
  // The ground the ring has swept, faintly lit.
  if (s < 1) parts.push(circle(0, 0, at, inks.volatile, { opacity: 0.08 * (1 - s) }));
  // Scorch smoke, dark on a dark field and grey on a light one.
  const smoke = palette.mode === "light" ? mix(palette.fieldMuted, palette.field, 0.35) : mix(palette.page, inks.volatile, 0.1);
  const smoked = shareOf(t, 105, FX_MS.blast);
  if (smoked > 0 && smoked < 1) {
    for (let i = 0; i < 5; i++) {
      const [x, y] = polar(between(smokeRandom, 0, TURN), R * between(smokeRandom, 0.1, 0.5) * (1 + 0.5 * smoked));
      parts.push(circle(x, y, R * between(smokeRandom, 0.34, 0.5) * (0.6 + 0.6 * easeOut(smoked)), smoke, { opacity: (palette.mode === "light" ? 0.3 : 0.42) * swell(smoked, 0.22) }));
    }
  }
  // The rock's own shards.
  parts.push(breakFx(rock, (t - BLAST_BEATS.flare) * 1.1, palette, { unit, turn, seed }));
  // The ring: a soft outside, its own ink, and a hot inner edge. The soft
  // outside steps down in two bands, so it reads as light and not as a rim.
  const soft = blastLight(palette);
  if (s < 1) {
    const dim = (1 - s) * (palette.mode === "light" ? 0.75 : 1);
    parts.push(ring(0, 0, at + band * 0.7, soft, band * 2.4, { opacity: 0.12 * dim }));
    parts.push(ring(0, 0, at + band * 0.3, soft, band * 1.3, { opacity: 0.26 * dim }));
    parts.push(ring(0, 0, at, inks.volatile, band, { opacity: 0.9 * (1 - s * s) }));
    parts.push(ring(0, 0, at - band * 0.32, hot, Math.max(1, band * 0.36), { opacity: 1 - s }));
  }
  // The flash disc.
  const flashed = shareOf(t, BLAST_BEATS.flare, 175);
  if (flashed < 1) {
    parts.push(glow(0, 0, R * 2.7, soft, palette, 1 - flashed));
    parts.push(circle(0, 0, R * (1.25 + 0.85 * flashed), hot, { opacity: 0.95 * (1 - flashed) ** 1.5 }));
  }
  // Embers.
  for (let i = 0; i < 12; i++) {
    const angle = ((i + between(emberRandom, -0.35, 0.35)) / 12) * TURN;
    const far = between(emberRandom, 0.55, 1.05) * reach * unit;
    const delay = BLAST_BEATS.flare + between(emberRandom, 0, 40);
    const life = between(emberRandom, 300, 430);
    const e = shareOf(t, delay, delay + life);
    if (e >= 1) continue;
    const head = lerp(R * 0.5, far, easeOut(e));
    const opacity = 1 - e * e;
    parts.push(polyline([polar(angle, head - unit * 0.55 * (1 - e)), polar(angle, head)], ember.body, Math.max(1, 0.1 * unit), { opacity: opacity * 0.55 }));
    const [x, y] = polar(angle, head);
    parts.push(circle(x, y, Math.max(0.9, unit * 0.13 * (1 - 0.5 * e)), mix(ember.hot, ember.body, e), { opacity }));
  }
  return parts.join("");
}

// --- The boulder's last hit ---------------------------------------------

/**
 * Returns the boulder breaking at its last hit, at a time since the shot
 * landed, about its middle, in three beats: its cracks flare, it splits
 * in three, and three large rocks are thrown out of it. It is over by
 * `FX_MS.boulder`.
 *
 * @param {RockShape} rock
 * @param {number} t In milliseconds.
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, seed?: number }} [how]
 * @returns {string}
 */
export function boulderFx(rock, t, palette, { unit = 16, turn = 0, seed = 1 } = {}) {
  if (t < 0) return rockSvg(rock, palette, { unit, turn });
  const R = rock.radius * unit;
  const random = seeded(seed * 389 + 1);
  const inks = ROCK_INKS[palette.mode];
  const tones = tonesOf(inks[rock.kind], palette);
  const hot = palette.mode === "light" ? mix(inks.core, inks.volatile, 0.35) : mix(inks.core, "#ffffff", 0.55);
  const glowInk = palette.mode === "light" ? palette.warning : inks.core;
  const outline = rock.outline.map((p) => turned(p, turn));
  const first = between(random, 0, TURN);
  const angles = [0, 1, 2].map((i) => first + (i / 3) * TURN + between(random, -0.22, 0.22));
  const middle = /** @type {Point} */ ([between(random, -0.08, 0.08), between(random, -0.08, 0.08)]);
  const cracks = angles.map((angle) => broken(random, middle, rimPoint(outline, angle), 3, 0.13));
  const px = (/** @type {Point[]} */ points, /** @type {Point} */ off = [0, 0]) => points.map(([x, y]) => /** @type {Point} */ ([(x + off[0]) * R, (y + off[1]) * R]));
  // The way each third heads: between its two cracks.
  const ways = [0, 1, 2].map((i) => {
    const a = /** @type {number} */ (angles[i]);
    let b = /** @type {number} */ (angles[(i + 1) % 3]);
    while (b < a) b += TURN;
    return (a + b) / 2;
  });
  const first0 = /** @type {number} */ (angles[0]);
  const wrapTurn = (/** @type {number} */ angle) => ((angle % TURN) + TURN) % TURN;
  const parts = [];
  if (t < 400) {
    const split = easeOut(shareOf(t, 200, 400));
    const flare = easeOut(shareOf(t, 0, 150));
    if (split > 0) parts.push(glow(0, 0, R * (0.9 + 0.5 * split), glowInk, palette, 0.95));
    if (split === 0) {
      parts.push(rockSvg(rock, palette, { unit, turn }));
    } else {
      // Three thirds, each its facets, drifting apart.
      const width = Math.max(2.5, 0.28 * unit);
      for (const outlineFirst of [true, false]) {
        for (const facet of rock.facets) {
          const mid = turned(middleOf(facet.points), turn);
          const past = wrapTurn(Math.atan2(mid[1] - middle[1], mid[0] - middle[0]) - first0);
          const third = past < wrapTurn(/** @type {number} */ (angles[1]) - first0) ? 0 : past < wrapTurn(/** @type {number} */ (angles[2]) - first0) ? 1 : 2;
          const off = polar(/** @type {number} */ (ways[third]), 0.17 * split);
          const points = px(facet.points.map((p) => turned(p, turn)), off);
          if (outlineFirst) {
            parts.push(polygon(points, palette.field, { stroke: palette.field, "stroke-width": width, "stroke-linejoin": "round" }));
          } else {
            const fill = toneAt(litBy(facet.normal, turn), tones);
            parts.push(polygon(points, fill, { stroke: fill, "stroke-width": 0.6, "stroke-linejoin": "round" }));
          }
        }
        if (outlineFirst) parts.push(glow(0, 0, R * 0.8 * split, glowInk, palette, 0.9));
      }
    }
    // The cracks, flaring from the middle out.
    const fade = 1 - shareOf(t, 230, 400);
    cracks.forEach((crack, i) => {
      const line = px(grown(crack, flare), polar(/** @type {number} */ (ways[i]), 0));
      parts.push(polyline(line, glowInk, Math.max(3, 0.11 * R), { opacity: 0.32 * flare * fade }));
      parts.push(polyline(line, inks.core, Math.max(2, 0.05 * R), { opacity: 0.9 * fade }));
      parts.push(polyline(line, hot, Math.max(1, 0.022 * R), { opacity: fade, "stroke-linejoin": "miter" }));
    });
    if (t < 200) parts.unshift(glow(0, 0, R * (0.5 + 0.8 * flare), glowInk, palette, 0.75 * flare));
    // Sparks off the cracks' ends as they reach the rim.
    const ticks = makeTicks(random, 8, { reach: [1.6, 3.2], length: [0.5, 0.8], life: [170, 240], delay: 60 });
    parts.push(place(ticksAt(ticks, t - 110, palette.warning, palette, { unit, from: rock.radius * 0.9, width: 0.12 })));
    return parts.join("");
  }
  // The throw: its facets fly, and three large rocks come out.
  const thrown = 30 + (t - 400) * ((FX_MS.break - 30) / (FX_MS.boulder - 400));
  parts.push(glow(0, 0, R * 1.6, glowInk, palette, 0.9 * (1 - shareOf(t, 400, 520))));
  parts.push(breakFx(rock, thrown, palette, { unit, turn, seed, headings: ways, spread: 1.17 }));
  const ringed = shareOf(t, 400, FX_MS.boulder);
  parts.push(ring(0, 0, R * (1 + 1.1 * easeOut(ringed)), inks.core, Math.max(1, 0.2 * unit * (1 - ringed)), { opacity: 0.7 * (1 - ringed) }));
  return parts.join("");
}

// --- Thrust -------------------------------------------------------------

/**
 * Returns the ship's flame in one of its three flicker frames, about the
 * tail it leaves, reaching back along x.
 *
 * @param {0 | 1 | 2} frame
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number }} [how] The ship's heading, in radians.
 * @returns {string}
 */
export function flameSvg(frame, palette, { unit = 16, turn = 0 } = {}) {
  const length = /** @type {number} */ ([1.2, 1.55, 0.98][frame]);
  const half = /** @type {number} */ ([0.31, 0.27, 0.34][frame]);
  const tip = /** @type {number} */ ([0.04, -0.06, 0.07][frame]);
  const tones = energyOf(palette.warning, palette);
  // Wide enough to hold a pale middle on a light field, where a thin shot's must be dense to show.
  const middle = palette.mode === "light" ? mix(palette.warning, "#ffffff", 0.62) : tones.hot;
  const shape = (/** @type {number} */ k) =>
    /** @type {Point[]} */ ([
      [0.06, -half * 0.8 * k],
      [-0.26 * length * k, -half * k],
      [-0.62 * length * k, -half * 0.5 * k],
      [-length * k, tip * k],
      [-0.62 * length * k, half * 0.5 * k],
      [-0.26 * length * k, half * k],
      [0.06, half * 0.8 * k],
    ]).map(([x, y]) => /** @type {Point} */ ([x * unit, y * unit]));
  return place(
    [
      glow(-0.42 * length * unit, 0, 0.8 * length * unit, tones.halo, palette, 0.95, { ry: 0.72 * unit }),
      polygon(shape(1), tones.body, { stroke: tones.body, "stroke-width": Math.max(0.6, 0.06 * unit), "stroke-linejoin": "round" }),
      polygon(shape(0.56), middle, { stroke: middle, "stroke-width": Math.max(0.4, 0.04 * unit), "stroke-linejoin": "round" }),
    ].join(""),
    { turn: (turn / TURN) * 360 },
  );
}

/**
 * Returns a puff of exhaust at an age, about where it was let go, drifting
 * back along x.
 *
 * @param {number} age In milliseconds; it is gone by `FX_MS.exhaust`.
 * @param {Palette} palette
 * @param {{ unit?: number, sway?: number }} [how] How far to one side it drifts, −1 to 1.
 * @returns {string}
 */
export function puffSvg(age, palette, { unit = 16, sway = 0 } = {}) {
  const s = shareOf(age, 0, FX_MS.exhaust);
  if (s >= 1) return "";
  const tones = energyOf(palette.warning, palette);
  const x = -(0.4 + 2.6 * (s - 0.42 * s * s)) * unit;
  const y = sway * (0.08 + 0.5 * s) * unit;
  const fill = s < 0.2 ? mix(tones.hot, tones.body, s / 0.2) : mix(tones.body, palette.fieldMuted, (s - 0.2) / 0.8);
  return [
    s < 0.45 ? glow(x, y, (0.5 + 0.5 * s) * unit, tones.halo, palette, 0.6 * (1 - s / 0.45)) : "",
    circle(x, y, Math.max(0.8, (0.13 + 0.27 * s) * unit), fill, { opacity: 0.8 * (1 - s) ** 1.2 }),
  ].join("");
}

/**
 * Returns the trail of exhaust behind a ship under thrust, at a time,
 * about its tail: forty puffs a second, each fading over `FX_MS.exhaust`.
 *
 * @param {number} t In milliseconds.
 * @param {Palette} palette
 * @param {{ unit?: number, seed?: number, every?: number }} [how] The time between two puffs.
 * @returns {string}
 */
export function exhaustFx(t, palette, { unit = 16, seed = 1, every = 25 } = {}) {
  const parts = [];
  const first = Math.floor(t / every);
  for (let k = first; k > first - FX_MS.exhaust / every; k--) {
    const random = seeded(seed * 53 + k * 7);
    parts.push(puffSvg(t - k * every, palette, { unit, sway: between(random, -1, 1) }));
  }
  return parts.reverse().join("");
}

// --- A dash -------------------------------------------------------------

/** How fast a dash throws the ship, in field units a second, and for how long, as `tuning.ts` has them. */
export const DASH = { speed: 34, ms: 220, after: 15 };

/**
 * Returns how far along its dash the ship is, in field units.
 *
 * @param {number} t
 * @returns {number}
 */
export function dashedAt(t) {
  return (DASH.speed * Math.min(t, DASH.ms) + DASH.after * Math.max(0, t - DASH.ms)) / 1000;
}

/**
 * Returns a dash at a time since it began, about where it began, along x:
 * streak lines behind the ship, a ring left at the start, and three
 * after-images of the ship fading along its path.
 *
 * @param {number} t In milliseconds; nothing of it is left by `FX_MS.dash`.
 * @param {Palette} palette
 * @param {{ unit?: number, seed?: number, ship?: boolean, still?: boolean }} [how] Whether the placeholder ship is drawn. Still, for the one mark a player sees where motion isn't welcome.
 * @returns {string}
 */
export function dashFx(t, palette, { unit = 16, seed = 1, ship = true, still = false } = {}) {
  const tones = energyOf(palette.accent, palette);
  if (still) return ring(0, 0, 1.5 * unit, tones.body, Math.max(1.2, 0.1 * unit), { opacity: 0.7 });
  const parts = [];
  const random = seeded(seed * 71 + 13);
  const at = dashedAt(t) * unit;
  // The ring left where it began.
  const ringed = shareOf(t, 0, 340);
  if (ringed < 1) {
    parts.push(ring(0, 0, (0.7 + 1.7 * easeOut(ringed)) * unit, tones.halo, Math.max(1.5, 0.42 * unit * (1 - ringed)), { opacity: 0.22 * (1 - ringed) }));
    parts.push(ring(0, 0, (0.7 + 1.7 * easeOut(ringed)) * unit, tones.body, Math.max(1, 0.12 * unit * (1 - ringed * 0.6)), { opacity: 0.9 * (1 - ringed) }));
  }
  // After-images along the path.
  [0.2, 0.48, 0.76].forEach((share) => {
    const laid = share * DASH.ms;
    const faded = shareOf(t, laid, laid + 240);
    if (t < laid || faded >= 1) return;
    parts.push(place(shipPlaceholder(palette, { unit, ghost: true }), { x: dashedAt(laid) * unit, opacity: 0.75 * (1 - faded) }));
  });
  // Streaks behind the ship.
  const speeding = t < DASH.ms ? Math.min(1, t / 40) : 1 - shareOf(t, DASH.ms, DASH.ms + 120);
  if (speeding > 0) {
    for (let i = 0; i < 6; i++) {
      const y = (i - 2.5) * 0.36 * unit + between(random, -0.08, 0.08) * unit;
      const length = between(random, 1.6, 3.6) * unit * speeding;
      const back = at - (0.6 + between(random, 0, 0.9)) * unit;
      const start = Math.max(-0.4 * unit, back - length);
      if (back <= start) continue;
      parts.push(polyline([[start, y], [back, y]], tones.body, Math.max(1, 0.08 * unit), { opacity: 0.25 * speeding }));
      parts.push(polyline([[lerp(start, back, 0.55), y], [back, y]], i % 2 === 0 ? tones.hot : tones.body, Math.max(1, 0.08 * unit), { opacity: 0.8 * speeding }));
    }
  }
  if (ship) parts.push(place(shipPlaceholder(palette, { unit }), { x: at }));
  return parts.join("");
}

// --- A Nova, and a Shield spent -----------------------------------------

/**
 * Returns a Nova at a time since it was caught, about the ship: a bright
 * ring sweeping out to its reach.
 *
 * @param {number} t In milliseconds; it is gone by `FX_MS.nova`.
 * @param {Palette} palette
 * @param {{ unit?: number, reach?: number, still?: boolean }} [how] Its reach in field units, 12 as the catalog has it. Still, for the one mark a player sees where motion isn't welcome.
 * @returns {string}
 */
export function novaFx(t, palette, { unit = 16, reach = 12, still = false } = {}) {
  const tones = energyOf(palette.accent, palette);
  if (still) return ring(0, 0, reach * unit, tones.body, Math.max(1.5, 0.16 * unit), { opacity: 0.75 });
  if (t < 0 || t >= FX_MS.nova) return "";
  const s = shareOf(t, 0, 300);
  const fade = 1 - shareOf(t, 240, FX_MS.nova);
  const at = lerp(0.8, reach, easeOut(s)) * unit;
  const band = lerp(1.5, 0.5, s) * unit;
  const parts = [
    circle(0, 0, at, tones.halo, { opacity: 0.03 * fade }),
    ring(0, 0, at - band * 0.2, tones.halo, band * 1.8, { opacity: 0.18 * fade * tones.glow }),
    ring(0, 0, at, tones.body, band * 0.5, { opacity: 0.85 * fade }),
    ring(0, 0, at, tones.hot, Math.max(1, band * 0.16), { opacity: fade }),
  ];
  if (t < 90) parts.push(glow(0, 0, 3.4 * unit, tones.halo, palette, 1 - t / 90));
  for (let i = 0; i < 8; i++) {
    const [x, y] = polar((i / 8) * TURN + 0.2, at);
    parts.push(polygon(sparkPoints(0.38 * unit * fade + 0.5, 0.22, 0.3).map(([px, py]) => /** @type {Point} */ ([x + px, y + py])), tones.hot, { opacity: fade }));
  }
  return parts.join("");
}

/** How far the Shield's shell stands from the ship's middle, in field units. */
export const SHELL_RADIUS = 1.8;

/**
 * Returns the Shield's shell around the ship, whole.
 *
 * @param {Palette} palette
 * @param {{ unit?: number, lit?: number }} [how] How strongly it flashes, 0 to 1.
 * @returns {string}
 */
export function shellSvg(palette, { unit = 16, lit = 0 } = {}) {
  const tones = energyOf(palette.accent, palette);
  const r = SHELL_RADIUS * unit;
  /** @type {Point[]} */
  const glint = [];
  for (let i = 0; i <= 6; i++) glint.push(polar(TURN * (0.55 + (i / 6) * 0.13), r * 0.86));
  return [
    glow(0, 0, r * 1.25, tones.halo, palette, 0.35 + 0.6 * lit),
    circle(0, 0, r, tones.halo, { opacity: 0.12 + 0.3 * lit }),
    ring(0, 0, r, mix(tones.body, tones.hot, lit), Math.max(1.2, 0.12 * unit)),
    polyline(glint, palette.mode === "light" ? tones.body : "#ffffff", Math.max(1, 0.1 * unit), { opacity: 0.8 }),
  ].join("");
}

/**
 * Returns a spent Shield at a time since it was struck, about the ship:
 * its glass shell flashes and bursts into arcs that fly out and fade.
 *
 * @param {number} t In milliseconds; it is gone by `FX_MS.shield`.
 * @param {Palette} palette
 * @param {{ unit?: number, seed?: number, still?: boolean }} [how] Still, for the one mark a player sees where motion isn't welcome.
 * @returns {string}
 */
export function shieldFx(t, palette, { unit = 16, seed = 1, still = false } = {}) {
  const tones = energyOf(palette.accent, palette);
  const r = SHELL_RADIUS * unit;
  if (still) return ring(0, 0, r, tones.body, Math.max(1.2, 0.12 * unit), { opacity: 0.7, "stroke-dasharray": `${num(0.5 * unit)} ${num(0.44 * unit)}` });
  if (t < 0 || t >= FX_MS.shield) return "";
  if (t < 50) return shellSvg(palette, { unit, lit: 1 - t / 100 });
  const random = seeded(seed * 157 + 7);
  const s = shareOf(t, 50, FX_MS.shield);
  const parts = [ring(0, 0, r * (1 + 0.9 * easeOut(s)), tones.halo, Math.max(1, 0.3 * unit * (1 - s)), { opacity: 0.3 * (1 - s) })];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const middle = ((i + between(random, -0.2, 0.2)) / count) * TURN;
    const span = (TURN / count) * 0.78 * (1 - 0.45 * s);
    const out = between(random, 0.7, 1.5) * unit * easeOut(s);
    const roll = between(random, -0.9, 0.9) * s;
    const [cx, cy] = polar(middle, r + out);
    /** @type {Point[]} */
    const arc = [];
    for (let k = 0; k <= 6; k++) {
      const a = middle + (k / 6 - 0.5) * span;
      const [x, y] = turned([Math.cos(a) * r - Math.cos(middle) * r, Math.sin(a) * r - Math.sin(middle) * r], roll);
      arc.push([cx + x, cy + y]);
    }
    parts.push(polyline(arc, tones.halo, Math.max(2, 0.34 * unit), { opacity: 0.22 * (1 - s) }));
    parts.push(polyline(arc, i % 3 === 0 ? tones.hot : tones.body, Math.max(1.1, 0.13 * unit * (1 - 0.4 * s)), { opacity: 1 - s * s }));
  }
  for (let i = 0; i < 4; i++) {
    const [x, y] = polar(between(random, 0, TURN), r * between(random, 0.9, 1.5));
    const delay = 60 + i * 55;
    const g = shareOf(t, delay, delay + 130);
    if (t < delay || g >= 1) continue;
    parts.push(spark(x, y, 0.4 * unit * swell(g, 0.4), palette.accent, palette, { halo: 0.5 }));
  }
  return parts.join("");
}

// --- A ship lost --------------------------------------------------------

/**
 * Returns a ship lost, at a time since it was struck, about where it was:
 * a flash, its hull thrown as plates, a ring, embers, and its pilot
 * popping out in a small bubble and floating off.
 *
 * @param {number} t In milliseconds; the burst is gone by `FX_MS.lost`, and the pilot floats off until `FX_MS.bailOut`.
 * @param {Palette} palette
 * @param {{ unit?: number, turn?: number, seed?: number, still?: boolean }} [how] The ship's heading, in radians. Still, for the one mark a player sees where motion isn't welcome.
 * @returns {string}
 */
export function shipLostFx(t, palette, { unit = 16, turn = 0, seed = 1, still = false } = {}) {
  if (still) return bubblePlaceholder(palette, { unit, scale: 0.8 });
  if (t < 0) return shipPlaceholder(palette, { unit, turn });
  const random = seeded(seed * 239 + 17);
  const emberRandom = seeded(seed * 239 + 18);
  const tones = energyOf(palette.accent, palette);
  const ember = energyOf(palette.warning, palette);
  const parts = [];
  // The ring.
  const ringed = shareOf(t, 40, 380);
  if (t >= 40 && ringed < 1) {
    const at = (0.8 + 4.2 * easeOut(ringed)) * unit;
    parts.push(ring(0, 0, at, tones.halo, Math.max(2, 0.6 * unit * (1 - ringed)), { opacity: 0.2 * (1 - ringed) }));
    parts.push(ring(0, 0, at, tones.body, Math.max(1, 0.14 * unit * (1 - 0.5 * ringed)), { opacity: 0.9 * (1 - ringed) }));
  }
  // The hull, whole for a frame, then its plates.
  if (t < 30) {
    parts.push(shipPlaceholder(palette, { unit, turn }));
  } else {
    SHIP_PLATES.forEach((plate) => {
      const mid = middleOf(plate);
      const s = shareOf(t, 30, between(random, 400, 480));
      const heading = Math.atan2(mid[1], mid[0] - 0.1) + between(random, -0.5, 0.5);
      const far = between(random, 2.2, 3.8) * easeOut(s);
      const roll = between(random, -3.4, 3.4) * s;
      if (s >= 1) return;
      const size = lerp(1, 0.5, s);
      const points = plate.map((p) => {
        const [x, y] = turned([p[0] - mid[0], p[1] - mid[1]], roll);
        const [wx, wy] = turned([mid[0] + Math.cos(heading) * far + x * size, mid[1] + Math.sin(heading) * far + y * size], turn);
        return /** @type {Point} */ ([wx * unit, wy * unit]);
      });
      const fill = mix(palette.accent, palette.field, s ** 1.5 * 0.8);
      parts.push(polygon(points, fill, { opacity: 1 - s ** 3, stroke: fill, "stroke-width": 0.5, "stroke-linejoin": "round" }));
    });
  }
  // Embers.
  for (let i = 0; i < 10; i++) {
    const angle = ((i + between(emberRandom, -0.35, 0.35)) / 10) * TURN;
    const far = between(emberRandom, 2.4, 4.6) * unit;
    const delay = 30 + between(emberRandom, 0, 50);
    const e = shareOf(t, delay, delay + between(emberRandom, 320, 470));
    if (t < delay || e >= 1) continue;
    const head = lerp(0.4 * unit, far, easeOut(e));
    parts.push(polyline([polar(angle, head - 0.5 * unit * (1 - e)), polar(angle, head)], ember.body, Math.max(1, 0.1 * unit), { opacity: 0.55 * (1 - e * e) }));
    const [x, y] = polar(angle, head);
    parts.push(circle(x, y, Math.max(0.9, 0.13 * unit * (1 - 0.5 * e)), mix(ember.hot, ember.body, e), { opacity: 1 - e * e }));
  }
  // The flash.
  const flashed = shareOf(t, 0, 110);
  if (flashed < 1) {
    parts.push(glow(0, 0, 3.2 * unit, tones.halo, palette, 1 - flashed));
    parts.push(circle(0, 0, (1.1 + 0.8 * flashed) * unit, flashTone(palette.accent, palette), { opacity: 0.92 * (1 - flashed) ** 1.4 }));
  }
  // The pilot, popping out and floating off, up and to the left.
  if (t >= 70 && t < FX_MS.bailOut) {
    const popped = shareOf(t, 70, 260);
    const scale = popped < 1 ? 0.3 + 0.82 * easeOut(popped) - 0.12 * popped : 1;
    const drift = (2.2 * (t - 70)) / 1000;
    const [x, y] = polar(TURN * 0.62, drift * unit);
    parts.push(place(bubblePlaceholder(palette, { unit, scale: scale * 0.8 }), { x, y, opacity: t > 1100 ? 1 - shareOf(t, 1100, FX_MS.bailOut) : 1 }));
  }
  return parts.join("");
}

// --- A pickup caught, a stray rescued, a wave cleared -------------------

/**
 * Returns a pickup caught, at a time since the ship reached it, about the
 * ship: the orb drawn in and shrinking, a ring closing on the ship, and a
 * sparkle as it lands.
 *
 * @param {number} t In milliseconds; it is gone by `FX_MS.caught`.
 * @param {Palette} palette
 * @param {{ unit?: number, from?: Point, orb?: (scale: number) => string }} [how] Where the orb was as it was caught, in field units from the ship, and the orb, drawn at a scale.
 * @returns {string}
 */
export function caughtFx(t, palette, { unit = 16, from = [1.6, -1.1], orb } = {}) {
  if (t < 0 || t >= FX_MS.caught) return "";
  const tones = energyOf(palette.accent, palette);
  const parts = [];
  const drawn = shareOf(t, 0, 170);
  if (orb && drawn < 1) {
    const eased = drawn * drawn;
    parts.push(place(orb(lerp(1, 0.18, eased)), { x: from[0] * unit * (1 - eased), y: from[1] * unit * (1 - eased), opacity: 1 - drawn ** 4 }));
  }
  const closing = shareOf(t, 20, 220);
  if (t >= 20 && closing < 1) {
    const at = lerp(2.3, 0.45, closing * closing) * unit;
    parts.push(ring(0, 0, at, tones.halo, Math.max(2, 0.4 * unit), { opacity: 0.22 * swell(closing, 0.5) }));
    parts.push(ring(0, 0, at, tones.body, Math.max(1, 0.12 * unit), { opacity: 0.35 + 0.65 * closing }));
  }
  const landed = shareOf(t, 150, FX_MS.caught);
  if (t >= 150 && landed < 1) {
    parts.push(spark(0, 0, 1.1 * unit * swell(landed, 0.3) + 1, palette.accent, palette, { turn: 0.2 }));
    for (let i = 0; i < 3; i++) {
      const [x, y] = polar(0.5 + (i / 3) * TURN, (0.9 + 1.1 * landed) * unit);
      parts.push(polygon(sparkPoints(0.22 * unit * (1 - landed) + 0.5).map(([px, py]) => /** @type {Point} */ ([x + px, y + py])), tones.hot, { opacity: 1 - landed }));
    }
  }
  return parts.join("");
}

/**
 * Returns a stray rescued, at a time since the ship reached it, about
 * where its bubble was: a soft ring, and a few sparkles rising.
 *
 * @param {number} t In milliseconds; it is gone by `FX_MS.rescued`.
 * @param {Palette} palette
 * @param {{ unit?: number, seed?: number }} [how]
 * @returns {string}
 */
export function rescuedFx(t, palette, { unit = 16, seed = 1 } = {}) {
  if (t < 0 || t >= FX_MS.rescued) return "";
  const random = seeded(seed * 311 + 29);
  const tones = energyOf(palette.accent, palette);
  const parts = [];
  const s = shareOf(t, 0, 460);
  if (s < 1) {
    const at = (1.15 + 1.5 * easeOut(s)) * unit;
    parts.push(ring(0, 0, at, tones.halo, Math.max(2, 0.7 * unit * (1 - 0.5 * s)), { opacity: 0.24 * (1 - s) }));
    parts.push(ring(0, 0, at, tones.body, Math.max(1, 0.1 * unit), { opacity: 0.75 * (1 - s) }));
  }
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.62 * unit + between(random, -0.2, 0.2) * unit;
    const delay = 40 + i * 45 + between(random, 0, 40);
    const life = between(random, 320, 420);
    const g = shareOf(t, delay, delay + life);
    const rise = between(random, 1.4, 2.4);
    const size = between(random, 0.26, 0.42);
    if (t < delay || g >= 1) continue;
    parts.push(spark(x, (0.3 - rise * easeOut(g)) * unit, size * unit * swell(g, 0.3) + 0.6, palette.accent, palette, { turn: g * 0.8, halo: 0.55 }));
  }
  return parts.join("");
}

/**
 * Returns a wave cleared, at a time since its last rock broke, about that
 * rock: one calm ring crossing the whole field.
 *
 * @param {number} t In milliseconds; it is gone by `FX_MS.cleared`.
 * @param {Palette} palette
 * @param {{ unit?: number, reach?: number }} [how] How far the field's farthest corner lies, in field units.
 * @returns {string}
 */
export function clearedFx(t, palette, { unit = 16, reach = 60 } = {}) {
  if (t < 0 || t >= FX_MS.cleared) return "";
  const tones = energyOf(palette.accent, palette);
  const s = shareOf(t, 0, FX_MS.cleared);
  // Even in its pace, so it reads as calm.
  const at = lerp(1.5, reach, s * (2 - s) * 0.5 + s * 0.5) * unit;
  const fade = 1 - s ** 2;
  return [
    ring(0, 0, at - 0.6 * unit, tones.halo, 2.4 * unit, { opacity: 0.14 * fade }),
    ring(0, 0, at, tones.body, Math.max(1.2, 0.16 * unit), { opacity: 0.7 * fade }),
  ].join("");
}
