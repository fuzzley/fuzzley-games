// The backdrops of the uplift: what lies behind the play, one look for each
// sector. A backdrop is made once, from a sector, a field's size and a seed,
// as plain data in field units, in five layers back to front: a far wash,
// stars in three depths, one landmark, the sector's air and a vignette.
// `backdropSvg()` then draws it for a palette.
//
// Every layer is something the game could draw cheaply: a soft shape is one
// round texture, tinted, stretched and turned; a star, a mote or a glint is a
// small sprite; and a landmark is flat polygons or billows, baked once into
// a texture. Nothing here is a filter, a blend mode or a mask.
//
// The field stays quiet: every tone is the palette's field with a little of
// another of its colors mixed in, held to `LIMITS`, and every shape is
// larger than a boulder or smaller than a small rock, so none is taken for
// something that plays.

import {
  TURN,
  attrs,
  between,
  clamp,
  lerp,
  mix,
  normalOf,
  num,
  pick,
  pointsOf,
  polar,
  seeded,
  turned,
  unit as unitVector,
} from "./core.mjs";
import { PILOT_INKS, ROCK_INKS } from "./palettes.mjs";
import { LIGHT } from "./rocks.mjs";

/** @import { Point, Vec3 } from "./core.mjs" */
/** @import { Palette } from "./palettes.mjs" */

/** @typedef {"inner-belt" | "iron-reach" | "storm" | "endless"} Sector */
/** @typedef {"wash" | "stars" | "landmark" | "air" | "vignette"} BackdropLayer */
/** @typedef {"far" | "mid" | "bright"} Depth */

/**
 * @typedef {"accent" | "danger" | "warning" | "text" | "muted" | "deep" | "cloud" | "spark" | "blue" | "violet" | "stone" | "ice" | "crystal" | "iron" | "volatile" | "lodestone"} Tint
 * The color a backdrop's mark mixes into the field: a role of the palette, a
 * rock's ink or a pilot's. "deep" is the page behind the field in a dark
 * palette and the field's muted text in a light one; "cloud" is a cloud's
 * own body, the field sunk toward the page in a dark palette and the paper
 * itself in a light one; "spark" is a volatile rock's core.
 */

/**
 * @typedef {object} Flicker When a mark brightens for a moment, as lightning does.
 * @property {number} every How long from one flicker to the next, in seconds.
 * @property {number} after How long after time 0 the first comes, in seconds.
 */

/**
 * @typedef {object} Soft A soft shape: a tint that fades to nothing from its middle.
 * @property {"soft"} is
 * @property {Point} at Its middle, in field units.
 * @property {number} rx
 * @property {number} ry
 * @property {number} turn In degrees.
 * @property {Tint} tint
 * @property {number} strength How much of its limit it takes at its middle, 0 to 1.
 * @property {boolean} [small] Whether it is a mote, smaller than a small rock, held to the small marks' limit.
 * @property {"dark" | "light"} [shows] The one mode of palette it shows in; both unless told.
 * @property {Flicker} [flicker]
 */

/**
 * @typedef {object} Flat A flat face of something hard, lit from the field's upper left.
 * @property {"flat"} is
 * @property {Point[]} points Its corners, in field units.
 * @property {number} light How brightly the light falls on it, 0.3 to a little over 1.
 * @property {Tint} tint
 * @property {boolean} [fine] Whether it is left out under {@link FINE_FROM} pixels a unit.
 * @property {boolean} [small] Whether it is a glint, smaller than a small rock, held to the small marks' limit.
 */

/**
 * @typedef {object} Line A thin line.
 * @property {"line"} is
 * @property {Point[]} points In field units.
 * @property {number} width In field units.
 * @property {Tint} tint
 * @property {number} strength How much of the lines' limit it takes, 0 to 1.
 * @property {boolean} [fine] Whether it is left out under {@link FINE_FROM} pixels a unit.
 * @property {Flicker} [flicker]
 */

/**
 * @typedef {object} Speck A star that belongs to a landmark, and stays with it.
 * @property {"speck"} is
 * @property {Point} at In field units.
 * @property {number} r In field units.
 * @property {Depth} depth Which of the stars' three tones it takes.
 */

/**
 * @typedef {object} Streak A long hair of wind, fading at both ends.
 * @property {"streak"} is
 * @property {Point} at Its middle, in field units.
 * @property {number} length
 * @property {number} width
 * @property {number} turn In degrees.
 * @property {Tint} tint
 * @property {number} strength How much of the lines' limit it takes, 0 to 1.
 */

/**
 * @typedef {object} Bank Billows of cloud, back to front, each hiding what is behind it, soft at its edge, with a rim that tells its shape.
 * @property {"bank"} is
 * @property {{ at: Point, rx: number, ry: number, turn: number }[]} billows In field units; turns in degrees.
 * @property {Tint} tint Its rims' tint.
 * @property {number} rim How wide a billow's rim shows, in field units.
 */

/** @typedef {Soft | Flat | Line | Speck | Streak | Bank} Mark */

/**
 * @typedef {object} Star
 * @property {number} u How far across the field it lies, 0 to 1.
 * @property {number} v How far down the field it lies, 0 to 1.
 * @property {number} r In field units.
 * @property {number} shine How bright it is among its depth's, 0 to 1.
 */

/**
 * @typedef {object} Backdrop
 * @property {Sector} sector
 * @property {number} width In field units.
 * @property {number} height In field units.
 * @property {Soft[]} wash The far wash: two to four soft shapes in any one palette.
 * @property {Record<Depth, Star[]>} stars
 * @property {Tint} starTint The tint the stars take a little of.
 * @property {Mark[]} landmark Back to front.
 * @property {Mark[]} air Back to front.
 * @property {Point} wind The way the air drifts, in field units a second.
 * @property {{ depth: number, tint: Tint, strength: number }} vignette
 */

/**
 * @typedef {object} BackdropOptions
 * @property {Sector} sector
 * @property {number} width The field's width, in field units.
 * @property {number} height The field's height, in field units.
 * @property {number} unit The pixels a field unit takes.
 * @property {number} [seed] The run's seed, which places the stars and the air.
 * @property {number} [time] How long the backdrop has been shown, in seconds, for what drifts and flickers; 0 is its still form.
 * @property {Point} [travel] How far the ship has flown, unwrapped, in field units, which the nearer stars slide against.
 * @property {readonly BackdropLayer[]} [layers] The layers to draw; all of them unless told.
 */

/** The sectors, in the order a run meets them. */
export const SECTORS = /** @type {Sector[]} */ ([
  "inner-belt",
  "iron-reach",
  "storm",
  "endless",
]);

/** The sectors' names, as the game has them. */
export const SECTOR_NAMES = /** @type {Record<Sector, string>} */ ({
  "inner-belt": "Inner belt",
  "iron-reach": "Iron reach",
  storm: "Storm",
  endless: "Endless",
});

/** The layers of a backdrop, back to front. */
export const BACKDROP_LAYERS = /** @type {BackdropLayer[]} */ ([
  "wash",
  "stars",
  "landmark",
  "air",
  "vignette",
]);

/** The field's short side, in field units, as `tuning.ts` has it. */
export const SHORT_SIDE = 40;

/** The fewest pixels a unit takes for a landmark's fine marks to be drawn. */
export const FINE_FROM = 9;

/**
 * How much of another color a backdrop's mark may mix into the field, by the
 * palette's mode. `wash` holds the far wash and the vignette's tint, and
 * `landmark` the landmark's faces, billows and glows, each larger than a
 * boulder. `deep` holds what only darkens a dark field toward the page
 * behind it. `line` holds a hair's width of line, and `small` a mote or a
 * glint smaller than a small rock.
 */
export const LIMITS = {
  dark: { wash: 0.1, landmark: 0.1, deep: 0.5, line: 0.16, small: 0.26 },
  light: { wash: 0.05, landmark: 0.1, deep: 0.05, line: 0.1, small: 0.18 },
};

/**
 * How much of the field's muted text a star of each depth mixes into the
 * field, by the palette's mode; a bright star in a dark palette takes the
 * field's text instead.
 */
