// The pod: the ship of the uplift, built around its pilot. A round glass
// canopy sits at the middle the pod turns about, and the fuzzball inside
// stays upright while the hull turns around it, its eyes on where the pod
// points. The hull is hard, so it is cut into flat facets and lit by the
// field's one light, as the rocks are (`./rocks.mjs`), in tones of the
// palette's accent; the canopy is round and its glint keeps to the upper
// left however the hull turns.
//
// A pod is made once as plain geometry in field units, its nose along x:
// `makePod()`. `podSvg()` draws it for a palette at a turn and in a state:
// thrusting, dashing, guarded, shielded, charged.

import {
  TURN,
  between,
  circle,
  clamp,
  contrast,
  lerp,
  mix,
  normalOf,
  place,
  polar,
  polygon,
  polyline,
  ring,
  seeded,
  turned,
} from "./core.mjs";
import { GRID, fuzzballSvg, furReach, sparkTones } from "./fuzzball.mjs";
import { PILOT_INKS, tonesOf } from "./palettes.mjs";
import { LIGHT, jagged, litBy, toneAt } from "./rocks.mjs";
import {
  TOWARD_LIGHT,
  TOW_RADIUS,
  alpha,
  arcPoints,
  straySvg,
} from "./strays.mjs";

/** @import { Point, Vec3 } from "./core.mjs" */
/** @import { Face, FuzzballPose } from "./fuzzball.mjs" */
/** @import { Palette } from "./palettes.mjs" */

/** @typedef {"bumble" | "dart" | "crescent"} PodVariant */

/**
 * @typedef {object} HullFacet A flat face of the hull.
 * @property {Point[]} points Its corners, in field units, the pod's nose along x.
 * @property {Vec3} normal The way it faces; z is toward the viewer.
 * @property {"hull" | "trim"} part Whose ink it takes: the accent's, or the engines' metal.
 */

/**
 * @typedef {object} Engine Where a flame leaves the hull, pointing back.
 * @property {Point} at
 * @property {number} width
 */

/**
 * @typedef {object} PodShape
 * @property {PodVariant} variant
 * @property {string} name
 * @property {string} says What it is, in a line.
 * @property {number} canopy The canopy's radius; its middle is the middle the pod turns about.
 * @property {HullFacet[]} facets Back to front.
 * @property {Engine[]} engines
 * @property {Point} hook Where a tow line ties.
 * @property {{ length: number, width: number, reach: number }} size Measured from its facets.
 */

/** How long a pod is, nose to tail, in field units, as the ship is in `tuning.ts`. */
export const POD_LENGTH = 2.4;

/** How far out the rings around a pod lie, in field units. */
export const RINGS = { shield: 1.64, guard: 1.84 };

/** How much of the canopy's radius the pilot's fur fills with no charge; a full charge fills it. */
const CANOPY_FILL = 0.8;

/** How wide the canopy's rim is, in field units. */
const RIM = 0.1;

/** The three candidates, in the order the sheet shows them. */
export const POD_VARIANTS = /** @type {PodVariant[]} */ ([
  "bumble",
  "dart",
  "crescent",
]);

/**
 * Returns a facet from its corners in 3D, facing as its first three lie.
 *
 * @param {Vec3[]} corners
 * @param {HullFacet["part"]} [part]
 * @returns {HullFacet}
 */
function cut(corners, part = "hull") {
  const [a, b, c] = /** @type {[Vec3, Vec3, Vec3]} */ (corners);
  return {
    points: corners.map(([x, y]) => /** @type {Point} */ ([x, y])),
    normal: normalOf(a, b, c),
    part,
  };
}

/**
 * Returns facets with their mirror images across the pod's line, each
 * after the one it mirrors.
 *
 * @param {HullFacet[]} facets
 * @returns {HullFacet[]}
 */
function bothSides(facets) {
  return facets.flatMap((facet) => [
    facet,
    {
      points: facet.points
        .map(([x, y]) => /** @type {Point} */ ([x, -y]))
        .reverse(),
      normal: /** @type {Vec3} */ ([
        facet.normal[0],
        -facet.normal[1],
        facet.normal[2],
      ]),
      part: facet.part,
    },
  ]);
}

