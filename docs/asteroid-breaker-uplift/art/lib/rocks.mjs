// The rocks of the uplift: each a low dome of flat facets, cut like a stone,
// so that one light can fall on it from one side however it turns. A rock is
// made once, from a seed, as plain geometry in units of its own radius: its
// outline, its facets with the way each faces, and the marks its kind is
// told by. `rockSvg()` then lights it for a palette at a turn.
//
// The facets' normals are what a normal map of the rock would hold, so the
// same geometry gives the game both the picture and the map
// (../make-assets.mjs writes both out).

import {
  TURN,
  between,
  circle,
  clamp,
  lerp,
  mix,
  normalOf,
  pick,
  place,
  polar,
  polygon,
  polyline,
  seeded,
  turned,
  unit,
  wholeBetween,
} from "./core.mjs";
import { ROCK_INKS, tonesOf } from "./palettes.mjs";

/** @import { Point, Vec3 } from "./core.mjs" */
/** @import { Palette } from "./palettes.mjs" */

/** @typedef {"stone" | "ice" | "crystal" | "iron" | "volatile" | "lodestone" | "boulder"} RockKind */
/** @typedef {"boulder" | "large" | "medium" | "small"} RockSize */
/** @typedef {"body" | "gem" | "band"} Part */

/**
 * @typedef {object} Facet A flat face of a rock.
 * @property {Point[]} points Its corners, in units of the rock's radius.
 * @property {Vec3} normal The way it faces; z is toward the viewer.
 * @property {Part} part Whose ink it takes.
 */

/**
 * @typedef {object} Stroke A line drawn on a rock.
 * @property {Point[]} points
 * @property {"deep" | "lit" | "core" | "glint" | "field" | "sheen"} tone
 * @property {number} width In units of the rock's radius.
 */

/**
 * @typedef {object} Dot A round mark on a rock.
 * @property {Point} at
 * @property {number} r
 * @property {"deep" | "lit" | "core" | "glint"} tone
 */

/**
 * @typedef {object} Glow A soft light a rock gives off, which no light falls on.
 * @property {Point} at
 * @property {number} r
 * @property {"core" | "gem"} tone
 * @property {number} strength From 0 to 1.
 */

/**
 * @typedef {object} RockShape
 * @property {RockKind} kind
 * @property {RockSize} size
 * @property {number} radius How far its outline reaches, in field units.
 * @property {Point[]} outline Around all of it, whatever stands out of it included.
 * @property {Point[]} rim Around its dome alone.
 * @property {Facet[]} facets Back to front.
 * @property {Stroke[]} strokes
 * @property {Dot[]} dots
 * @property {Glow[]} glows
 * @property {Stroke[]} aura Lines drawn around it, past its outline, which nothing hits.
 */

/** How far a rock of each size reaches, in field units, as `tuning.ts` has it. */
export const ROCK_RADIUS = {
  boulder: 4.6,
  large: 2.8,
  medium: 1.6,
  small: 0.9,
};

/** The way the light travels to the field: from the upper left, and from the viewer's side. */
export const LIGHT = unit([-0.52, -0.62, 0.58]);

/** How much light reaches a face turned away from the light. */
const AMBIENT = 0.3;

/** How much the light adds to a face turned straight at it. */
const DIFFUSE = 0.95;

/**
 * @typedef {object} Ring
 * @property {number} at How far out it lies, as a share of the outline.
 * @property {number} z How high it stands.
 * @property {number} sides
 */

/**
 * @typedef {object} Cut How a kind of rock is cut at a size.
 * @property {number} sides The corners of its outline.
 * @property {number} jag How much shorter a corner may reach than the farthest, 0 to 1.
 * @property {number} [squash] Its height over its width, 1 for round.
 * @property {number} [spike] How much shorter every other corner reaches, for shards.
 * @property {Ring[]} rings Inward from the outline.
 * @property {number} top How high its top stands.
 * @property {boolean} [flatTop] Whether its last ring is capped flat rather than drawn up to a point.
 */