export const STAR_SHARES = {
  dark: { far: 0.24, mid: 0.46, bright: 0.54 },
  light: { far: 0.2, mid: 0.38, bright: 0.56 },
};

/** How many stars of each depth a field holds for each 1,600 units² of it. */
export const STARS_PER_AREA = { far: 96, mid: 34, bright: 3.4 };

/** The largest field's area, in units², which the stars are made for. */
const MOST_AREA = 88 * SHORT_SIDE;

/**
 * How far each depth of star slides for each unit the ship flies, against
 * its travel, and the air with them: the far stars stay.
 */
export const PARALLAX = { far: 0, mid: 0.012, bright: 0.03, air: 0.05 };

/**
 * How a face's share of its limit follows the light on it: deep, shade, ink
 * and lit. In a dark palette its deep tone is no tint but the field sunk
 * toward the page, as the far side of a planet is darker than the sky; in a
 * light one its lit tone is the paper itself.
 */
const HARD_STEPS = {
  dark: [0, 0.16, 0.56, 1],
  light: [1, 0.7, 0.42, 0.14],
};

// --- Colors -------------------------------------------------------------

/**
 * Returns the color a tint names in a palette.
 *
 * @param {Tint} tint
 * @param {Palette} palette
 * @returns {string}
 */
export function tintOf(tint, palette) {
  const inks = ROCK_INKS[palette.mode];
  const pilots = PILOT_INKS[palette.mode];
  switch (tint) {
    case "accent":
    case "danger":
    case "warning":
      return palette[tint];
    case "text":
      return palette.fieldText;
    case "muted":
      return palette.fieldMuted;
    case "deep":
      return palette.mode === "dark" ? palette.page : palette.fieldMuted;
    case "cloud":
      return palette.mode === "dark"
        ? mix(palette.field, palette.page, 0.9 * LIMITS.dark.deep)
        : palette.field;
    case "spark":
      return palette.mode === "dark"
        ? inks.core
        : mix(inks.core, inks.volatile, 0.35);
    case "blue":
      return /** @type {string} */ (pilots[5]);
    case "violet":
      return /** @type {string} */ (pilots[6]);
    default:
      return inks[tint];
  }
}

/** Every tint, for the gradients a palette's backdrops share. */
const TINTS = /** @type {Tint[]} */ ([
  "accent",
  "danger",
  "warning",
  "text",
  "muted",
  "deep",
  "cloud",
  "spark",
  "blue",
  "violet",
  "stone",
  "ice",
  "crystal",
  "iron",
  "volatile",
  "lodestone",
]);

/**
 * Returns how much of a tint a soft shape or a line takes at its strongest
 * in a palette.
 *
 * @param {Tint} tint
 * @param {number} strength
 * @param {"wash" | "landmark" | "line" | "small"} kind
 * @param {Palette} palette
 * @returns {number}
 */
function shareOf(tint, strength, kind, palette) {
  const limits = LIMITS[palette.mode];
  return (
    strength *
    (tint === "deep" && (kind === "wash" || kind === "landmark")
      ? limits.deep
      : limits[kind])
  );
}

/**
 * Returns the four tones a hard landmark is cut in, in a palette: in a dark
 * one the field with a little of the ink's lit tone, most where the light
 * falls; in a light one the field with a little of the ink's deep tone, most
 * in its shade, as ink on paper.
 *
 * @param {Tint} tint
 * @param {Palette} palette
 * @returns {string[]} Deep, shade, ink and lit.
 */
export function hardTones(tint, palette) {
  const other = hardOther(tint, palette);
  const { landmark, deep } = LIMITS[palette.mode];
  const tones = HARD_STEPS[palette.mode].map((step) =>
    mix(palette.field, other, step * landmark),
  );
  if (palette.mode === "dark")
    tones[0] = mix(palette.field, palette.page, 0.9 * deep);
  return tones;
}

/**
 * Returns how brightly the field's light falls on a face, 0.3 to a little
 * over 1, as the rocks' faces take it.
 *
 * @param {Vec3} normal
 * @returns {number}
 */
function lightOn(normal) {
  const facing =
    normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2];
  return 0.3 + 0.95 * Math.max(0, facing);
}

/**
 * Returns the tone of a face under a light, between a landmark's four.
 *
 * @param {number} light
 * @param {string[]} tones Deep, shade, ink and lit.
 * @returns {string}
 */
function toneUnder(light, tones) {
  const at = clamp((light - 0.3) / 0.82, 0, 1) * (tones.length - 1);
  const i = Math.min(Math.floor(at), tones.length - 2);
  return mix(
    /** @type {string} */ (tones[i]),
    /** @type {string} */ (tones[i + 1]),
    at - i,
  );
}

/**
 * Returns the color of a star of a depth in a palette, with a little of a
 * sector's tint: a pale speck on a dark field, a dark one on a light field.
 *
 * @param {Depth} depth
 * @param {Tint} tint
 * @param {Palette} palette
 * @returns {string}
 */
export function starColor(depth, tint, palette) {
  const base =
    depth === "bright" && palette.mode === "dark"
      ? palette.fieldText
      : palette.fieldMuted;
  const tinted = mix(base, tintOf(tint, palette), 0.22);
  return mix(palette.field, tinted, STAR_SHARES[palette.mode][depth]);
}

// --- Geometry -----------------------------------------------------------

/** @typedef {{ p: Point, z: number, angle: number }} Corner */
/** @typedef {{ points: Point[], normal: Vec3 }} Face A face of a globe, in units of its radius. */

/**
 * Returns the triangles between two rings of corners, each in order of its
 * angle from about the same start.
 *
 * @param {Corner[]} outer
 * @param {Corner[]} inner
 * @returns {[Corner, Corner, Corner][]}
 */
function zip(outer, inner) {
  const n = outer.length;
  const m = inner.length;
  const angleAt = (/** @type {Corner[]} */ ring, /** @type {number} */ k) =>
    /** @type {Corner} */ (ring[k % ring.length]).angle +
    (k >= ring.length ? TURN : 0);
  /** @type {[Corner, Corner, Corner][]} */
  const triangles = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && (j >= m || angleAt(outer, i + 1) <= angleAt(inner, j + 1))) {
      triangles.push([
        /** @type {Corner} */ (outer[i % n]),
        /** @type {Corner} */ (outer[(i + 1) % n]),
        /** @type {Corner} */ (inner[j % m]),
      ]);
      i++;
    } else {
      triangles.push([
        /** @type {Corner} */ (inner[j % m]),
        /** @type {Corner} */ (inner[(j + 1) % m]),
        /** @type {Corner} */ (outer[i % n]),
      ]);
      j++;
    }
  }
  return triangles;
}

/**
 * Returns a globe cut in flat faces: rings of corners on a ball, seen from
 * straight on, joined in triangles up to its middle.
 *
 * @param {() => number} random
 * @param {{ at: number, sides: number }[]} rings Outward in, the first on its edge.
 * @returns {Face[]}
 */
function globe(random, rings) {
  const corners = rings.map((ring, k) => {
    /** @type {Corner[]} */
    const list = [];
    for (let i = 0; i < ring.sides; i++) {
      const angle =
        ((i + (k % 2) * 0.5 + between(random, -0.16, 0.16)) / ring.sides) *
        TURN;
      const reach = k === 0 ? 1 : ring.at * between(random, 0.95, 1.05);
      list.push({
        p: polar(angle, reach),
        z: Math.sqrt(Math.max(0, 1 - reach * reach)),
        angle,
      });
    }
    return list;
  });
  /** @type {Face[]} */
  const faces = [];
  const faceOf = (/** @type {Corner[]} */ [a, b, c]) => ({
    points: [a.p, b.p, c.p],
    normal: normalOf([...a.p, a.z], [...b.p, b.z], [...c.p, c.z]),
  });
  for (let k = 0; k + 1 < corners.length; k++) {
    for (const triangle of zip(
      /** @type {Corner[]} */ (corners[k]),
      /** @type {Corner[]} */ (corners[k + 1]),
    )) {
      faces.push(faceOf(triangle));
    }
  }
  const last = /** @type {Corner[]} */ (corners.at(-1));
  /** @type {Corner} */
  const top = {
    p: [between(random, -0.05, 0.05), between(random, -0.05, 0.05)],
    z: 1,
    angle: 0,
  };
  last.forEach((corner, i) => {
    faces.push(
      faceOf([
        corner,
        /** @type {Corner} */ (last[(i + 1) % last.length]),
        top,
      ]),
    );
  });
  return faces;
}