/**
 * Returns a collar: a ring of facets sloping up from a rim to a seat, as a
 * gem's bezel does.
 *
 * @param {number} rim Its outer radius, at the hull's foot.
 * @param {number} seat Its inner radius, raised.
 * @param {number} rise How high the seat stands.
 * @param {number} sides
 * @returns {HullFacet[]}
 */
function collar(rim, seat, rise, sides) {
  /** @type {HullFacet[]} */
  const facets = [];
  for (let i = 0; i < sides; i++) {
    const a = ((i - 0.5) / sides) * TURN;
    const b = ((i + 0.5) / sides) * TURN;
    facets.push(
      cut([
        [...polar(a, rim), 0],
        [...polar(b, rim), 0],
        [...polar(b, seat), rise],
        [...polar(a, seat), rise],
      ]),
    );
  }
  return facets;
}

/**
 * Returns Bumble's geometry: a round collar about the canopy, a short prow,
 * and an engine nacelle on each side of its tail.
 *
 * @returns {Omit<PodShape, "size">}
 */
function bumble() {
  const rim = 0.88;
  /** @type {Vec3} */
  const tip = [1.44, 0, 0];
  /** @type {Vec3} */
  const apex = [0.62, 0, 0.36];
  /** @type {Vec3} */
  const ridgeFront = [-0.42, 0.82, 0.5];
  /** @type {Vec3} */
  const ridgeRear = [-0.86, 0.82, 0.5];
  return {
    variant: "bumble",
    name: "Bumble",
    says: "A round collar about the canopy, a beak of a prow, a fat engine each side of its tail.",
    canopy: 0.68,
    facets: [
      ...collar(rim, 0.74, 0.26, 12),
      ...bothSides([cut([tip, [...polar(0.5, rim), 0], apex])]),
      // The nacelles ride on the collar's flanks, clear of the canopy.
      ...bothSides([
        cut(
          [
            [-0.86, 0.68, 0],
            [-0.86, 0.96, 0],
            [-0.96, 1, 0.02],
            [-0.96, 0.64, 0.02],
          ],
          "trim",
        ),
        cut([[-0.42, 1, 0], [-0.86, 1, 0], ridgeRear, ridgeFront]),
        cut([[-0.42, 0.64, 0], ridgeFront, ridgeRear, [-0.86, 0.64, 0]]),
        cut([[-0.1, 0.82, 0], [-0.42, 1, 0], ridgeFront]),
        cut([[-0.1, 0.82, 0], ridgeFront, [-0.42, 0.64, 0]]),
      ]),
    ],
    engines: [
      { at: [-0.96, 0.82], width: 0.32 },
      { at: [-0.96, -0.82], width: 0.32 },
    ],
    hook: [-0.88, 0],
  };
}

/**
 * Returns Dart's geometry: a rocket with a pointed nose, a fin each side of
 * its tail and one engine, its dome as wide as its body.
 *
 * @returns {Omit<PodShape, "size">}
 */
function dart() {
  /** @type {Vec3} */
  const nose = [1.35, 0, 0];
  /** @type {Vec3} */
  const shoulder = [0.44, 0.66, 0];
  /** @type {Vec3} */
  const waist = [-0.5, 0.71, 0];
  /** @type {Vec3} */
  const tail = [-0.8, 0.42, 0];
  /** @type {Vec3} */
  const ridge = [0.56, 0, 0.38];
  /** @type {Vec3} */
  const deckFront = [0.42, 0.34, 0.36];
  /** @type {Vec3} */
  const deckRear = [-0.5, 0.38, 0.36];
  /** @type {Vec3} */
  const tailTop = [-0.8, 0, 0.2];
  /** @type {Vec3} */
  const finRidge = [-0.44, 0.63, 0.2];
  /** @type {Vec3} */
  const finTip = [-1.05, 0.9, 0];
  return {
    variant: "dart",
    name: "Dart",
    says: "A slim rocket with a dome as wide as its body, two fins and one engine; the nearest to today's ship.",
    canopy: 0.65,
    facets: [
      cut(
        [
          [-0.8, 0.28, 0],
          [-1.05, 0.35, 0.03],
          [-1.05, -0.35, 0.03],
          [-0.8, -0.28, 0],
        ],
        "trim",
      ),
      ...bothSides([
        cut([[-0.06, 0.68, 0], finTip, finRidge]),
        cut([finRidge, finTip, [-1.05, 0.72, 0], [-0.74, 0.48, 0]]),
        cut([waist, tail, tailTop, deckRear]),
        cut([deckRear, tailTop, [-0.5, 0, 0.36]]),
        cut([shoulder, waist, deckRear, deckFront]),
        cut([ridge, deckFront, deckRear, [-0.5, 0, 0.36]]),
        cut([nose, shoulder, deckFront, ridge]),
      ]),
    ],
    engines: [{ at: [-1.05, 0], width: 0.5 }],
    hook: [-1, 0],
  };
}