/** @type {Record<RockKind, Partial<Record<RockSize, Cut>>>} */
const CUTS = {
  stone: {
    large: {
      sides: 11,
      jag: 0.2,
      rings: [{ at: 0.62, z: 0.46, sides: 6 }],
      top: 0.7,
    },
    medium: {
      sides: 9,
      jag: 0.22,
      rings: [{ at: 0.58, z: 0.5, sides: 4 }],
      top: 0.72,
    },
    small: { sides: 7, jag: 0.24, rings: [], top: 0.7 },
  },
  ice: {
    large: {
      sides: 11,
      jag: 0.1,
      spike: 0.34,
      rings: [{ at: 0.5, z: 0.5, sides: 5 }],
      top: 0.85,
    },
    medium: {
      sides: 9,
      jag: 0.1,
      spike: 0.36,
      rings: [{ at: 0.48, z: 0.52, sides: 4 }],
      top: 0.85,
    },
    small: { sides: 7, jag: 0.1, spike: 0.36, rings: [], top: 0.8 },
  },
  crystal: {
    large: {
      sides: 10,
      jag: 0.16,
      rings: [{ at: 0.6, z: 0.4, sides: 5 }],
      top: 0.55,
    },
    medium: {
      sides: 8,
      jag: 0.18,
      rings: [{ at: 0.56, z: 0.42, sides: 4 }],
      top: 0.55,
    },
  },
  iron: {
    large: {
      sides: 8,
      jag: 0.06,
      squash: 0.84,
      rings: [{ at: 0.74, z: 0.5, sides: 8 }],
      top: 0.5,
      flatTop: true,
    },
    medium: {
      sides: 8,
      jag: 0.06,
      squash: 0.86,
      rings: [{ at: 0.7, z: 0.5, sides: 8 }],
      top: 0.5,
      flatTop: true,
    },
    small: {
      sides: 6,
      jag: 0.06,
      squash: 0.9,
      rings: [{ at: 0.62, z: 0.5, sides: 6 }],
      top: 0.5,
      flatTop: true,
    },
  },
  volatile: {
    large: {
      sides: 13,
      jag: 0.1,
      rings: [
        { at: 0.68, z: 0.42, sides: 7 },
        { at: 0.34, z: 0.62, sides: 5 },
      ],
      top: 0.62,
      flatTop: true,
    },
    medium: {
      sides: 11,
      jag: 0.1,
      rings: [
        { at: 0.64, z: 0.44, sides: 6 },
        { at: 0.32, z: 0.62, sides: 4 },
      ],
      top: 0.62,
      flatTop: true,
    },
  },
  lodestone: {
    large: {
      sides: 10,
      jag: 0.08,
      squash: 0.62,
      rings: [{ at: 0.58, z: 0.5, sides: 6 }],
      top: 0.7,
    },
    medium: {
      sides: 8,
      jag: 0.08,
      squash: 0.62,
      rings: [{ at: 0.56, z: 0.5, sides: 4 }],
      top: 0.7,
    },
    small: { sides: 6, jag: 0.08, squash: 0.64, rings: [], top: 0.66 },
  },
  boulder: {
    boulder: {
      sides: 17,
      jag: 0.14,
      rings: [
        { at: 0.78, z: 0.34, sides: 11 },
        { at: 0.5, z: 0.6, sides: 7 },
      ],
      top: 0.78,
    },
  },
};

/** The sizes each kind comes in, largest first, as the catalog has them. */
export const SIZES_OF = /** @type {Record<RockKind, RockSize[]>} */ ({
  stone: ["large", "medium", "small"],
  ice: ["large", "medium", "small"],
  crystal: ["large", "medium"],
  iron: ["large", "medium", "small"],
  volatile: ["large", "medium"],
  lodestone: ["large", "medium", "small"],
  boulder: ["boulder"],
});

/** @typedef {{ p: Point, z: number, angle: number }} Corner */

/**
 * Returns the triangles between two rings of corners, each in order of its
 * angle, the inner ring's first corner the one nearest the outer's first.
 *
 * @param {Corner[]} outer
 * @param {Corner[]} inner
 * @returns {[Corner, Corner, Corner][]}
 */
function strip(outer, inner) {
  const na = outer.length;
  const nb = inner.length;
  const first = /** @type {Corner} */ (outer[0]);
  let start = 0;
  let nearest = Infinity;
  inner.forEach((corner, i) => {
    const off = Math.abs(
      ((corner.angle - first.angle + TURN * 1.5) % TURN) - TURN / 2,
    );
    if (off < nearest) {
      nearest = off;
      start = i;
    }
  });
  const rolled = inner.map(
    (_, i) => /** @type {Corner} */ (inner[(i + start) % nb]),
  );
  // Angles run on past a turn, so the walk ends where it began.
  const unwrap = (
    /** @type {Corner[]} */ ring,
    /** @type {number} */ k,
    /** @type {number} */ from,
  ) => {
    const corner = /** @type {Corner} */ (ring[k % ring.length]);
    let angle = corner.angle;
    while (angle < from - TURN / 2) angle += TURN;
    return angle + (k >= ring.length ? TURN : 0);
  };
  /** @type {[Corner, Corner, Corner][]} */
  const triangles = [];
  let i = 0;
  let j = 0;
  while (i < na || j < nb) {
    const a = /** @type {Corner} */ (outer[i % na]);
    const b = /** @type {Corner} */ (rolled[j % nb]);
    const aNext = unwrap(outer, i + 1, first.angle);
    const bNext = unwrap(rolled, j + 1, first.angle);
    if (i < na && (j >= nb || aNext <= bNext)) {
      triangles.push([a, /** @type {Corner} */ (outer[(i + 1) % na]), b]);
      i++;
    } else {
      triangles.push([b, /** @type {Corner} */ (rolled[(j + 1) % nb]), a]);
      j++;
    }
  }
  return triangles;
}