/**
 * Returns the faces of a crater on a globe, each with the light on it: a
 * floor, a crescent of wall in shade on the side the light comes from, and
 * a lit crescent across the floor from it, which faces the light.
 *
 * @param {Point} at Its middle on the globe's disc, in units of its radius.
 * @param {number} r Its radius, in units of the globe's.
 * @param {number} turn
 * @returns {{ points: Point[], light: number }[]}
 */
function crater(at, r, turn) {
  /** @type {Vec3} */
  const out = [
    at[0],
    at[1],
    Math.sqrt(Math.max(0.01, 1 - at[0] * at[0] - at[1] * at[1])),
  ];
  const across = unitVector([-out[1], out[0], 0]);
  /** @type {Vec3} */
  const along = [
    out[1] * across[2] - out[2] * across[1],
    out[2] * across[0] - out[0] * across[2],
    out[0] * across[1] - out[1] * across[0],
  ];
  const sides = 14;
  /** A point of the crater on the globe's disc, at an angle and a share of its radius. */
  const on = (/** @type {number} */ angle, /** @type {number} */ share) =>
    /** @type {Point} */ ([
      out[0] +
        (across[0] * Math.cos(angle) + along[0] * Math.sin(angle)) * r * share,
      out[1] +
        (across[1] * Math.cos(angle) + along[1] * Math.sin(angle)) * r * share,
    ]);
  const lightWay = Math.hypot(LIGHT[0], LIGHT[1]);
  const ground = lightOn(out);
  /** How squarely the wall at an angle faces the light, from -1, turned from it, to 1. */
  const facing = (/** @type {number} */ angle) => {
    const [x, y] = on(angle, 1);
    return (
      (-(x - at[0]) * LIGHT[0] - (y - at[1]) * LIGHT[1]) /
      (Math.hypot(x - at[0], y - at[1]) * lightWay || 1)
    );
  };
  /** How far in the wall's foot lies at an angle: the wall is widest where it faces the light or turns from it. */
  const foot = (/** @type {number} */ angle) =>
    1 - 0.3 * Math.abs(facing(angle)) ** 1.5;
  /** @type {{ points: Point[], light: number }[]} */
  const faces = [];
  /** @type {Point[]} */
  const floor = [];
  for (let i = 0; i < sides; i++) {
    const from = turn + (i / sides) * TURN;
    const to = turn + ((i + 1) / sides) * TURN;
    const toward = facing((from + to) / 2);
    floor.push(on(from, foot(from)));
    if (Math.abs(toward) < 0.3) continue;
    faces.push({
      points: [on(from, 1), on(to, 1), on(to, foot(to)), on(from, foot(from))],
      light: clamp(ground + 0.5 * toward, 0.3, 1.12),
    });
  }
  faces.unshift({ points: floor, light: Math.max(0.32, ground - 0.07) });
  return faces;
}

/**
 * Returns a point on a tilted ring around a middle: a circle seen from the
 * side, so it shows as an ellipse.
 *
 * @param {Point} middle
 * @param {number} reach Its radius, in field units.
 * @param {number} squash Its height over its width as seen.
 * @param {number} tilt In radians.
 * @param {number} angle Where on it; from 0 to half a turn is its near side, which shows lower.
 * @returns {Point}
 */
function onRing(middle, reach, squash, tilt, angle) {
  const [x, y] = turned(
    [Math.cos(angle) * reach, Math.sin(angle) * reach * squash],
    tilt,
  );
  return [middle[0] + x, middle[1] + y];
}

/**
 * Returns a stretch of a band of a ring as a polygon, its outer edge and
 * then its inner edge back.
 *
 * @param {Point} middle
 * @param {[number, number]} reaches Its inner and outer radius, in field units.
 * @param {number} squash
 * @param {number} tilt
 * @param {[number, number]} span The angles it runs between.
 * @param {number} steps
 * @returns {Point[]}
 */
function bandOf(middle, [inner, outer], squash, tilt, [from, to], steps) {
  /** @type {Point[]} */
  const points = [];
  for (let i = 0; i <= steps; i++)
    points.push(onRing(middle, outer, squash, tilt, lerp(from, to, i / steps)));
  for (let i = steps; i >= 0; i--)
    points.push(onRing(middle, inner, squash, tilt, lerp(from, to, i / steps)));
  return points;
}

/**
 * Returns a jagged line between two points.
 *
 * @param {() => number} random
 * @param {Point} from
 * @param {Point} to
 * @param {number} steps
 * @param {number} sway How far a corner may stray, as a share of the line's length.
 * @returns {Point[]}
 */
function forked(random, from, to, steps, sway) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  /** @type {Point[]} */
  const points = [from];
  for (let i = 1; i < steps; i++) {
    const off = between(random, -sway, sway);
    points.push([
      from[0] + dx * (i / steps) - dy * off,
      from[1] + dy * (i / steps) + dx * off,
    ]);
  }
  points.push(to);
  return points;
}

/**
 * Returns the stars of a seed: where each lies, as shares of the field's
 * width and height, as many as the largest field holds, so a field reshaped
 * keeps them where they were and shows the first of them that fit its size.
 *
 * @param {number} seed
 * @returns {Record<Depth, Star[]>}
 */
export function starsOf(seed) {
  /** @type {Record<Depth, [number, number]>} */
  const sizes = { far: [0.055, 0.09], mid: [0.1, 0.15], bright: [0.13, 0.17] };
  const stars = /** @type {Record<Depth, Star[]>} */ ({
    far: [],
    mid: [],
    bright: [],
  });
  for (const depth of /** @type {Depth[]} */ (["far", "mid", "bright"])) {
    const random = seeded(seed * 31 + depth.length * 977);
    const count = Math.round((STARS_PER_AREA[depth] * MOST_AREA) / 1600);
    for (let i = 0; i < count; i++) {
      stars[depth].push({
        u: random(),
        v: random(),
        r: between(random, sizes[depth][0], sizes[depth][1]),
        shine: random(),
      });
    }
  }
  return stars;
}

/**
 * Returns how many stars of a depth a field of a size shows.
 *
 * @param {Depth} depth
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function starCount(depth, width, height) {
  return Math.round((STARS_PER_AREA[depth] * width * height) / 1600);
}

/**
 * The fuzzball of the constellation, as the game draws it in Endless: the
 * tips of every other strand of the brand mark's fur, then its two eyes, each
 * about the body's middle, as a share of the mark's size.
 */
const CONSTELLATION = {
  specks: /** @type {Point[]} */ ([
    [27.44, 19.45],
    [25.51, 23.99],
    [21.88, 27.54],
    [17.94, 28.95],
    [11.72, 28.48],
    [8.99, 25.83],
    [5.86, 22.29],
    [4.06, 17.4],
    [5.21, 12.52],
    [8.37, 7.82],
    [12.16, 6.54],
    [17.7, 3.93],
    [22.75, 6.65],
    [25.62, 10.78],
    [27.3, 14.07],
  ]).map(([x, y]) => /** @type {Point} */ ([(x - 16) / 32, (y - 17.2) / 32])),
  eyes: /** @type {Point[]} */ ([
    [13.4, 17],
    [20.6, 17],
  ]).map(([x, y]) => /** @type {Point} */ ([(x - 16) / 32, (y - 17.2) / 32])),
  /** How wide it is drawn, in field units, as `specks.ts` has it. */
  size: 10,
};

// --- The four places ----------------------------------------------------

/**
 * @typedef {object} Site What a place is built on.
 * @property {number} width
 * @property {number} height
 * @property {() => number} random Drawn from the sector alone, so its landmark is the same every run.
 * @property {() => number} strewn Drawn from the run's seed, for what is strewn afresh each run.
 */