/**
 * Returns Crescent's geometry: a swept wing wrapped around the canopy, its
 * tips trailing, an engine each side of its tail.
 *
 * @returns {Omit<PodShape, "size">}
 */
function crescent() {
  /** @type {Vec3} */
  const nose = [1.1, 0, 0];
  /** @type {Vec3} */
  const kink = [0.62, 0.56, 0];
  /** @type {Vec3} */
  const tipFront = [-0.5, 1, 0];
  /** @type {Vec3} */
  const tipRear = [-1.3, 0.92, 0];
  /** @type {Vec3} */
  const inner = [-0.78, 0.52, 0];
  /** @type {Vec3} */
  const tail = [-0.76, 0, 0.16];
  /** @type {Vec3} */
  const crest = [0.7, 0, 0.34];
  /** @type {Vec3} */
  const spar = [0.08, 0.67, 0.3];
  /** @type {Vec3} */
  const sparTip = [-0.92, 0.92, 0.1];
  return {
    variant: "crescent",
    name: "Crescent",
    says: "A swept wing wrapped around the canopy, its tips trailing.",
    canopy: 0.65,
    facets: [
      ...bothSides([
        cut(
          [
            [-0.74, 0.14, 0],
            [-0.78, 0.44, 0],
            [-0.96, 0.46, 0.03],
            [-0.96, 0.12, 0.03],
          ],
          "trim",
        ),
        cut([spar, inner, tail]),
        cut([crest, spar, tail]),
        cut([spar, sparTip, tipRear, inner]),
        cut([tipFront, tipRear, sparTip]),
        cut([kink, tipFront, sparTip, spar]),
        cut([nose, kink, spar, crest]),
      ]),
    ],
    engines: [
      { at: [-0.96, 0.29], width: 0.3 },
      { at: [-0.96, -0.29], width: 0.3 },
    ],
    hook: [-0.76, 0],
  };
}

/**
 * Returns a pod's geometry.
 *
 * @param {PodVariant} variant
 * @returns {PodShape}
 */
export function makePod(variant) {
  const shape = { bumble, dart, crescent }[variant]();
  const points = shape.facets.flatMap((facet) => facet.points);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    ...shape,
    size: {
      length: Math.max(...xs) - Math.min(...xs),
      width: Math.max(...ys) - Math.min(...ys),
      reach: Math.max(...points.map(([x, y]) => Math.hypot(x, y))),
    },
  };
}

/** The three pods, made once. */
export const PODS = /** @type {Record<PodVariant, PodShape>} */ ({
  bumble: makePod("bumble"),
  dart: makePod("dart"),
  crescent: makePod("crescent"),
});

/**
 * Returns how wide a pod's pilot is drawn, across the fuzzball's grid, in
 * field units: its fur fills most of the canopy with no charge.
 *
 * @param {PodShape} pod
 * @returns {number}
 */
export function pilotSize(pod) {
  return (GRID * CANOPY_FILL * pod.canopy) / furReach(0);
}