/**
 * Returns a facet of three corners.
 *
 * @param {[Corner, Corner, Corner]} corners
 * @param {Part} part
 * @returns {Facet}
 */
function facetOf([a, b, c], part) {
  return {
    points: [a.p, b.p, c.p],
    normal: normalOf([...a.p, a.z], [...b.p, b.z], [...c.p, c.z]),
    part,
  };
}

/**
 * Returns a dome: an outline and rings of corners inside it, each higher,
 * joined into facets.
 *
 * @param {() => number} random
 * @param {Cut} cut
 * @returns {{ outline: Point[], facets: Facet[], rings: Corner[][] }}
 */
function dome(random, cut) {
  const squash = cut.squash ?? 1;
  /** @type {Corner[]} */
  const rim = [];
  for (let i = 0; i < cut.sides; i++) {
    const angle = ((i + between(random, -0.22, 0.22)) / cut.sides) * TURN;
    // A shard's corners reach unevenly: every other one falls short, by an
    // amount of its own, and an odd count sets two long ones side by side.
    const short =
      cut.spike === undefined
        ? 0
        : i % 2 === 1
          ? cut.spike * between(random, 0.7, 1.35)
          : cut.spike * between(random, 0, 0.5);
    const reach = 1 - short - between(random, 0, cut.jag);
    rim.push({
      p: [Math.cos(angle) * reach, Math.sin(angle) * reach * squash],
      z: 0,
      angle,
    });
  }
  // The farthest corner reaches exactly the rock's radius.
  const farthest = Math.max(...rim.map(({ p }) => Math.hypot(p[0], p[1])));
  for (const corner of rim) {
    corner.p = [corner.p[0] / farthest, corner.p[1] / farthest];
  }
  /** The outline's reach at an angle, between its two nearest corners. */
  const reachAt = (/** @type {number} */ angle) => {
    let best = 1;
    let nearest = Infinity;
    for (const corner of rim) {
      const off = Math.abs(
        ((corner.angle - angle + TURN * 1.5) % TURN) - TURN / 2,
      );
      if (off < nearest) {
        nearest = off;
        best = Math.hypot(corner.p[0], corner.p[1] / squash);
      }
    }
    return best;
  };
  const rings = [rim];
  for (const ring of cut.rings) {
    /** @type {Corner[]} */
    const corners = [];
    const turn = between(random, 0, TURN);
    for (let i = 0; i < ring.sides; i++) {
      const angle =
        (turn + ((i + between(random, -0.2, 0.2)) / ring.sides) * TURN) % TURN;
      const reach = ring.at * reachAt(angle) * between(random, 0.9, 1.08);
      corners.push({
        p: [Math.cos(angle) * reach, Math.sin(angle) * reach * squash],
        z: ring.z * between(random, 0.9, 1.1),
        angle,
      });
    }
    corners.sort((a, b) => a.angle - b.angle);
    rings.push(corners);
  }
  /** @type {Facet[]} */
  const facets = [];
  for (let r = 0; r + 1 < rings.length; r++) {
    const outer = /** @type {Corner[]} */ (rings[r]);
    const inner = /** @type {Corner[]} */ (rings[r + 1]);
    for (const triangle of strip(outer, inner)) {
      facets.push(facetOf(triangle, "body"));
    }
  }
  const last = /** @type {Corner[]} */ (rings.at(-1));
  if (cut.flatTop) {
    facets.push({
      points: last.map(({ p }) => p),
      normal: [0, 0, 1],
      part: "body",
    });
  } else {
    /** @type {Corner} */
    const peak = {
      p: [between(random, -0.1, 0.1), between(random, -0.1, 0.1) * squash],
      z: cut.top,
      angle: 0,
    };
    last.forEach((corner, i) => {
      const next = /** @type {Corner} */ (last[(i + 1) % last.length]);
      facets.push(facetOf([corner, next, peak], "body"));
    });
  }
  return { outline: rim.map(({ p }) => p), facets, rings };
}