/**
 * Returns a soft shape of the wash, laid by shares of the field and sized by
 * its short side, stretched the way the field is long.
 *
 * @param {Site} site
 * @param {number} u
 * @param {number} v
 * @param {number} reach Its radius, in short sides.
 * @param {Tint} tint
 * @param {number} strength
 * @param {number} [turn]
 * @returns {Soft}
 */
function washAt({ width, height }, u, v, reach, tint, strength, turn = 0) {
  return {
    is: "soft",
    at: [u * width, v * height],
    rx: reach * SHORT_SIDE * Math.sqrt(width / SHORT_SIDE),
    ry: reach * SHORT_SIDE * Math.sqrt(height / SHORT_SIDE),
    turn,
    tint,
    strength,
  };
}

/**
 * Returns the soft shapes of the wash that a landmark stands out of: two
 * round pools, sized by the field's short side, whatever the field's shape.
 * A landmark is cut out of the wash behind it: in a dark palette its shade
 * is a dark shape against the pool, and its lit side shows against the bare
 * field; in a light one its lit side is paper left dry in the pool, and its
 * shade shows against the bare paper. So the pool lies behind its shade in
 * the one, and behind its lit side in the other.
 *
 * @param {Point} shade The middle of the pool behind its shade, in field units.
 * @param {Point} lit The middle of the pool behind its lit side, in field units.
 * @param {number} reach The pools' radius, in short sides.
 * @param {Tint} tint
 * @param {number} strength
 * @returns {Soft[]}
 */
function poolsAt(shade, lit, reach, tint, strength) {
  const pool = {
    is: /** @type {const} */ ("soft"),
    rx: reach * SHORT_SIDE,
    ry: reach * SHORT_SIDE,
    turn: 0,
    tint,
    strength,
  };
  return [
    { ...pool, at: shade, shows: "dark" },
    { ...pool, at: lit, shows: "light" },
  ];
}

/**
 * Returns a globe's faces as a landmark's, about a middle.
 *
 * @param {{ points: Point[], normal?: Vec3, light?: number }[]} faces Each with the way it faces, or the light on it.
 * @param {Point} middle
 * @param {number} radius
 * @param {Tint} tint
 * @param {boolean} [fine]
 * @returns {Flat[]}
 */
function flatsOf(faces, middle, radius, tint, fine = false) {
  return faces.map(({ points, normal, light }) => ({
    is: "flat",
    points: points.map(
      ([x, y]) =>
        /** @type {Point} */ ([middle[0] + x * radius, middle[1] + y * radius]),
    ),
    light: light ?? lightOn(normal ?? [0, 0, 1]),
    tint,
    ...(fine ? { fine } : {}),
  }));
}

/**
 * Returns the Inner belt: a ringed planet's limb low in the right corner,
 * its lit shoulder toward the field, in a warm, calm wash.
 *
 * @param {Site} site
 * @returns {Pick<Backdrop, "wash" | "landmark" | "air" | "wind" | "vignette" | "starTint">}
 */
function innerBelt(site) {
  const { width, height, random, strewn } = site;
  const S = SHORT_SIDE;
  /** @type {Point} */
  const middle = [width - 0.36 * S, height + 0.14 * S];
  const radius = 0.5 * S;
  const tilt = (16 / 360) * TURN;
  const squash = 0.26;
  /** @type {Mark[]} */
  const landmark = [];
  // The far side of the rings, which the planet hides where it stands before them.
  /** @type {[number, number, number][]} */
  const bands = [
    [1.34, 1.5, 0.62],
    [1.55, 1.94, 1.04],
    [1.99, 2.2, 0.8],
  ];
  for (const [inner, outer, light] of bands) {
    landmark.push({
      is: "flat",
      points: bandOf(
        middle,
        [inner * radius, outer * radius],
        squash,
        tilt,
        [TURN / 2, TURN],
        26,
      ),
      light,
      tint: "ice",
    });
  }
  landmark.push(
    ...flatsOf(
      globe(random, [
        { at: 1, sides: 30 },
        { at: 0.84, sides: 12 },
        { at: 0.56, sides: 8 },
        { at: 0.26, sides: 4 },
      ]),
      middle,
      radius,
      "stone",
    ),
  );
  for (const [inner, outer, light] of bands) {
    landmark.push({
      is: "flat",
      points: bandOf(
        middle,
        [inner * radius, outer * radius],
        squash,
        tilt,
        [0, TURN / 2],
        26,
      ),
      light,
      tint: "ice",
    });
  }
  /** @type {Mark[]} */
  const air = [];
  const motes = Math.round((20 * width * height) / 2880);
  for (let i = 0; i < motes; i++) {
    const r = between(strewn, 0.2, 0.42);
    air.push({
      is: "soft",
      at: [strewn() * width, strewn() * height],
      rx: r,
      ry: r,
      turn: 0,
      tint: "stone",
      strength: between(strewn, 0.45, 0.9),
      small: true,
    });
  }
  return {
    wash: [
      ...poolsAt(
        [width + 0.12 * S, height - 0.08 * S],
        [width - 0.62 * S, height - 0.12 * S],
        0.8,
        "accent",
        0.9,
      ),
      washAt(site, 0.14, 0.14, 0.7, "ice", 0.7),
      washAt(site, 0.4, 0.62, 0.45, "crystal", 0.3),
    ],
    landmark,
    air,
    wind: [-0.25, 0.06],
    vignette: { depth: 0.18 * S, tint: "accent", strength: 0.6 },
    starTint: "stone",
  };
}

/**
 * Returns the Iron reach: a cold, cratered moon on the right edge, the
 * broken spans of a girder ring around it, in a steel wash with dark pools.
 *
 * @param {Site} site
 * @returns {Pick<Backdrop, "wash" | "landmark" | "air" | "wind" | "vignette" | "starTint">}
 */