/**
 * Returns an ink's four tones with each held to 3:1 against the field, as
 * what the player flies must be however it turns: a tone that falls short
 * is brought toward the ink until it holds.
 *
 * @param {string} ink
 * @param {Palette} palette
 * @returns {ReturnType<typeof tonesOf>}
 */
export function heldTones(ink, palette) {
  const tones = tonesOf(ink, palette);
  const hold = (/** @type {string} */ tone) => {
    let held = tone;
    for (
      let share = 0.1;
      contrast(held, palette.field) < 3 && share <= 1;
      share += 0.1
    ) {
      held = mix(tone, ink, share);
    }
    return held;
  };
  return {
    lit: hold(tones.lit),
    ink,
    shade: hold(tones.shade),
    deep: hold(tones.deep),
  };
}

/**
 * Returns the colors a pod is drawn in for a palette: its hull's tones, its
 * engines' metal, its glass, and its flame.
 *
 * @param {Palette} palette
 * @returns {{ hull: ReturnType<typeof tonesOf>, trim: ReturnType<typeof tonesOf>, glass: string, glassShade: string, rim: string, rimLit: string, rimDim: string, flame: string, flameCore: string }}
 */
export function podTones(palette) {
  const light = palette.mode === "light";
  const hull = heldTones(palette.accent, palette);
  return {
    hull,
    trim: heldTones(palette.fieldMuted, palette),
    // Behind the pilot, near the field's own color, so every pilot's ink reads on it.
    glass: light
      ? mix(palette.field, palette.accent, 0.14)
      : mix(palette.page, palette.accent, 0.08),
    glassShade: light
      ? mix(palette.field, palette.accent, 0.3)
      : mix(palette.page, palette.accent, 0.2),
    rim: light ? hull.deep : hull.shade,
    rimLit: light ? hull.ink : hull.lit,
    rimDim: light
      ? mix(palette.accent, palette.field, 0.62)
      : mix(palette.accent, palette.field, 0.66),
    flame: palette.warning,
    flameCore: mix(palette.warning, "#ffffff", light ? 0.55 : 0.68),
  };
}

/**
 * Returns the gradient a pod's flame's halo is drawn with, for a file's defs.
 *
 * @param {Palette} palette
 * @returns {string}
 */