/**
 * Returns the facets of a dent: a shallow pit of a few sides, its walls
 * facing its middle, so the light finds its far wall.
 *
 * @param {() => number} random
 * @param {Point} at
 * @param {number} r
 * @returns {Facet[]}
 */
function dent(random, at, r) {
  const sides = 6;
  const turn = between(random, 0, TURN);
  /** @type {Corner[]} */
  const rim = [];
  for (let i = 0; i < sides; i++) {
    const angle = turn + (i / sides) * TURN;
    rim.push({
      p: polar(angle, r * between(random, 0.85, 1.1), at),
      z: 0,
      angle,
    });
  }
  /** @type {Corner} */
  const pit = { p: at, z: -r * 0.9, angle: 0 };
  return rim.map((corner, i) =>
    facetOf(
      [corner, /** @type {Corner} */ (rim[(i + 1) % sides]), pit],
      "body",
    ),
  );
}

/**
 * Returns a jagged line between two points.
 *
 * @param {() => number} random
 * @param {Point} from
 * @param {Point} to
 * @param {number} steps
 * @param {number} sway
 * @returns {Point[]}
 */
export function jagged(random, from, to, steps, sway) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const across = [-dy / length, dx / length];
  /** @type {Point[]} */
  const points = [from];
  for (let i = 1; i < steps; i++) {
    const share = i / steps;
    const off = between(random, -sway, sway) * length;
    points.push([
      from[0] + dx * share + (across[0] ?? 0) * off,
      from[1] + dy * share + (across[1] ?? 0) * off,
    ]);
  }
  points.push(to);
  return points;
}

/**
 * Returns the facets of a gem: a long prism with a ridge down its middle,
 * standing out from a point at an angle.
 *
 * @param {Point} base
 * @param {number} angle
 * @param {number} length
 * @param {number} half Its half width.
 * @returns {Facet[]}
 */
function prism(base, angle, length, half) {
  const along = polar(angle, 1);
  const across = polar(angle + TURN / 4, 1);
  const at = (/** @type {number} */ l, /** @type {number} */ w) =>
    /** @type {Point} */ ([
      base[0] + along[0] * l + across[0] * w,
      base[1] + along[1] * l + across[1] * w,
    ]);
  const tip = at(length, 0);
  const foot = at(0, 0);
  const tilt = 0.75;
  return [
    {
      points: [at(0, -half), at(length * 0.72, -half), tip, foot],
      normal: unit([-across[0] * tilt, -across[1] * tilt, 0.66]),
      part: "gem",
    },
    {
      points: [at(0, half), at(length * 0.72, half), tip, foot],
      normal: unit([across[0] * tilt, across[1] * tilt, 0.66]),
      part: "gem",
    },
  ];
}

/**
 * Returns a rock of a kind and size, from a seed.
 *
 * @param {RockKind} kind
 * @param {RockSize} size
 * @param {number} seed
 * @returns {RockShape}
 */