function ironReach(site) {
  const { width, height, random, strewn } = site;
  const S = SHORT_SIDE;
  /** @type {Point} */
  const middle = [width - 0.04 * S, 0.33 * S];
  const radius = 0.44 * S;
  const tilt = (-14 / 360) * TURN;
  const squash = 0.3;
  const reaches = /** @type {[number, number]} */ ([
    1.42 * radius,
    1.6 * radius,
  ]);
  const spans = 16;
  /** @type {Mark[]} */
  const far = [];
  /** @type {Mark[]} */
  const near = [];
  for (let i = 0; i < spans; i++) {
    // The ring is broken: some spans are gone, and one beside a gap has drifted loose.
    const gone = random() < 0.3;
    const loose = random() < 0.3;
    const lean = loose ? between(random, -0.18, 0.18) : 0;
    const drift = loose ? between(random, -0.06, 0.12) * radius : 0;
    if (gone) continue;
    const from = ((i + 0.08) / spans) * TURN;
    const to = ((i + 0.92) / spans) * TURN;
    const side = (from + to) / 2 < TURN / 2 ? near : far;
    const about = onRing(
      middle,
      (reaches[0] + reaches[1]) / 2,
      squash,
      tilt,
      (from + to) / 2,
    );
    const away = Math.hypot(about[0] - middle[0], about[1] - middle[1]) || 1;
    const moved = (/** @type {Point} */ p) => {
      const [x, y] = turned([p[0] - about[0], p[1] - about[1]], lean);
      return /** @type {Point} */ ([
        about[0] + x + ((about[0] - middle[0]) / away) * drift,
        about[1] + y + ((about[1] - middle[1]) / away) * drift,
      ]);
    };
    const corners = [
      onRing(middle, reaches[1], squash, tilt, from),
      onRing(middle, reaches[1], squash, tilt, to),
      onRing(middle, reaches[0], squash, tilt, to),
      onRing(middle, reaches[0], squash, tilt, from),
    ].map(moved);
    // A span catches the light by how it lies around the ring.
    const light =
      0.74 + 0.32 * Math.max(0, -Math.cos((from + to) / 2 - tilt + 0.9));
    side.push({ is: "flat", points: corners, light, tint: "iron" });
    // Its lacing: a chord along each edge, and struts between them.
    const bays = 4;
    /** @type {Point[]} */
    const lacing = [];
    for (let b = 0; b <= bays; b++) {
      lacing.push(
        moved(
          onRing(
            middle,
            reaches[b % 2 ? 0 : 1],
            squash,
            tilt,
            lerp(from, to, b / bays),
          ),
        ),
      );
    }
    side.push({
      is: "line",
      points: [...corners, /** @type {Point} */ (corners[0])],
      width: 0.11,
      tint: "iron",
      strength: 0.8,
      fine: true,
    });
    side.push({
      is: "line",
      points: lacing,
      width: 0.08,
      tint: "iron",
      strength: 0.6,
      fine: true,
    });
  }
  const faces = globe(random, [
    { at: 1, sides: 28 },
    { at: 0.82, sides: 11 },
    { at: 0.52, sides: 7 },
    { at: 0.24, sides: 4 },
  ]);
  /** @type {Mark[]} */
  const moon = flatsOf(faces, middle, radius, "iron");
  // Two craters wider than a boulder, and pits smaller than a small rock, so none is taken for one.
  /** @type {[number, number, number][]} */
  const craters = [
    [-0.5, -0.2, 0.27],
    [-0.26, 0.52, 0.3],
    [-0.14, -0.52, 0.045],
    [-0.76, 0.12, 0.04],
    [-0.62, 0.6, 0.045],
    [-0.04, 0.16, 0.04],
    [-0.86, -0.3, 0.035],
  ];
  for (const [x, y, r] of craters) {
    moon.push(
      ...flatsOf(
        crater([x, y], r, between(random, 0, TURN)),
        middle,
        radius,
        "iron",
        r < 0.1,
      ),
    );
  }
  /** @type {Mark[]} */
  const air = [];
  // Filings: tiny glints strewn along the lines of the moon's field.
  const glints = Math.round((30 * width * height) / 2880);
  for (let i = 0, tries = 0; i < glints && tries < 600; tries++) {
    const reach =
      pick(strewn, [0.95, 1.3, 1.7]) * S + between(strewn, -1.6, 1.6);
    const at = polar(between(strewn, 0, TURN), reach, middle);
    if (at[0] < 0 || at[0] > width || at[1] < 0 || at[1] > height) continue;
    const r = between(strewn, 0.13, 0.24);
    air.push({
      is: "flat",
      points: [
        [at[0], at[1] - r],
        [at[0] + r * 0.7, at[1]],
        [at[0], at[1] + r],
        [at[0] - r * 0.7, at[1]],
      ],
      light: between(strewn, 0.75, 1.1),
      tint: "iron",
      small: true,
    });
    i++;
  }
  return {
    wash: [
      ...poolsAt(
        [width - 0.02 * S, 0.82 * S],
        [width - 0.3 * S, 0.16 * S],
        0.74,
        "iron",
        0.9,
      ),
      washAt(site, 0.14, 0.8, 0.72, "deep", 0.9),
      washAt(site, 0.26, 0.14, 0.42, "lodestone", 0.42),
      washAt(site, 0.6, 0.94, 0.45, "ice", 0.35),
    ],
    landmark: [...far, ...moon, ...near],
    air,
    wind: [0.08, 0.12],
    vignette: { depth: 0.18 * S, tint: "iron", strength: 0.6 },
    starTint: "ice",
  };
}

/**
 * Returns the Storm: a thunderhead towering up the field's left side, dim
 * forks of lightning inside it, in an ember and violet wash crossed by wind.
 *
 * @param {Site} site
 * @returns {Pick<Backdrop, "wash" | "landmark" | "air" | "wind" | "vignette" | "starTint">}
 */
function storm(site) {
  const { width, height, random, strewn } = site;
  const S = SHORT_SIDE;
  /** A place in the cloud, across and up from the field's lower left corner, in short sides. */
  const at = (/** @type {number} */ x, /** @type {number} */ up) =>
    /** @type {Point} */ ([x * S, height - up * S]);
  /** A bank of billows, each across, up, and half its width and height in short sides. */
  const bank = (/** @type {[number, number, number, number][]} */ shapes) =>
    /** @type {Bank} */ ({
      is: "bank",
      billows: shapes.map(([x, up, rx, ry]) => ({
        at: at(
          x + between(random, -0.015, 0.015),
          up + between(random, -0.015, 0.015),
        ),
        rx: rx * S,
        ry: ry * S,
        turn: between(random, -9, 9),
      })),
      tint: "crystal",
      rim: 0.022 * S,
    });
  // Its billows, back to front: its anvil, which a wide field's top cuts
  // off, then down its tower, each lower billow standing before the one
  // above it.
  /** @type {Mark[]} */
  const landmark = [
    bank([
      [0.86, 1.03, 0.12, 0.055],
      [0.68, 1.02, 0.17, 0.075],
      [0.47, 1.0, 0.19, 0.09],
      [0.25, 1.02, 0.2, 0.1],
      [0.02, 0.97, 0.22, 0.12],
      [0.2, 0.84, 0.21, 0.15],
      [0.04, 0.8, 0.17, 0.14],
      [0.3, 0.7, 0.17, 0.13],
      [0.12, 0.64, 0.22, 0.16],
      [0.02, 0.52, 0.16, 0.14],
      [0.26, 0.5, 0.19, 0.14],
      [0.13, 0.38, 0.24, 0.17],
    ]),
  ];
  // Its foot, which stands before the forks inside it.
  /** @type {Mark[]} */
  const front = [
    bank([
      [0.36, 0.3, 0.15, 0.11],
      [0.02, 0.22, 0.24, 0.17],
      [0.3, 0.16, 0.24, 0.15],
      [0.56, 0.08, 0.22, 0.12],
      [0.1, 0.04, 0.3, 0.14],
      [0.42, 0.0, 0.26, 0.1],
      [0.8, -0.02, 0.22, 0.08],
    ]),
  ];
  // Forks of lightning inside the tower, each with the glow it throws on the cloud around it.
  /** @type {[Point, Point, Flicker][]} */
  const forks = [
    [at(0.24, 0.92), at(0.31, 0.4), { every: 11, after: 4.2 }],
    [at(0.07, 0.74), at(0.13, 0.26), { every: 17, after: 9.5 }],
  ];
  for (const [from, to, flicker] of forks) {
    landmark.push({
      is: "soft",
      at: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2],
      rx: 0.2 * S,
      ry: 0.26 * S,
      turn: 10,
      tint: "spark",
      strength: 0.25,
      flicker,
    });
    const trunk = forked(random, from, to, 7, 0.09);
    landmark.push({
      is: "line",
      points: trunk,
      width: 0.16,
      tint: "spark",
      strength: 0.55,
      flicker,
    });
    for (const k of [2, 4]) {
      const start = /** @type {Point} */ (trunk[k]);
      const end = /** @type {Point} */ ([
        start[0] + between(random, 0.08, 0.16) * S * (k === 2 ? 1 : -1),
        start[1] + between(random, 0.08, 0.14) * S,
      ]);
      landmark.push({
        is: "line",
        points: forked(random, start, end, 4, 0.14),
        width: 0.1,
        tint: "spark",
        strength: 0.4,
        fine: true,
        flicker,
      });
    }
  }
  /** @type {Mark[]} */
  const air = [];
  const streaks = Math.round((15 * width * height) / 2880);
  for (let i = 0; i < streaks; i++) {
    air.push({
      is: "streak",
      at: [strewn() * width, strewn() * height],
      length: between(strewn, 9, 19),
      width: between(strewn, 0.06, 0.11),
      turn: -13 + between(strewn, -2.5, 2.5),
      tint: pick(strewn, /** @type {Tint[]} */ (["text", "text", "crystal"])),
      strength: between(strewn, 0.5, 1),
    });
  }
  return {
    wash: [
      washAt(site, 0.82, 0.88, 0.74, "volatile", 0.85),
      ...poolsAt(at(0.52, 0.5), at(0.2, 0.52), 0.72, "crystal", 0.85),
      washAt(site, 0.98, 0.1, 0.5, "danger", 0.55),
      washAt(site, 0.56, 0.56, 0.42, "deep", 0.8),
    ],
    landmark: [...landmark, ...front],
    air,
    wind: [0.9, -0.21],
    vignette: { depth: 0.18 * S, tint: "crystal", strength: 0.6 },
    starTint: "volatile",
  };
}