export function podDefs(palette) {
  const color = palette.warning;
  return `<radialGradient id="pod-flame-${palette.id}"><stop offset="0" stop-color="${color}" stop-opacity="0.8"/><stop offset="0.4" stop-color="${color}" stop-opacity="0.3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
}

/** How each of the flame's three flicker frames differs: its length, its width, and how far its tip sways. */
const FLICKER = [
  { length: 1, width: 1, sway: 0 },
  { length: 0.8, width: 1.1, sway: 0.07 },
  { length: 1.14, width: 0.92, sway: -0.06 },
];

/**
 * Returns a flame's outline behind an engine, in the pod's own units: a
 * teardrop from its base to its tip.
 *
 * @param {Engine} engine
 * @param {number} length
 * @param {number} width As a share of the engine's.
 * @param {number} sway How far its tip swings to a side.
 * @returns {Point[]}
 */
function flameOutline({ at, width: base }, length, width, sway) {
  const half = (base * width) / 2;
  const count = 9;
  /** @type {Point[]} */
  const near = [];
  /** @type {Point[]} */
  const far = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const wide = half * (1 - t) ** 0.7 * (1 + 0.6 * t);
    const x = at[0] - length * t;
    const y = at[1] + sway * t * t;
    near.push([x, y - wide]);
    far.unshift([x, y + wide]);
  }
  return [...near, ...far];
}

/**
 * @typedef {object} PodLook How a pod is drawn.
 * @property {PodVariant} [variant]
 * @property {number} [turn] Its heading, in radians; 0 points right, a quarter turn down.
 * @property {number} [unit] The pixels a field unit takes.
 * @property {number | string} [pilot] Its pilot: one of the eight by number, or an ink.
 * @property {Face} [face] The pilot's face; else set while thrusting, squeezed in a dash, at rest otherwise.
 * @property {Point} [look] The way the pilot looks; else where the pod points.
 * @property {number} [charge] The pilot's static charge, 0 to 3; a full one sends arcs over the hull.
 * @property {number} [thrust] How hard it thrusts, 0 to 1: a flame behind each engine, the pilot's fur pushed back.
 * @property {number} [flicker] Which of the flame's three frames, 0 to 2.
 * @property {boolean} [trail] Whether the flame leaves a trail of fading puffs.
 * @property {boolean} [dash] Whether it is in a dash: after-images behind it, fur swept flat, eyes shut tight.
 * @property {number} [guard] How brightly the dashed ring of a new pod shows, 0 to 1; it blinks between two.
 * @property {boolean} [shield] Whether the Shield's glass shell is around it.
 * @property {number} [recharge] How far its dash has recharged, 0 to 1; the canopy's rim fills with it, and is whole when ready.
 * @property {boolean} [outline] Whether its outline is drawn, in the field's color.
 * @property {boolean} [flat] Whether its hull is drawn in its ink alone, unlit.
 * @property {number} [seed] What its arcs and puffs are drawn from.
 */

/**
 * Returns a pod drawn in a palette, about the middle it turns about. Under
 * 10 pixels a unit it leaves out its glint, the glass's shade, the shell's
 * inner line and the canopy's rim, which shows only as the dash's gauge;
 * its silhouette, facets, glass and pilot stay.
 *
 * @param {PodLook} look
 * @param {Palette} palette
 * @returns {string}
 */
export function podSvg(look, palette) {
  const {
    variant = "bumble",
    turn = 0,
    unit: px = 22,
    pilot = 0,
    thrust = 0,
    flicker = 0,
    trail = false,
    dash = false,
    guard = 0,
    shield = false,
    recharge = 1,
    outline = true,
    flat = false,
    charge = 0,
    seed = 1,
  } = look;
  const pod = PODS[variant];
  const tones = podTones(palette);
  const ink =
    typeof pilot === "string"
      ? pilot
      : (PILOT_INKS[palette.mode][pilot % 8] ?? palette.accent);
  const small = px < 10;
  const heading = polar(turn, 1);
  const at = (/** @type {Point} */ p) => {
    const [x, y] = turned(p, turn);
    return /** @type {Point} */ ([x * px, y * px]);
  };
  const parts = [];

  // A dash leaves the hull's shape behind it, fading.
  if (dash) {
    [0.1, 0.2, 0.36].forEach((opacity, i) => {
      // Each image farther back is a little smaller, so the trail tapers.
      const back = (3 - i) * 0.62 * px;
      const shrink = 1 - (3 - i) * 0.08;
      const ghost = [
        ...pod.facets.map((facet) =>
          polygon(
            facet.points.map((p) => at([p[0] * shrink, p[1] * shrink])),
            tones.hull.ink,
            { stroke: tones.hull.ink, "stroke-width": 0.6 },
          ),
        ),
        circle(0, 0, (pod.canopy + RIM / 2) * px * shrink, tones.hull.ink),
      ].join("");
      parts.push(
        place(ghost, {
          x: -heading[0] * back,
          y: -heading[1] * back,
          more: { opacity: alpha(opacity) },
        }),
      );
    });
    if (!small) {
      for (const side of [-0.42, 0.42]) {
        parts.push(
          polyline(
            [
              at([-1.1, side * pod.size.width]),
              at([-2.9, side * pod.size.width]),
            ],
            tones.hull.lit,
            Math.max(1, 0.05 * px),
            { opacity: 0.4 },
          ),
        );
      }
    }
  }

  // The flame: a soft halo, a body in the warning color, a bright middle.
  if (thrust > 0) {
    const frame = FLICKER[flicker % FLICKER.length] ?? {
      length: 1,
      width: 1,
      sway: 0,
    };
    const length = (0.4 + 0.75 * thrust) * frame.length;
    const random = seeded(seed * 31 + flicker * 7 + 5);
    for (const engine of pod.engines) {
      const middle = at([engine.at[0] - length * 0.4, engine.at[1]]);
      parts.push(
        circle(
          middle[0],
          middle[1],
          (length * 0.8 + engine.width) * px,
          `url(#pod-flame-${palette.id})`,
          { opacity: alpha(palette.mode === "light" ? 0.6 : 0.75) },
        ),
      );
      if (trail) {
        for (let i = 0; i < 5; i++) {
          const puff = at([
            engine.at[0] - length - 0.22 - i * 0.4,
            engine.at[1] + between(random, -0.09, 0.09) * (i + 1) * 0.6,
          ]);
          parts.push(
            circle(
              puff[0],
              puff[1],
              (0.09 + i * 0.03) * px * (engine.width / 0.3) ** 0.5,
              tones.flame,
              { opacity: alpha(0.5 - i * 0.095) },
            ),
          );
        }
      }
      parts.push(
        polygon(
          flameOutline(engine, length, frame.width, frame.sway).map(at),
          tones.flame,
        ),
      );
      parts.push(
        polygon(
          flameOutline(
            { at: engine.at, width: engine.width * 0.5 },
            length * 0.58,
            frame.width,
            frame.sway * 0.6,
          ).map(at),
          tones.flameCore,
        ),
      );
    }
  }

  // The Shield's wash lies under the pod; its rim and glint go on last.
  const shell = RINGS.shield * px;
  if (shield) {
    parts.push(
      circle(0, 0, shell, palette.accent, {
        opacity: alpha(palette.mode === "light" ? 0.1 : 0.14),
      }),
    );
  }

  const edge = Math.max(2, 0.2 * px);
  if (outline) {
    for (const facet of pod.facets) {
      parts.push(
        polygon(facet.points.map(at), palette.field, {
          stroke: palette.field,
          "stroke-width": edge,
          "stroke-linejoin": "round",
        }),
      );
    }
    parts.push(
      circle(0, 0, (pod.canopy + RIM / 2) * px + edge / 2, palette.field),
    );
  }
  for (const facet of pod.facets) {
    const set = tones[facet.part];
    const fill = flat ? set.ink : toneAt(litBy(facet.normal, turn, LIGHT), set);
    parts.push(
      polygon(facet.points.map(at), fill, {
        stroke: fill,
        "stroke-width": 0.6,
        "stroke-linejoin": "round",
      }),
    );
  }

  // The canopy: glass, the pilot upright in it, a rim, and a glint that keeps to the light.
  // Under 10 pixels a unit the rim would close the gap that keeps the pilot's
  // ink off the hull's, so the glass is left bare and a little wider.
  const r = pod.canopy * px + (small ? 0.3 : 0);
  const rimWidth = small ? 1 : Math.max(1.2, RIM * px);
  parts.push(circle(0, 0, r, tones.glass));
  if (!small) {
    // The glass's far side, shaded: the part of its disc a second disc, set toward the light, leaves.
    const off = polar(TOWARD_LIGHT, r * 0.26);
    const shade = [
      ...arcPoints(
        [0, 0],
        r,
        TOWARD_LIGHT + TURN * 0.229,
        TOWARD_LIGHT + TURN * 0.771,
        20,
      ),
      ...arcPoints(
        off,
        r,
        TOWARD_LIGHT + TURN * 0.729,
        TOWARD_LIGHT + TURN * 0.271,
        20,
      ),
    ];
    parts.push(polygon(shade, tones.glassShade));
  }
  const size = pilotSize(pod) * px;
  const push = dash ? 2 : thrust;
  /** @type {FuzzballPose} */
  const pose = {
    face: look.face ?? (dash ? "squeeze" : thrust > 0 ? "set" : "rest"),
    look: look.look ?? heading,
    charge,
    lean: [heading[0] * push, heading[1] * push],
    within: (small ? r : r - rimWidth / 2) / (size / GRID),
    seed,
  };
  parts.push(fuzzballSvg({ ...pose, ink, size }, palette));
  const rimAt = small ? r - rimWidth / 2 : r;
  if (recharge < 1) {
    // The rim is the dash's gauge: dark after a dash, it fills clockwise from the top.
    parts.push(ring(0, 0, rimAt, tones.rimDim, rimWidth));
    if (recharge > 0) {
      parts.push(
        polyline(
          arcPoints(
            [0, 0],
            rimAt,
            -TURN / 4,
            -TURN / 4 + TURN * clamp(recharge, 0, 1),
            40,
          ),
          tones.rimLit,
          rimWidth,
          { "stroke-linecap": "butt" },
        ),
      );
    }
  } else if (!small) {
    parts.push(ring(0, 0, r, tones.rim, rimWidth));
    parts.push(
      polyline(
        arcPoints(
          [0, 0],
          r,
          TOWARD_LIGHT - TURN * 0.16,
          TOWARD_LIGHT + TURN * 0.16,
          16,
        ),
        tones.rimLit,
        rimWidth,
        { "stroke-linecap": "butt" },
      ),
    );
  }
  if (!small) {
    const glint = { opacity: palette.mode === "light" ? 1 : 0.9 };
    parts.push(
      polyline(
        arcPoints([0, 0], r * 0.72, TOWARD_LIGHT - 0.36, TOWARD_LIGHT + 0.22),
        "#ffffff",
        Math.max(1.3, 0.085 * px),
        glint,
      ),
    );
    parts.push(
      circle(
        ...polar(TOWARD_LIGHT + 0.52, r * 0.72),
        Math.max(0.7, 0.05 * px),
        "#ffffff",
        glint,
      ),
    );
  }

  // A full charge sends arcs crawling over the hull, from facet to facet.
  if (charge >= 2.5) {
    const spark = sparkTones(ink, palette);
    const random = seeded(seed * 613 + 11);
    const middles = pod.facets
      .filter((facet) => facet.part === "hull")
      .map(
        ({ points }) =>
          /** @type {Point} */ ([
            points.reduce((sum, p) => sum + p[0], 0) / points.length,
            points.reduce((sum, p) => sum + p[1], 0) / points.length,
          ]),
      );
    // An arc runs between two facets near each other, clear of the canopy.
    /** @type {[Point, Point][]} */
    const runs = [];
    middles.forEach((from, i) => {
      for (const to of middles.slice(i + 1)) {
        const far = Math.hypot(to[0] - from[0], to[1] - from[1]);
        const clear = Math.hypot((from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
        if (far > 0.3 && far < 0.85 && clear > pod.canopy + 0.12)
          runs.push([from, to]);
      }
    });
    runs.sort(
      (a, b) => Math.atan2(a[0][1], a[0][0]) - Math.atan2(b[0][1], b[0][0]),
    );
    const arcs = Math.min(small ? 2 : 3, runs.length);
    const first = Math.floor(between(random, 0, runs.length));
    for (let i = 0; i < arcs; i++) {
      const [from, to] = /** @type {[Point, Point]} */ (
        runs[(first + Math.floor((i * runs.length) / arcs)) % runs.length]
      );
      const points = jagged(
        random,
        lerpPoint(from, to, -0.15),
        lerpPoint(from, to, 1.15),
        4,
        0.2,
      ).map(at);
      parts.push(
        polyline(points, spark.halo, Math.max(2.2, 0.17 * px), {
          opacity: 0.5,
        }),
      );
      parts.push(polyline(points, "#ffffff", Math.max(1, 0.06 * px)));
    }
  }

  // The Shield: a glass shell, thicker and harder than a stray's bubble.
  if (shield) {
    parts.push(ring(0, 0, shell, tones.hull.ink, Math.max(1.6, 0.13 * px)));
    if (!small) {
      parts.push(
        ring(0, 0, shell - 0.15 * px, tones.hull.lit, Math.max(1, 0.04 * px), {
          opacity: 0.6,
        }),
      );
      const glint = palette.mode === "light" ? tones.hull.ink : "#ffffff";
      parts.push(
        polyline(
          arcPoints(
            [0, 0],
            shell - 0.36 * px,
            TOWARD_LIGHT - 0.3,
            TOWARD_LIGHT + 0.16,
          ),
          glint,
          Math.max(1.4, 0.1 * px),
          { opacity: alpha(0.85) },
        ),
      );
      parts.push(
        circle(
          ...polar(TOWARD_LIGHT + 0.34, shell - 0.36 * px),
          Math.max(0.8, 0.06 * px),
          glint,
          { opacity: alpha(0.85) },
        ),
      );
    }
  }

  // The guard of a new pod: a dashed ring, which blinks.
  if (guard > 0) {
    const around = TURN * RINGS.guard * px;
    const dashes = 18;
    parts.push(
      ring(0, 0, RINGS.guard * px, tones.hull.ink, Math.max(1.3, 0.11 * px), {
        opacity: alpha(guard),
        "stroke-dasharray": `${((around / dashes) * 0.56).toFixed(2)} ${((around / dashes) * 0.44).toFixed(2)}`,
      }),
    );
  }
  return parts.join("");
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
 * Returns a lost pod's pilot bailing out: the hull's facets flung apart, a
 * burst where it was, and the pilot popped clear in a small bubble, wide
 * eyed, looking back at it.
 *
 * @param {object} how
 * @param {PodVariant} [how.variant]
 * @param {number} [how.turn] The pod's heading as it was lost.
 * @param {number} [how.unit]
 * @param {number | string} [how.pilot]
 * @param {number} [how.spread] How far the pieces have flown, 0 to 1.
 * @param {Point} [how.away] Where the bubble has popped to, in field units from the pod's middle.
 * @param {number} [how.seed]
 * @param {Palette} palette
 * @returns {string}
 */
export function bailOutSvg(
  {
    variant = "bumble",
    turn = 0,
    unit: px = 22,
    pilot = 0,
    spread = 1,
    away = [0.5, -1.5],
    seed = 1,
  },
  palette,
) {
  const pod = PODS[variant];
  const tones = podTones(palette);
  const ink =
    typeof pilot === "string"
      ? pilot
      : (PILOT_INKS[palette.mode][pilot % 8] ?? palette.accent);
  const random = seeded(seed * 409 + 3);
  const parts = [];
  // The burst: short rays in the flame's color, where the canopy was.
  const rays = 9;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * TURN + between(random, -0.15, 0.15);
    const from = 0.35 + 0.5 * spread;
    parts.push(
      polyline(
        [
          polar(angle, from * px),
          polar(angle, (from + between(random, 0.25, 0.5)) * px),
        ],
        tones.flame,
        Math.max(1.2, 0.09 * px),
        { opacity: alpha(0.85) },
      ),
    );
  }
  for (const facet of pod.facets) {
    const middle = /** @type {Point} */ ([
      facet.points.reduce((sum, p) => sum + p[0], 0) / facet.points.length,
      facet.points.reduce((sum, p) => sum + p[1], 0) / facet.points.length,
    ]);
    const far = Math.hypot(middle[0], middle[1]) || 1;
    const fling = spread * between(random, 0.5, 1.1);
    const spin = spread * between(random, -1.4, 1.4);
    const points = facet.points.map((p) => {
      const [x, y] = turned([p[0] - middle[0], p[1] - middle[1]], spin);
      const [tx, ty] = turned(
        [middle[0] * (1 + fling / far) + x, middle[1] * (1 + fling / far) + y],
        turn,
      );
      return /** @type {Point} */ ([tx * px, ty * px]);
    });
    const fill = toneAt(
      litBy(facet.normal, turn + spin, LIGHT),
      tones[facet.part],
    );
    parts.push(
      polygon(points, palette.field, {
        stroke: palette.field,
        "stroke-width": Math.max(2, 0.2 * px),
        "stroke-linejoin": "round",
      }),
    );
    parts.push(
      polygon(points, fill, {
        stroke: fill,
        "stroke-width": 0.6,
        "stroke-linejoin": "round",
      }),
    );
  }
  const far = Math.hypot(away[0], away[1]) || 1;
  parts.push(
    place(
      straySvg(
        {
          ink,
          unit: px,
          radius: TOW_RADIUS,
          face: "eep",
          puff: 1,
          look: [-away[0] / far, -away[1] / far],
        },
        palette,
      ),
      {
        x: away[0] * spread * px,
        y: away[1] * spread * px,
      },
    ),
  );
  return parts.join("");
}