export function makeRock(kind, size, seed) {
  const cut = CUTS[kind][size];
  if (!cut) throw new RangeError(`A ${kind} rock doesn't come ${size}.`);
  const random = seeded(seed * 7919 + kind.length * 131 + size.length);
  const { outline, facets, rings } = dome(random, cut);
  /** @type {RockShape} */
  const rock = {
    kind,
    size,
    radius: ROCK_RADIUS[size],
    outline,
    rim: outline,
    facets,
    strokes: [],
    dots: [],
    glows: [],
    aura: [],
  };
  const big = size === "large" || size === "boulder";
  const inner = /** @type {Corner[]} */ (rings.at(-1));
  switch (kind) {
    case "stone":
    case "boulder": {
      const dents =
        kind === "boulder"
          ? 5
          : size === "large"
            ? 2
            : size === "medium"
              ? 1
              : 0;
      for (let i = 0; i < dents; i++) {
        const at = polar(between(random, 0, TURN), between(random, 0.2, 0.62));
        rock.facets.push(
          ...dent(
            random,
            at,
            kind === "boulder"
              ? between(random, 0.07, 0.13)
              : between(random, 0.12, 0.2),
          ),
        );
      }
      if (kind === "boulder") {
        // A seam across it, which its cracks later follow.
        const a = between(random, 0, TURN);
        rock.strokes.push({
          points: jagged(
            random,
            polar(a, 0.86),
            polar(a + TURN / 2 + between(random, -0.5, 0.5), 0.8),
            7,
            0.07,
          ),
          tone: "deep",
          width: 0.022,
        });
      }
      break;
    }
    case "ice": {
      // Fractures from its middle, and glints where the light catches.
      const lines = big ? 3 : 2;
      for (let i = 0; i < lines; i++) {
        const a = between(random, 0, TURN);
        rock.strokes.push({
          points: jagged(
            random,
            polar(a, 0.08),
            polar(a + between(random, -0.3, 0.3), between(random, 0.5, 0.78)),
            3,
            0.12,
          ),
          tone: "glint",
          width: 0.035,
        });
      }
      rock.dots.push({
        at: [-0.3, -0.34],
        r: big ? 0.07 : 0.09,
        tone: "glint",
      });
      if (big) rock.dots.push({ at: [-0.12, -0.52], r: 0.04, tone: "glint" });
      break;
    }
    case "crystal": {
      const gems = size === "large" ? 4 : 3;
      const fan = between(random, 0, TURN);
      /** @type {Facet[]} */
      const prisms = [];
      for (let i = 0; i < gems; i++) {
        const angle =
          fan + (i - (gems - 1) / 2) * 0.62 + between(random, -0.12, 0.12);
        const length =
          i === Math.floor(gems / 2) ? 1.02 : between(random, 0.7, 0.9);
        prisms.push(
          ...prism(
            polar(angle, 0.12),
            angle,
            length - 0.12,
            between(random, 0.13, 0.17),
          ),
        );
      }
      rock.facets.push(...prisms);
      rock.glows.push({
        at: polar(fan, 0.45),
        r: 0.95,
        tone: "gem",
        strength: 0.5,
      });
      rock.dots.push({ at: polar(fan, 0.62), r: 0.05, tone: "glint" });
      // The gems reach past the stone they stand in.
      rock.outline = hull([
        ...rock.outline,
        ...prisms.flatMap(({ points }) => points),
      ]);
      break;
    }
    case "iron": {
      // Plate seams across its flat top, a rivet inside each of its corners.
      const seam = between(random, -0.3, 0.3);
      rock.strokes.push({
        points: [
          lerpPoint(
            /** @type {Corner} */ (inner[0]).p,
            /** @type {Corner} */ (inner[1]).p,
            0.5 + seam * 0.4,
          ),
          lerpPoint(
            /** @type {Corner} */ (inner[Math.floor(inner.length / 2)]).p,
            /** @type {Corner} */ (
              inner[Math.floor(inner.length / 2) + 1] ?? inner[0]
            ).p,
            0.5 - seam * 0.4,
          ),
        ],
        tone: "deep",
        width: 0.035,
      });
      rock.strokes.push({
        points: [
          [/** @type {Corner} */ (inner[0]).p[0] * 0.2 - 0.3, -0.3],
          [/** @type {Corner} */ (inner[0]).p[0] * 0.2 + 0.05, 0.28],
        ],
        tone: "sheen",
        width: 0.16,
      });
      inner.forEach((corner, i) => {
        if (size === "small" && i % 2 === 1) return;
        rock.dots.push({
          at: [corner.p[0] * 0.8, corner.p[1] * 0.8],
          r: size === "small" ? 0.07 : 0.05,
          tone: "deep",
        });
      });
      break;
    }
    case "volatile": {
      // Its seams glow: the edges of its inner rings, and spokes out from them.
      const core = /** @type {Corner[]} */ (rings.at(-1));
      const mid = /** @type {Corner[]} */ (rings.at(-2));
      rock.strokes.push({
        points: [...core.map(({ p }) => p), /** @type {Corner} */ (core[0]).p],
        tone: "core",
        width: 0.05,
      });
      core.forEach((corner, i) => {
        const outer = /** @type {Corner} */ (
          mid[Math.floor((i * mid.length) / core.length) % mid.length]
        );
        rock.strokes.push({
          points: jagged(random, corner.p, outer.p, 2, 0.1),
          tone: "core",
          width: 0.04,
        });
        const rim = /** @type {Point} */ (
          outline[
            Math.floor(((i + 0.5) * outline.length) / core.length) %
              outline.length
          ]
        );
        rock.strokes.push({
          points: jagged(
            random,
            outer.p,
            lerpPoint(outer.p, rim, 0.72),
            2,
            0.12,
          ),
          tone: "core",
          width: 0.028,
        });
      });
      rock.glows.push({ at: [0, 0], r: 1.25, tone: "core", strength: 0.55 });
      rock.glows.push({ at: [0, 0], r: 0.42, tone: "core", strength: 0.9 });
      break;
    }
    case "lodestone": {
      // A band at each pole, and the field's lines around it.
      const pole = 0.6;
      rock.strokes.push({
        points: [
          [-pole, -0.3],
          [-pole - 0.05, 0.3],
        ],
        tone: "lit",
        width: 0.07,
      });
      rock.strokes.push({
        points: [
          [pole, -0.3],
          [pole + 0.05, 0.3],
        ],
        tone: "deep",
        width: 0.07,
      });
      for (const side of [-1, 1]) {
        for (const [reach, lift] of [[1.22, 0.7]]) {
          /** @type {Point[]} */
          const arc = [];
          for (let i = 0; i <= 14; i++) {
            const t = (i / 14) * Math.PI;
            arc.push([
              -Math.cos(t) * /** @type {number} */ (reach) * 0.92,
              side * (0.34 + Math.sin(t) * /** @type {number} */ (lift) * 0.62),
            ]);
          }
          rock.aura.push({ points: arc, tone: "lit", width: 0.03 });
        }
      }
      break;
    }
  }
  return rock;
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
 * Returns the convex hull of points, in order around it.
 *
 * @param {Point[]} points
 * @returns {Point[]}
 */
export function hull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (
    /** @type {Point} */ o,
    /** @type {Point} */ a,
    /** @type {Point} */ b,
  ) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  /** @type {Point[]} */
  const lower = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(
        /** @type {Point} */ (lower.at(-2)),
        /** @type {Point} */ (lower.at(-1)),
        p,
      ) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  /** @type {Point[]} */
  const upper = [];
  for (const p of sorted.reverse()) {
    while (
      upper.length >= 2 &&
      cross(
        /** @type {Point} */ (upper.at(-2)),
        /** @type {Point} */ (upper.at(-1)),
        p,
      ) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * Returns how brightly the light falls on a face, 0 to 1 and a little over,
 * once the rock has turned.
 *
 * @param {Vec3} normal
 * @param {number} turn The rock's turn, in radians.
 * @param {Vec3} [light]
 * @returns {number}
 */
export function litBy(normal, turn, light = LIGHT) {
  const [x, y] = turned([normal[0], normal[1]], turn);
  const facing = x * light[0] + y * light[1] + normal[2] * light[2];
  return AMBIENT + DIFFUSE * Math.max(0, facing);
}

/**
 * Returns the color of a face under a light, between its ink's four tones.
 *
 * @param {number} light As `litBy()` returns it.
 * @param {{ lit: string, ink: string, shade: string, deep: string }} tones
 * @returns {string}
 */
export function toneAt(light, tones) {
  const stops = [tones.deep, tones.shade, tones.ink, tones.lit];
  const at = clamp((light - 0.3) / 0.82, 0, 1) * (stops.length - 1);
  const i = Math.min(Math.floor(at), stops.length - 2);
  return mix(
    /** @type {string} */ (stops[i]),
    /** @type {string} */ (stops[i + 1]),
    at - i,
  );
}

/**
 * @typedef {object} RockLook How a rock is drawn.
 * @property {number} [turn] Its turn, in radians.
 * @property {number} [unit] The pixels a field unit takes.
 * @property {boolean} [flat] Whether it is drawn unlit, in its ink alone, as the game draws it today.
 * @property {number} [pulse] How strongly its glow shows, 0 to 1, for a rock that glows.
 * @property {boolean} [outline] Whether its outline is drawn, in the field's color.
 * @property {Vec3} [light] Another light than the field's.
 * @property {number} [hits] The hits it has taken and held, each a crack more.
 * @property {Lamp[]} [lamps] Lights near it, such as a blast's, each tinting the faces turned to it.
 * @property {"lit" | "normal" | "ink" | "glow"} [as] What is drawn: the rock lit (the default); its normal map; its inks alone, unlit, with nothing it gives off, which is what a lit sprite's texture holds; or only what it gives off, its halos and its glowing seams, which no light falls on.
 */

/**
 * @typedef {object} Lamp A light near a rock, at a place, which fades with distance.
 * @property {Point} at Where it is from the rock's middle, in pixels.
 * @property {string} color
 * @property {number} strength From 0 to 1.
 * @property {number} reach How far it carries, in pixels.
 */

/**
 * Returns the cracks a rock shows for the hits it has taken: jagged lines in
 * from its edge, one more a hit, the same ones every time for the same rock.
 *
 * @param {RockShape} rock
 * @param {number} hits
 * @returns {Point[][]}
 */
export function cracksOf(rock, hits) {
  const random = seeded(
    rock.outline.length * 977 + Math.round((rock.outline[0]?.[0] ?? 0) * 1e4),
  );
  /** @type {Point[][]} */
  const cracks = [];
  const first = between(random, 0, TURN);
  for (let i = 0; i < hits; i++) {
    const angle = first + i * 2.4 + between(random, -0.3, 0.3);
    const from = polar(angle, 0.9);
    const to = polar(
      angle + between(random, -0.5, 0.5),
      between(random, 0.05, 0.3),
    );
    const line = jagged(random, from, to, 5, 0.09);
    cracks.push(line);
    // A branch off its middle.
    const mid = /** @type {Point} */ (line[2]);
    cracks.push(
      jagged(
        random,
        mid,
        polar(
          angle + (random() < 0.5 ? -1 : 1) * between(random, 0.5, 0.9),
          between(random, 0.45, 0.7),
        ),
        3,
        0.1,
      ),
    );
  }
  return cracks;
}

/**
 * Returns the color a normal map holds for a way a face points: red for
 * right, green for up, blue for toward the viewer.
 *
 * @param {Vec3} normal
 * @param {number} turn
 * @returns {string}
 */
export function normalColor(normal, turn) {
  const [x, y] = turned([normal[0], normal[1]], turn);
  const channel = (/** @type {number} */ v) =>
    Math.round((v * 0.5 + 0.5) * 255);
  return `rgb(${channel(x)},${channel(-y)},${channel(normal[2])})`;
}

/**
 * Returns a rock drawn in a palette, about its middle.
 *
 * @param {RockShape} rock
 * @param {Palette} palette
 * @param {RockLook} [look]
 * @returns {string}
 */
export function rockSvg(
  rock,
  palette,
  {
    turn = 0,
    unit: px = 16,
    flat = false,
    pulse = 1,
    outline = true,
    light = LIGHT,
    hits = 0,
    lamps = [],
    as = "lit",
  } = {},
) {
  const inks = ROCK_INKS[palette.mode];
  const bodyInk = rock.kind === "crystal" ? inks.stone : inks[rock.kind];
  const tones = {
    body: tonesOf(bodyInk, palette),
    gem: tonesOf(inks.crystal, palette),
    band: tonesOf(bodyInk, palette),
  };
  const scale = rock.radius * px;
  // Under ten pixels a unit the fine marks go: rivets, glints, seams, sheen.
  const fine = px >= 10;
  const at = (/** @type {Point} */ p) => {
    const [x, y] = turned(p, turn);
    return /** @type {Point} */ ([x * scale, y * scale]);
  };
  const toneOf = {
    deep: tones.body.deep,
    lit: tones.body.lit,
    core: inks.core,
    glint: "#ffffff",
    field: palette.field,
    sheen: tones.body.lit,
  };
  const parts = [];
  if (as === "normal") {
    for (const facet of rock.facets) {
      const fill = normalColor(facet.normal, turn);
      parts.push(
        polygon(facet.points.map(at), fill, {
          stroke: fill,
          "stroke-width": 0.6,
          "stroke-linejoin": "round",
        }),
      );
    }
    return place(parts.join(""));
  }
  if (as === "ink") flat = true;
  /** Whether what it gives off is drawn, and whether its body is. */
  const emits = as !== "ink";
  const body = as !== "glow";
  // What it gives off shows behind it and around it.
  for (const glow of emits ? rock.glows : []) {
    const color = glow.tone === "core" ? inks.core : inks.crystal;
    const [x, y] = at(glow.at);
    const id = `glow-${glow.tone}-${palette.id}`;
    parts.push(
      `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(glow.r * scale).toFixed(2)}" fill="url(#${id})" opacity="${(glow.strength * pulse * (palette.mode === "light" ? 0.7 : 1)).toFixed(2)}"/>`,
    );
    void color;
  }
  for (const stroke of fine && body ? rock.aura : []) {
    parts.push(
      polyline(
        stroke.points.map(at),
        tones.body.ink,
        Math.max(1, stroke.width * scale),
        {
          opacity: 0.45,
          "stroke-dasharray": `${(0.1 * scale).toFixed(1)} ${(0.12 * scale).toFixed(1)}`,
        },
      ),
    );
  }
  if (outline && body) {
    const width = Math.max(2.5, 0.28 * px);
    const edged = [
      rock.rim,
      ...rock.facets
        .filter(({ part }) => part === "gem")
        .map(({ points }) => points),
    ];
    for (const points of edged) {
      parts.push(
        polygon(points.map(at), palette.field, {
          stroke: palette.field,
          "stroke-width": width,
          "stroke-linejoin": "round",
        }),
      );
    }
  }
  for (const facet of body ? rock.facets : []) {
    const set = tones[facet.part];
    let fill = flat ? set.ink : toneAt(litBy(facet.normal, turn, light), set);
    if (!flat && lamps.length > 0) {
      // Each lamp tints the faces turned toward it, less the farther it is.
      const middle = facet.points
        .reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1]], [0, 0])
        .map((v) => v / facet.points.length);
      const [mx, my] = at(/** @type {Point} */ (middle));
      const [nx, ny] = turned([facet.normal[0], facet.normal[1]], turn);
      for (const lamp of lamps) {
        const dx = lamp.at[0] - mx;
        const dy = lamp.at[1] - my;
        const far = Math.hypot(dx, dy) || 1;
        const height = lamp.reach * 0.35;
        const length = Math.hypot(far, height);
        const facing = Math.max(
          0,
          (nx * dx + ny * dy + facet.normal[2] * height) / length,
        );
        const share = clamp(
          lamp.strength * facing * Math.max(0, 1 - far / lamp.reach) * 1.6,
          0,
          0.85,
        );
        fill = mix(fill, lamp.color, share);
      }
    }
    parts.push(
      polygon(facet.points.map(at), fill, {
        stroke: fill,
        "stroke-width": 0.6,
        "stroke-linejoin": "round",
      }),
    );
  }
  if (hits > 0 && body) {
    for (const crack of cracksOf(rock, hits)) {
      const line = crack.map(at);
      parts.push(
        polyline(
          line.map(
            ([x, y]) => /** @type {Point} */ ([x + 0.07 * px, y + 0.07 * px]),
          ),
          tones.body.lit,
          Math.max(0.8, 0.05 * px),
          { opacity: 0.55 },
        ),
      );
      parts.push(
        polyline(
          line,
          palette.mode === "light" ? palette.fieldText : palette.field,
          Math.max(1.1, 0.085 * px),
        ),
      );
    }
  }
  for (const stroke of rock.strokes) {
    if (
      !fine &&
      (stroke.tone === "glint" ||
        stroke.tone === "sheen" ||
        (stroke.tone !== "core" && stroke.width < 0.06))
    )
      continue;
    if (stroke.tone === "core" ? !emits : !body) continue;
    const color = toneOf[stroke.tone];
    if (stroke.tone === "core") {
      parts.push(
        polyline(
          stroke.points.map(at),
          inks.core,
          Math.max(1.2, stroke.width * scale * 2.6),
          { opacity: 0.28 * pulse },
        ),
      );
    }
    const faint =
      stroke.tone === "glint"
        ? { opacity: 0.7 }
        : stroke.tone === "sheen"
          ? { opacity: 0.4, "stroke-linecap": "butt" }
          : {};
    parts.push(
      polyline(
        stroke.points.map(at),
        color,
        Math.max(1, stroke.width * scale),
        faint,
      ),
    );
  }
  for (const dot of fine && body ? rock.dots : []) {
    const [x, y] = at(dot.at);
    parts.push(circle(x, y, Math.max(0.8, dot.r * scale), toneOf[dot.tone]));
  }
  return place(parts.join(""));
}

/**
 * Returns the gradients the rocks' glows are drawn with, for a file's defs.
 *
 * @param {Palette} palette
 * @returns {string}
 */
export function rockDefs(palette) {
  const inks = ROCK_INKS[palette.mode];
  const stops = (/** @type {string} */ color) =>
    `<stop offset="0" stop-color="${color}" stop-opacity="0.85"/><stop offset="0.35" stop-color="${color}" stop-opacity="0.35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>`;
  return [
    `<radialGradient id="glow-core-${palette.id}">${stops(palette.mode === "light" ? mix(inks.core, inks.volatile, 0.35) : inks.core)}</radialGradient>`,
    `<radialGradient id="glow-gem-${palette.id}">${stops(inks.crystal)}</radialGradient>`,
  ].join("");
}

/** Every kind of rock, in How to play's order. */
export const ROCK_KINDS = /** @type {RockKind[]} */ ([
  "stone",
  "crystal",
  "ice",
  "boulder",
  "iron",
  "volatile",
  "lodestone",
]);

export { pick, wholeBetween };