/**
 * Returns Endless: the pale band of a galaxy from corner to corner, a dark
 * lane down it, with the wave's constellation over it.
 *
 * @param {Site} site
 * @returns {Pick<Backdrop, "wash" | "landmark" | "air" | "wind" | "vignette" | "starTint">}
 */
function endless(site) {
  const { width, height, random, strewn } = site;
  const S = SHORT_SIDE;
  const reach = Math.hypot(width, height);
  /** @type {Point} */
  const along = [width / reach, -height / reach];
  /** @type {Point} */
  const across = [height / reach, width / reach];
  const turn = (Math.atan2(-height, width) * 360) / TURN;
  /** A place along the band and across it, in field units from the field's middle. */
  const at = (/** @type {number} */ a, /** @type {number} */ b) =>
    /** @type {Point} */ ([
      width / 2 + along[0] * a + across[0] * b,
      height / 2 + along[1] * a + across[1] * b,
    ]);
  /** @type {Mark[]} */
  const landmark = [
    {
      is: "soft",
      at: at(0, 0),
      rx: 0.62 * reach,
      ry: 0.3 * S,
      turn,
      tint: "violet",
      strength: 0.42,
    },
    {
      is: "soft",
      at: at(0, 0.01 * S),
      rx: 0.52 * reach,
      ry: 0.14 * S,
      turn,
      tint: "text",
      strength: 0.42,
    },
    {
      is: "soft",
      at: at(-0.14 * reach, 0),
      rx: 0.34 * S,
      ry: 0.19 * S,
      turn,
      tint: "text",
      strength: 0.16,
    },
    {
      is: "soft",
      at: at(0.02 * reach, 0.04 * S),
      rx: 0.44 * reach,
      ry: 0.036 * S,
      turn,
      tint: "deep",
      strength: 0.9,
    },
  ];
  // The band's own stars, thick down its middle and thinning to its edges.
  const crowd = Math.round((120 * reach) / 82);
  for (let i = 0; i < crowd; i++) {
    const a = between(random, -0.56, 0.56) * reach;
    const b = (random() + random() + random() - 1.5) * 0.15 * S;
    const [x, y] = at(a, b);
    if (x < 0 || x > width || y < 0 || y > height) continue;
    const mid = random() < 0.4;
    landmark.push({
      is: "speck",
      at: [x, y],
      r: mid ? between(random, 0.1, 0.13) : between(random, 0.065, 0.095),
      depth: mid ? "mid" : "far",
    });
  }
  // The constellation, somewhere new each wave, as far in from every edge as it is wide.
  const margin = CONSTELLATION.size / SHORT_SIDE;
  /** @type {Point} */
  const home = [
    (margin + strewn() * (1 - 2 * margin)) * width,
    (margin + strewn() * (1 - 2 * margin)) * height,
  ];
  const placed = (/** @type {Point} */ [x, y]) =>
    /** @type {Point} */ ([
      home[0] + x * CONSTELLATION.size,
      home[1] + y * CONSTELLATION.size,
    ]);
  const specks = CONSTELLATION.specks.map(placed);
  landmark.push({
    is: "line",
    points: [...specks, /** @type {Point} */ (specks[0])],
    width: 0.07,
    tint: "muted",
    strength: 0.55,
    fine: true,
  });
  for (const speck of specks)
    landmark.push({ is: "speck", at: speck, r: 0.15, depth: "mid" });
  for (const eye of CONSTELLATION.eyes.map(placed))
    landmark.push({ is: "speck", at: eye, r: 0.2, depth: "bright" });
  /** @type {Mark[]} */
  const air = [];
  // A few galaxies farther off still, each a smudge.
  const smudges = Math.round((6 * width * height) / 2880);
  for (let i = 0; i < smudges; i++) {
    const r = between(strewn, 0.45, 0.8);
    air.push({
      is: "soft",
      at: [strewn() * width, strewn() * height],
      rx: r,
      ry: r * between(strewn, 0.3, 0.5),
      turn: between(strewn, 0, 180),
      tint: pick(strewn, /** @type {Tint[]} */ (["text", "violet", "blue"])),
      strength: between(strewn, 0.6, 1),
      small: true,
    });
  }
  return {
    wash: [
      washAt(site, 0.14, 0.18, 0.75, "deep", 1),
      washAt(site, 0.86, 0.84, 0.75, "deep", 1),
      washAt(site, 0.78, 0.2, 0.5, "blue", 0.5),
      washAt(site, 0.2, 0.82, 0.5, "violet", 0.45),
    ],
    landmark,
    air,
    wind: [0.04, 0.02],
    vignette: { depth: 0.18 * S, tint: "violet", strength: 0.6 },
    starTint: "violet",
  };
}

const PLACES = {
  "inner-belt": innerBelt,
  "iron-reach": ironReach,
  storm,
  endless,
};

/**
 * Returns a sector's backdrop for a field of a size, from a run's seed, as
 * plain data in field units. The landmark and the wash are the sector's
 * own, the same every run; the seed strews the stars and the air, and, in
 * Endless, lays the constellation.
 *
 * @param {{ sector: Sector, width: number, height: number, seed?: number }} field
 * @returns {Backdrop}
 */
export function makeBackdrop({ sector, width, height, seed = 1 }) {
  const site = {
    width,
    height,
    random: seeded(SECTORS.indexOf(sector) * 7919 + 101),
    strewn: seeded(seed * 613 + SECTORS.indexOf(sector) * 37 + 5),
  };
  return {
    sector,
    width,
    height,
    stars: starsOf(seed),
    ...PLACES[sector](site),
  };
}

// --- Drawing ------------------------------------------------------------

/**
 * Returns how far into a flicker a mark is at a time: two quick blinks and a
 * fade, a third of a second in all, every so often. At time 0, its still
 * form, nothing flickers.
 *
 * @param {Flicker | undefined} flicker
 * @param {number} time In seconds.
 * @returns {number} From 0, at rest, to 1, at its brightest.
 */
export function flickerAt(flicker, time) {
  if (!flicker || time <= 0) return 0;
  const since =
    (((time - flicker.after) % flicker.every) + flicker.every) % flicker.every;
  if (since < 0.05) return since / 0.05;
  if (since < 0.11) return lerp(1, 0.25, (since - 0.05) / 0.06);
  if (since < 0.16) return lerp(0.25, 0.85, (since - 0.11) / 0.05);
  if (since < 0.36) return lerp(0.85, 0, (since - 0.16) / 0.2);
  return 0;
}

/**
 * Returns a mark drawn in a palette, in pixels.
 *
 * @param {Mark} mark
 * @param {Palette} palette
 * @param {number} px The pixels a field unit takes.
 * @param {number} time
 * @param {Tint} starTint
 * @param {"wash" | "landmark"} layer Whose limit its soft shapes are held to.
 * @returns {string}
 */
function markSvg(mark, palette, px, time, starTint, layer) {
  if ("fine" in mark && mark.fine && px < FINE_FROM) return "";
  if ("shows" in mark && mark.shows && mark.shows !== palette.mode) return "";
  switch (mark.is) {
    case "soft": {
      const lift = 1 + 1.2 * flickerAt(mark.flicker, time);
      const share =
        shareOf(
          mark.tint,
          mark.strength,
          mark.small ? "small" : layer,
          palette,
        ) * lift;
      const [x, y] = [mark.at[0] * px, mark.at[1] * px];
      return `<ellipse${attrs({
        cx: x,
        cy: y,
        rx: mark.rx * px,
        ry: mark.ry * px,
        fill: `url(#${gradientId(palette, mark.tint, "bell")})`,
        opacity: share.toFixed(3),
        transform: mark.turn
          ? `rotate(${num(mark.turn)} ${num(x)} ${num(y)})`
          : undefined,
      })}/>`;
    }
    case "flat": {
      const fill = mark.small
        ? mix(
            palette.field,
            hardOther(mark.tint, palette),
            LIMITS[palette.mode].small * clamp(mark.light, 0.4, 1.1),
          )
        : toneUnder(mark.light, hardTones(mark.tint, palette));
      const points = mark.points.map(
        ([x, y]) => /** @type {Point} */ ([x * px, y * px]),
      );
      return `<polygon points="${pointsOf(points)}"${attrs({
        fill,
        ...(mark.small
          ? {}
          : { stroke: fill, "stroke-width": 0.5, "stroke-linejoin": "round" }),
      })}/>`;
    }
    case "line": {
      const lift = 1 + 1.2 * flickerAt(mark.flicker, time);
      const share = Math.min(
        0.5,
        shareOf(mark.tint, mark.strength, "line", palette) * lift,
      );
      const points = mark.points.map(
        ([x, y]) => /** @type {Point} */ ([x * px, y * px]),
      );
      return `<polyline points="${pointsOf(points)}"${attrs({
        fill: "none",
        stroke: hardOther(mark.tint, palette),
        "stroke-opacity": share.toFixed(3),
        "stroke-width": Math.max(0.6, mark.width * px),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      })}/>`;
    }
    case "bank": {
      // In a dark palette a billow is a dark mass with a rim of its tint
      // toward the light; in a light one it is paper left dry, with a rim of
      // its tint in its shade, and a wider, fainter shade under the whole
      // bank. A rim is one flat color, the field with the landmark's limit
      // of the tint, so rims that cross never add up past it. Each billow
      // hides what lies behind it, the stars too.
      const dark = palette.mode === "dark";
      const body = `url(#${gradientId(palette, "cloud", "billow")})`;
      const rim = `url(#${gradientId(palette, mark.tint, "rim")})`;
      const drawn = (
        /** @type {Bank["billows"][number]} */ { at, rx, ry, turn },
        /** @type {number} */ rims,
        /** @type {string} */ fill,
      ) => {
        const x = (at[0] + rims * mark.rim) * px;
        const y = (at[1] + rims * mark.rim) * px;
        return `<ellipse${attrs({
          cx: x,
          cy: y,
          rx: rx * px,
          ry: ry * px,
          fill,
          transform: turn
            ? `rotate(${num(turn)} ${num(x)} ${num(y)})`
            : undefined,
        })}/>`;
      };
      const shade = dark
        ? ""
        : `<g opacity="0.45">${mark.billows.map((billow) => drawn(billow, 3.4, rim)).join("")}</g>`;
      return (
        shade +
        mark.billows
          .map(
            (billow) =>
              drawn(billow, dark ? -1 : 1.5, rim) + drawn(billow, 0, body),
          )
          .join("")
      );
    }
    case "speck":
      return `<circle${attrs({
        cx: mark.at[0] * px,
        cy: mark.at[1] * px,
        r: Math.max(0.55, mark.r * px),
        fill: starColor(mark.depth, starTint, palette),
      })}/>`;
    case "streak": {
      const [x, y] = [mark.at[0] * px, mark.at[1] * px];
      const thick = Math.max(0.7, mark.width * px);
      return `<rect${attrs({
        x: x - (mark.length * px) / 2,
        y: y - thick / 2,
        width: mark.length * px,
        height: thick,
        fill: `url(#${gradientId(palette, mark.tint, "streak")})`,
        opacity: shareOf(mark.tint, mark.strength, "line", palette).toFixed(3),
        transform: `rotate(${num(mark.turn)} ${num(x)} ${num(y)})`,
      })}/>`;
    }
  }
}

/**
 * Returns the color a hard mark's tint mixes into the field: the ink's lit
 * tone in a dark palette, its deep tone in a light one.
 *
 * @param {Tint} tint
 * @param {Palette} palette
 * @returns {string}
 */
function hardOther(tint, palette) {
  const ink = tintOf(tint, palette);
  return palette.mode === "dark"
    ? mix(ink, "#ffffff", 0.42)
    : mix(ink, palette.fieldText, 0.52);
}

/**
 * Returns a number wrapped into a span from 0.
 *
 * @param {number} value
 * @param {number} span
 * @returns {number}
 */
function wrap(value, span) {
  return ((value % span) + span) % span;
}

/**
 * Returns the stars of a backdrop drawn in a palette: the far ones as they
 * lie, the nearer ones slid against the ship's travel, wrapped as the field
 * wraps.
 *
 * @param {Backdrop} backdrop
 * @param {Palette} palette
 * @param {number} px
 * @param {Point} travel
 * @returns {string}
 */
function starsSvg(backdrop, palette, px, travel) {
  const { width, height, stars, starTint } = backdrop;
  const parts = [];
  for (const depth of /** @type {Depth[]} */ (["far", "mid", "bright"])) {
    const color = starColor(depth, starTint, palette);
    const shown = stars[depth].slice(0, starCount(depth, width, height));
    /** @type {string[][]} */
    const byShine = [[], [], []];
    for (const star of shown) {
      const x = wrap(star.u * width - travel[0] * PARALLAX[depth], width) * px;
      const y =
        wrap(star.v * height - travel[1] * PARALLAX[depth], height) * px;
      const r = Math.max(depth === "far" ? 0.55 : 0.8, star.r * px);
      const drawn = [
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${num(r)}"/>`,
      ];
      if (depth === "bright") {
        // A glint of four points, thin, never longer than a small rock is wide.
        const reach = Math.max(2.2, lerp(0.42, 0.62, star.shine) * px);
        const waist = Math.max(0.5, r * 0.34);
        drawn.unshift(
          `<polygon opacity="0.6" points="${pointsOf([
            [x, y - reach],
            [x + waist, y - waist],
            [x + reach, y],
            [x + waist, y + waist],
            [x, y + reach],
            [x - waist, y + waist],
            [x - reach, y],
            [x - waist, y - waist],
          ])}"/>`,
        );
      }
      /** @type {string[]} */ (
        byShine[
          depth === "bright" ? 2 : Math.min(2, Math.floor(star.shine * 3))
        ]
      ).push(...drawn);
    }
    byShine.forEach((drawn, i) => {
      if (drawn.length)
        parts.push(
          `<g fill="${color}" opacity="${[0.62, 0.82, 1][i]}">${drawn.join("")}</g>`,
        );
    });
  }
  return parts.join("");
}

/**
 * Returns the vignette of a backdrop drawn in a palette: a strip along each
 * edge, strongest at the edge, darker than the field in a dark palette and a
 * faint tint of the sector in a light one.
 *
 * @param {Backdrop} backdrop
 * @param {Palette} palette
 * @param {number} px
 * @returns {string}
 */
function vignetteSvg(backdrop, palette, px) {
  const { width, height, vignette } = backdrop;
  const tint = palette.mode === "dark" ? "deep" : vignette.tint;
  const opacity = shareOf(tint, vignette.strength, "wash", palette).toFixed(3);
  const w = width * px;
  const h = height * px;
  const d = vignette.depth * px;
  const fill = (/** @type {string} */ edge) =>
    `url(#${gradientId(palette, tint, edge)})`;
  return [
    `<rect${attrs({ x: 0, y: 0, width: w, height: d, fill: fill("top"), opacity })}/>`,
    `<rect${attrs({ x: 0, y: h - d, width: w, height: d, fill: fill("bottom"), opacity })}/>`,
    `<rect${attrs({ x: 0, y: 0, width: d, height: h, fill: fill("left"), opacity })}/>`,
    `<rect${attrs({ x: w - d, y: 0, width: d, height: h, fill: fill("right"), opacity })}/>`,
  ].join("");
}

/**
 * Returns each layer of a sector's backdrop drawn in a palette, from the
 * field's top left corner, in pixels. Its marks reach past the field's
 * edges, so whatever shows it clips it to the field, as the game's camera
 * does and `fieldSvg()` does here.
 *
 * @param {BackdropOptions} options
 * @param {Palette} palette
 * @returns {Record<BackdropLayer, string>}
 */
export function backdropLayers(
  { sector, width, height, unit: px, seed = 1, time = 0, travel = [0, 0] },
  palette,
) {
  const backdrop = makeBackdrop({ sector, width, height, seed });
  const drawn = (
    /** @type {Mark[]} */ marks,
    /** @type {"wash" | "landmark"} */ layer,
  ) =>
    marks
      .map((mark) => markSvg(mark, palette, px, time, backdrop.starTint, layer))
      .join("");
  // The air drifts on the sector's wind, and slides against the ship's travel as the near stars do.
  const drift = /** @type {Point} */ ([
    backdrop.wind[0] * time - travel[0] * PARALLAX.air,
    backdrop.wind[1] * time - travel[1] * PARALLAX.air,
  ]);
  const air = backdrop.air.map((mark) => {
    if (mark.is !== "soft" && mark.is !== "streak" && mark.is !== "flat")
      return mark;
    if (mark.is === "flat") {
      const first = /** @type {Point} */ (mark.points[0]);
      const dx = wrap(first[0] + drift[0], width) - first[0];
      const dy = wrap(first[1] + drift[1], height) - first[1];
      return {
        ...mark,
        points: mark.points.map(
          ([x, y]) => /** @type {Point} */ ([x + dx, y + dy]),
        ),
      };
    }
    return {
      ...mark,
      at: /** @type {Point} */ ([
        wrap(mark.at[0] + drift[0], width),
        wrap(mark.at[1] + drift[1], height),
      ]),
    };
  });
  return {
    wash: drawn(backdrop.wash, "wash"),
    stars: starsSvg(backdrop, palette, px, travel),
    landmark: drawn(backdrop.landmark, "landmark"),
    air: drawn(air, "landmark"),
    vignette: vignetteSvg(backdrop, palette, px),
  };
}

/**
 * Returns a sector's backdrop drawn in a palette, from the field's top left
 * corner, in pixels, over nothing: the field's own color goes under it. It
 * needs `backdropDefs()` of the same palette in the file's defs, and
 * clipping to the field, which `fieldSvg()` does.
 *
 * @param {BackdropOptions} options
 * @param {Palette} palette
 * @returns {string}
 */
export function backdropSvg(options, palette) {
  const layers = backdropLayers(options, palette);
  return (options.layers ?? BACKDROP_LAYERS)
    .map((layer) => layers[layer])
    .join("");
}

/**
 * Returns the backdrop the game draws today, for comparison: the field's
 * flat color under specks of one size, three dozen for each 1,600 units², a
 * third of the field's muted text.
 *
 * @param {{ width: number, height: number, unit: number, seed?: number }} field
 * @param {Palette} palette
 * @returns {string}
 */
export function todayBackdropSvg(
  { width, height, unit: px, seed = 1 },
  palette,
) {
  const random = seeded(seed);
  const count = Math.round((36 * width * height) / 1600);
  const specks = [];
  for (let i = 0; i < count; i++) {
    specks.push(
      `<circle cx="${(random() * width * px).toFixed(1)}" cy="${(random() * height * px).toFixed(1)}" r="${num(0.18 * px)}"/>`,
    );
  }
  return `<g fill="${mix(palette.field, palette.fieldMuted, 1 / 3)}">${specks.join("")}</g>`;
}

/**
 * Returns drawings clipped to a field: a rectangle in the palette's field
 * color at a place, with what is drawn from its top left corner inside it.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width In pixels.
 * @param {number} height In pixels.
 * @param {string} inner
 * @param {Palette} palette
 * @returns {string}
 */
export function fieldSvg(x, y, width, height, inner, palette) {
  return [
    `<svg${attrs({ x, y, width, height, viewBox: `0 0 ${num(width)} ${num(height)}`, overflow: "hidden" })}>`,
    `<rect${attrs({ x: 0, y: 0, width, height, fill: palette.field })}/>`,
    inner,
    "</svg>",
  ].join("");
}

/**
 * @typedef {object} GradientShape How a kind of gradient fades, and the tints the places draw with it.
 * @property {[number, number][]} stops Each an offset and how much of the tint shows there.
 * @property {readonly Tint[]} tints
 * @property {string} [way] A linear gradient's ends; a round gradient has none.
 * @property {boolean} [mixed] Whether its color is no tint alone but the field with the landmark's limit of the tint, to be drawn whole.
 */

/** @type {[number, number][]} */
const EDGE_STOPS = [
  [0, 1],
  [0.25, 0.62],
  [0.5, 0.3],
  [0.75, 0.1],
  [1, 0],
];

/** @type {[number, number][]} */
const BILLOW_STOPS = [
  [0, 1],
  [0.7, 1],
  [0.82, 0.74],
  [0.91, 0.34],
  [0.97, 0.08],
  [1, 0],
];

/** The tints a vignette is drawn in: the page's, in a dark palette, and each sector's own, in a light one. */
const EDGE_TINTS = /** @type {Tint[]} */ ([
  "deep",
  "accent",
  "iron",
  "crystal",
  "violet",
]);

/**
 * The gradients the backdrops are drawn with: a round one that fades evenly
 * from its middle, for every tint; a round one that holds flat and fades at
 * its edge, for a billow of cloud, and one like it for a billow's rim; one
 * that fades at both ends, for a streak of wind; and one for each edge's
 * strip of the vignette. A place that draws with a tint not listed here
 * fails, in `gradientId()`.
 *
 * @type {Record<string, GradientShape>}
 */
const GRADIENTS = {
  bell: {
    stops: [
      [0, 1],
      [0.15, 0.94],
      [0.3, 0.78],
      [0.45, 0.57],
      [0.6, 0.35],
      [0.75, 0.16],
      [0.88, 0.05],
      [1, 0],
    ],
    tints: TINTS,
  },
  billow: { stops: BILLOW_STOPS, tints: ["cloud"] },
  rim: { stops: BILLOW_STOPS, tints: ["crystal"], mixed: true },
  streak: {
    stops: [
      [0, 0],
      [0.3, 0.7],
      [0.5, 1],
      [0.7, 0.7],
      [1, 0],
    ],
    tints: ["text", "crystal"],
    way: `x1="0" y1="0" x2="1" y2="0"`,
  },
  top: {
    stops: EDGE_STOPS,
    tints: EDGE_TINTS,
    way: `x1="0" y1="0" x2="0" y2="1"`,
  },
  bottom: {
    stops: EDGE_STOPS,
    tints: EDGE_TINTS,
    way: `x1="0" y1="1" x2="0" y2="0"`,
  },
  left: {
    stops: EDGE_STOPS,
    tints: EDGE_TINTS,
    way: `x1="0" y1="0" x2="1" y2="0"`,
  },
  right: {
    stops: EDGE_STOPS,
    tints: EDGE_TINTS,
    way: `x1="1" y1="0" x2="0" y2="0"`,
  },
};

/**
 * Returns the name of a palette's gradient of a shape for a tint.
 *
 * @param {Palette} palette
 * @param {Tint} tint
 * @param {string} shape
 * @returns {string}
 * @throws {RangeError} for a gradient `backdropDefs()` doesn't write.
 */
function gradientId(palette, tint, shape) {
  if (!GRADIENTS[shape]?.tints.includes(tint))
    throw new RangeError(`No ${shape} gradient is written for ${tint}.`);
  return `backdrop-${palette.id}-${tint}-${shape}`;
}

/**
 * Returns the gradients the backdrops are drawn with in a palette, for a
 * file's defs.
 *
 * @param {Palette} palette
 * @returns {string}
 */
export function backdropDefs(palette) {
  return Object.entries(GRADIENTS)
    .flatMap(([shape, { stops, tints, way, mixed }]) =>
      tints.map((tint) => {
        const color = mixed
          ? mix(
              palette.field,
              tintOf(tint, palette),
              LIMITS[palette.mode].landmark,
            )
          : tintOf(tint, palette);
        const drawn = stops
          .map(
            ([offset, opacity]) =>
              `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`,
          )
          .join("");
        const id = gradientId(palette, tint, shape);
        return way
          ? `<linearGradient id="${id}" ${way}>${drawn}</linearGradient>`
          : `<radialGradient id="${id}">${drawn}</radialGradient>`;
      }),
    )
    .join("");
}
