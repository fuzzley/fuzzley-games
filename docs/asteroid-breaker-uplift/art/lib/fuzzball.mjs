// The fuzzball as an actor. Its geometry is the brand mark's own, read from
// `@fz/style`'s source, on the mark's 32-unit grid about its body's middle:
// a round body, thirty strands of fur, two eyes. Here the strands are data
// that can be combed (lifted by a static charge, bent by a push, puffed in
// a fright) and the eyes are one of a few faces. `fuzzballShape()` poses it
// as plain geometry; `fuzzballSvg()` draws that for a palette.
//
// The fuzzball is soft: one flat ink, no facets, no gradients. It acts with
// its fur and its eyes alone, and it has no mouth.

import { FUZZBALL } from "../../../../frontend/lib/style/src/fuzzball.ts";
import {
  TURN,
  attrs,
  between,
  circle,
  clamp,
  ellipse,
  lerp,
  mix,
  num,
  place,
  polar,
  polygon,
  polyline,
  seeded,
} from "./core.mjs";
import { EYE_INK, GLINT } from "./palettes.mjs";

/** @import { Point } from "./core.mjs" */
/** @import { Palette } from "./palettes.mjs" */

/** @typedef {"rest" | "blink" | "set" | "eep" | "happy" | "dizzy" | "sleepy" | "plead" | "squeeze"} Face */

/**
 * @typedef {object} Strand One strand of fur: a curve from inside the body out to its tip.
 * @property {Point} from
 * @property {Point} control
 * @property {Point} to
 */

/**
 * @typedef {object} EyeMark A shape of a face, on the grid.
 * @property {"ellipse" | "polygon" | "stroke"} kind
 * @property {"eye" | "glint"} tone
 * @property {Point} [at] An ellipse's middle.
 * @property {number} [rx]
 * @property {number} [ry]
 * @property {Point[]} [points] A polygon's corners, or the points a stroke runs through.
 * @property {number} [width] A stroke's width.
 */

/**
 * @typedef {object} SparkMark A mark of a static charge, on the grid.
 * @property {"star" | "tick"} kind
 * @property {Point[]} points A star's corners, or the points a tick runs through.
 */

/**
 * @typedef {object} FuzzballPose How a fuzzball is posed.
 * @property {Face} [face] Its eyes; "rest" is the brand mark's.
 * @property {Point} [look] The way it looks, each part from -1 to 1; its eyes shift that way.
 * @property {number} [charge] Its static charge, 0 to 3, which lifts its fur; whole tiers are the chain's x1 to x4.
 * @property {Point} [lean] The push on it, about 1 for a thrust and 2 for a dash; its fur bends the other way.
 * @property {number} [puff] How far its fur stands out in a fright, 0 to 1.
 * @property {boolean} [small] Whether it is the small form: fewer, fatter strands, larger eyes, no glints.
 * @property {number} [tiny] How far the small form goes toward its smallest, 0 (as at 12 pixels) to 1 (as at 8): its eyes grow and part.
 * @property {number} [within] A radius on the grid its fur is held inside, as glass around it holds it.
 * @property {number} [seed] What its sparks are drawn from.
 */

/**
 * @typedef {object} FuzzballShape A posed fuzzball, on the grid about its body's middle.
 * @property {number} body Its body's radius.
 * @property {Strand[]} fur
 * @property {number} furWidth
 * @property {EyeMark[]} eyes Back to front.
 * @property {SparkMark[]} sparks
 * @property {number} reach How far its fur reaches from its middle, its strands' round ends included.
 */

/** How wide the mark's grid is; a fuzzball's `size` is this many grid units across. */
export const GRID = 32;

/** The mark's body's radius, on the grid. */
export const BODY = FUZZBALL.body.r;

/** How wide a strand of the mark's fur is drawn, on the grid. */
export const FUR_WIDTH = FUZZBALL.fur.width;

/** The size, in pixels across the grid, at and under which the small form is drawn. */
export const SMALL_UNDER = 12;

/** Every face, in the order the sheet shows them. */
export const FACES = /** @type {Face[]} */ ([
  "rest",
  "blink",
  "set",
  "eep",
  "happy",
  "dizzy",
  "sleepy",
  "plead",
  "squeeze",
]);

/** When the game would show each face. */
export const FACE_USES = /** @type {Record<Face, string>} */ ({
  rest: "the brand mark",
  blink: "now and then",
  set: "thrusting, firing",
  eep: "a near miss",
  happy: "a stray home",
  dizzy: "knocked about",
  sleepy: "waiting",
  plead: "a stray adrift",
  squeeze: "in a dash",
});

/**
 * Returns a point of the mark's grid from its body's middle.
 *
 * @param {number} x
 * @param {number} y
 * @returns {Point}
 */
function aboutBody(x, y) {
  return [x - FUZZBALL.body.cx, y - FUZZBALL.body.cy];
}

/**
 * Returns the strands of the mark's fur read from its path, each a move to a
 * point and a quadratic curve from it, about the body's middle.
 *
 * @param {string} d
 * @returns {Strand[]}
 */
export function strandsOf(d) {
  return d
    .split("M")
    .slice(1)
    .map((strand) => {
      const values = strand.replace("Q", " ").trim().split(/\s+/).map(Number);
      if (values.length !== 6 || values.some(Number.isNaN)) {
        throw new Error(
          `The fuzzball's fur has a strand it can't read: M${strand}`,
        );
      }
      const [fx = 0, fy = 0, cx = 0, cy = 0, tx = 0, ty = 0] = values;
      return {
        from: aboutBody(fx, fy),
        control: aboutBody(cx, cy),
        to: aboutBody(tx, ty),
      };
    });
}

/** The mark's own thirty strands, clockwise from its right. */
export const STRANDS = strandsOf(FUZZBALL.fur.d);

/** The mark's eyes' middles and radii, about the body's middle. */
const EYES = FUZZBALL.eyes.map(({ cx, cy, rx, ry }) => ({
  at: aboutBody(cx, cy),
  rx,
  ry,
}));

const [FIRST_EYE] = FUZZBALL.eyes;
const [FIRST_GLINT] = FUZZBALL.glints;
if (!FIRST_EYE || !FIRST_GLINT) {
  throw new Error("The fuzzball's mark has lost an eye or its glint.");
}

/** Where the mark's glint lies from its eye's middle, and its radius. */
const GLINT_AT = {
  dx: FIRST_GLINT.cx - FIRST_EYE.cx,
  dy: FIRST_GLINT.cy - FIRST_EYE.cy,
  r: FIRST_GLINT.r,
};

/** The middle between the mark's eyes, and half the way from one to the other. */
const EYES_MIDDLE = /** @type {Point} */ ([
  ((EYES[0]?.at[0] ?? 0) + (EYES[1]?.at[0] ?? 0)) / 2,
  EYES[0]?.at[1] ?? 0,
]);
const EYES_APART = ((EYES[1]?.at[0] ?? 0) - (EYES[0]?.at[0] ?? 0)) / 2;

/** How far the eyes shift toward what the fuzzball looks at, across and down, on the grid. */
export const LOOK = { across: 1.9, down: 1.35 };

/** What each tier of static charge does to the fur: how far it straightens, lengthens, and how unevenly. */
const CHARGE = {
  straight: [0, 0.5, 0.88, 1],
  longer: [0, 1.1, 2.3, 3.3],
  uneven: [0, 0.1, 0.45, 0.85],
};

/** How far a push of 1 sweeps the fur's tips, on the grid. */
const SWEEP = 3.5;

/** How far a full puff stands the fur's tips out, on the grid. */
const PUFF = 1.7;

/**
 * Returns a value a tier of the way along a list, between its entries.
 *
 * @param {readonly number[]} steps
 * @param {number} tier
 * @returns {number}
 */
function ramp(steps, tier) {
  const at = clamp(tier, 0, steps.length - 1);
  const i = Math.min(Math.floor(at), steps.length - 2);
  return lerp(steps[i] ?? 0, steps[i + 1] ?? 0, at - i);
}

/**
 * Returns a point held between two distances from the middle.
 *
 * @param {Point} point
 * @param {number} least
 * @param {number} most
 * @returns {Point}
 */
function heldBetween([x, y], least, most) {
  const far = Math.hypot(x, y) || 1;
  const held = clamp(far, least, Math.max(least, most));
  return [(x / far) * held, (y / far) * held];
}

/**
 * Returns the mark's fur combed for a pose: lifted and straightened by its
 * charge, stood out by its puff, swept away from the push on it, and held
 * inside whatever is around it. With no charge, push or puff it is the
 * mark's fur exactly.
 *
 * @param {FuzzballPose} [pose]
 * @returns {Strand[]}
 */
export function combFur({
  charge = 0,
  lean = [0, 0],
  puff = 0,
  small = false,
  within = Infinity,
} = {}) {
  const straight = ramp(CHARGE.straight, charge);
  const longer = ramp(CHARGE.longer, charge);
  const uneven = ramp(CHARGE.uneven, charge);
  const sweep = /** @type {Point} */ ([-lean[0] * SWEEP, -lean[1] * SWEEP]);
  const pushed = Math.hypot(sweep[0], sweep[1]);
  const most = within - FUR_WIDTH / 2;
  // The small form keeps every other strand, so the fringe still shows as bumps.
  const kept = small ? STRANDS.filter((_, i) => i % 2 === 0) : STRANDS;
  return kept.map(({ from, control, to }, i) => {
    const rootAngle = Math.atan2(from[1], from[0]);
    const tipAngle = Math.atan2(to[1], to[0]);
    const swirl = ((tipAngle - rootAngle + TURN * 1.5) % TURN) - TURN / 2;
    // A charge stands every other strand taller, so the fringe breaks into points.
    const lift =
      longer +
      uneven * (i % 2 === 0 ? 1 : -0.7) +
      puff * PUFF +
      (small ? 0.5 : 0);
    let tip = polar(
      rootAngle + swirl * (1 - straight),
      Math.hypot(to[0], to[1]) + lift,
    );
    /** @type {Point} */
    const carried = [
      control[0] + (tip[0] - to[0]) * 0.5,
      control[1] + (tip[1] - to[1]) * 0.5,
    ];
    /** @type {Point} */
    const middle = [(from[0] + tip[0]) / 2, (from[1] + tip[1]) / 2];
    // A puff rounds a strand out; a charge pulls it straight.
    const fluff = polar(Math.atan2(carried[1], carried[0]), puff * 1.2);
    /** @type {Point} */
    let bend = [
      lerp(carried[0] + fluff[0], middle[0], straight),
      lerp(carried[1] + fluff[1], middle[1], straight),
    ];
    if (pushed > 0) {
      // Fur on the lee side streams out; fur facing the push lies flat on the body.
      const lee =
        (tip[0] * sweep[0] + tip[1] * sweep[1]) /
        (Math.hypot(tip[0], tip[1]) * pushed);
      // Past a thrust's push the lee side breaks into tufts, every other strand streaming farther.
      const tuft =
        lee > 0
          ? 1 +
            clamp(pushed / SWEEP - 1, 0, 1) * lee * (i % 2 === 0 ? 0.3 : -0.25)
          : 1;
      const give = (0.75 + 0.25 * lee) * tuft;
      tip = [tip[0] + sweep[0] * give, tip[1] + sweep[1] * give];
      bend = [bend[0] + sweep[0] * 0.3, bend[1] + sweep[1] * 0.3];
    }
    tip = heldBetween(tip, BODY + 0.5, most);
    bend = heldBetween(bend, 0, most);
    return { from, control: bend, to: tip };
  });
}

/**
 * Returns the points of an ellipse, clockwise from its right.
 *
 * @param {Point} at
 * @param {number} rx
 * @param {number} ry
 * @param {number} [count]
 * @returns {Point[]}
 */
function ellipsePoints([cx, cy], rx, ry, count = 32) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * TURN;
    return /** @type {Point} */ ([
      cx + Math.cos(a) * rx,
      cy + Math.sin(a) * ry,
    ]);
  });
}

/**
 * Returns what of a polygon lies below a line, the line through a point at
 * a slope (its fall for each unit across).
 *
 * @param {Point[]} points
 * @param {Point} through
 * @param {number} slope
 * @returns {Point[]}
 */
function below(points, [lx, ly], slope) {
  const under = (/** @type {Point} */ [x, y]) => y - (ly + (x - lx) * slope);
  /** @type {Point[]} */
  const kept = [];
  points.forEach((a, i) => {
    const b = /** @type {Point} */ (points[(i + 1) % points.length]);
    const da = under(a);
    const db = under(b);
    if (da >= 0) kept.push(a);
    if (da >= 0 !== db >= 0) {
      const share = da / (da - db);
      kept.push([lerp(a[0], b[0], share), lerp(a[1], b[1], share)]);
    }
  });
  return kept;
}

/**
 * Returns the points of a curve through three points, as a quadratic curve
 * bent to pass through the middle one.
 *
 * @param {Point} from
 * @param {Point} through
 * @param {Point} to
 * @param {number} [count]
 * @returns {Point[]}
 */
function arcThrough(from, through, to, count = 12) {
  const control = [
    2 * through[0] - (from[0] + to[0]) / 2,
    2 * through[1] - (from[1] + to[1]) / 2,
  ];
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const u = 1 - t;
    return /** @type {Point} */ ([
      u * u * from[0] + 2 * u * t * (control[0] ?? 0) + t * t * to[0],
      u * u * from[1] + 2 * u * t * (control[1] ?? 0) + t * t * to[1],
    ]);
  });
}

/**
 * Returns the marks of one eye of a face.
 *
 * @param {Face} face
 * @param {Point} at The eye's middle.
 * @param {-1 | 1} side -1 for the eye on the left, 1 for the one on the right.
 * @param {boolean} small
 * @param {number} tiny
 * @returns {EyeMark[]}
 */
function eyeMarks(face, [x, y], side, small, tiny) {
  // The small form's eyes are larger for the body and its lines heavier, to hold a pixel.
  const grow = small ? lerp(1.3, 1.6, tiny) : 1;
  const rx = (EYES[0]?.rx ?? 0) * grow;
  const ry = (EYES[0]?.ry ?? 0) * grow;
  const line = small ? lerp(1.9, 2.4, tiny) : 1.35;
  /** @type {(dx: number, dy: number, r: number) => EyeMark[]} */
  const glint = (dx, dy, r) =>
    small
      ? []
      : [
          {
            kind: "ellipse",
            tone: "glint",
            at: [x + dx, y + dy],
            rx: r,
            ry: r,
          },
        ];
  /** @type {(points: Point[], width?: number) => EyeMark} */
  const stroke = (points, width = line) => ({
    kind: "stroke",
    tone: "eye",
    points,
    width,
  });
  switch (face) {
    case "rest":
      return [
        { kind: "ellipse", tone: "eye", at: [x, y], rx, ry },
        ...glint(GLINT_AT.dx, GLINT_AT.dy, GLINT_AT.r),
      ];
    case "blink":
      return [
        stroke(
          arcThrough([x - rx, y + 0.5], [x, y + 1.1], [x + rx, y + 0.5]),
          line * 1.05,
        ),
      ];
    case "happy":
      return [
        stroke(
          arcThrough(
            [x - rx * 1.05, y + 1.3],
            [x, y - 1.7],
            [x + rx * 1.05, y + 1.3],
          ),
          line * 1.15,
        ),
      ];
    case "squeeze":
      // "> <": each eye a chevron, its point toward the other.
      return [
        stroke(
          [
            [x + side * rx * 0.95, y - ry * 0.72],
            [x - side * rx * 0.8, y + 0.1],
            [x + side * rx * 0.95, y + ry * 0.72],
          ],
          line * 1.1,
        ),
      ];
    case "set": {
      // The lids come down straight across the top third.
      const lid = y - ry + 2 * ry * 0.34;
      const eye = below(ellipsePoints([x, y], rx, ry), [x, lid], 0);
      const shine = small
        ? []
        : [
            /** @type {EyeMark} */ ({
              kind: "polygon",
              tone: "glint",
              points: below(
                ellipsePoints(
                  [x + GLINT_AT.dx, lid + 0.55],
                  GLINT_AT.r,
                  GLINT_AT.r,
                  16,
                ),
                [x, lid + 0.38],
                0,
              ),
            }),
          ];
      return [
        { kind: "polygon", tone: "eye", points: eye },
        stroke(
          [
            [x - rx * 0.98, lid],
            [x + rx * 0.98, lid],
          ],
          line * 0.6,
        ),
        ...shine,
      ];
    }
    case "sleepy": {
      // Half shut, the lids drooping toward the outside.
      const lid = y + ry * 0.16;
      const slope = side * 0.2;
      return [
        {
          kind: "polygon",
          tone: "eye",
          points: below(ellipsePoints([x, y], rx, ry), [x, lid], slope),
        },
        stroke(
          [
            [x - rx * 1.15, lid - rx * 1.15 * slope],
            [x + rx * 1.15, lid + rx * 1.15 * slope],
          ],
          line * 0.8,
        ),
      ];
    }
    case "eep":
      return [
        {
          kind: "ellipse",
          tone: "eye",
          at: [x + side * 0.35, y - 0.6],
          rx: rx * 1.27,
          ry: ry * 1.08,
        },
        ...glint(side * 0.35 + 1.15, -2.05, 0.58),
      ];
    case "plead":
      return [
        {
          kind: "ellipse",
          tone: "eye",
          at: [x, y - 0.3],
          rx: rx * 1.16,
          ry: ry * 1.12,
        },
        ...glint(0.75, -1.75, 1.2),
        ...glint(-0.95, 1.0, 0.55),
      ];
    case "dizzy": {
      if (small)
        return [
          {
            kind: "ellipse",
            tone: "eye",
            at: [x, y],
            rx: rx * 0.8,
            ry: rx * 0.8,
          },
        ];
      // A spiral, each eye wound the other way.
      /** @type {Point[]} */
      const spiral = [];
      for (let i = 0; i <= 44; i++) {
        const share = i / 44;
        spiral.push(
          polar(side * share * TURN * 1.75 + 1, 0.25 + share * 2.55, [x, y]),
        );
      }
      return [stroke(spiral, 0.95)];
    }
  }
}

/**
 * Returns a face's eyes, looking a way, on the grid.
 *
 * @param {Face} [face]
 * @param {Point} [look] The way it looks; a stray pleads upward unless told where.
 * @param {boolean} [small]
 * @param {number} [tiny]
 * @returns {EyeMark[]}
 */
export function eyesOf(face = "rest", look, small = false, tiny = 0) {
  const toward = look ?? (face === "plead" ? [0, -0.75] : [0, 0]);
  const far = Math.hypot(toward[0] ?? 0, toward[1] ?? 0);
  const [lx, ly] =
    far > 1
      ? [(toward[0] ?? 0) / far, (toward[1] ?? 0) / far]
      : [toward[0] ?? 0, toward[1] ?? 0];
  // The mark's eyes sit a little right of its middle; looking takes them about the middle instead.
  const middle = [
    lerp(EYES_MIDDLE[0], 0, Math.min(1, far)) + lx * LOOK.across,
    EYES_MIDDLE[1] + ly * LOOK.down,
  ];
  const apart = EYES_APART * (small ? lerp(1.14, 1.42, tiny) : 1);
  return [
    ...eyeMarks(
      face,
      [(middle[0] ?? 0) - apart, middle[1] ?? 0],
      -1,
      small,
      tiny,
    ),
    ...eyeMarks(
      face,
      [(middle[0] ?? 0) + apart, middle[1] ?? 0],
      1,
      small,
      tiny,
    ),
  ];
}

/**
 * Returns the marks of a full static charge: short jagged ticks that jump
 * between the tips of the fur, and a few small stars just past them.
 *
 * @param {Strand[]} fur
 * @param {number} seed
 * @returns {SparkMark[]}
 */
export function sparksOf(fur, seed) {
  const random = seeded(seed * 2654435761 + 97);
  /** @type {SparkMark[]} */
  const marks = [];
  const count = fur.length;
  const start = Math.floor(between(random, 0, count));
  const jumps = 3;
  for (let j = 0; j < jumps; j++) {
    // A tick jumps from one tall strand's tip to the next tall one's.
    const i =
      (start +
        Math.round((j * count) / jumps) +
        Math.floor(between(random, 0, 3))) %
      count;
    const a = /** @type {Strand} */ (fur[i - (i % 2)]).to;
    const b = /** @type {Strand} */ (fur[(i - (i % 2) + 2) % count]).to;
    const out = (/** @type {Point} */ p, /** @type {number} */ by) => {
      const far = Math.hypot(p[0], p[1]) || 1;
      return /** @type {Point} */ ([
        p[0] * (1 + by / far),
        p[1] * (1 + by / far),
      ]);
    };
    // A short bolt: out from one tip, a kink back, and on to the next.
    const from = out(a, 1.7);
    const to = out(b, 1.7);
    const kink = (/** @type {number} */ share, /** @type {number} */ by) =>
      out([lerp(from[0], to[0], share), lerp(from[1], to[1], share)], by);
    marks.push({
      kind: "tick",
      points: [
        from,
        kink(0.58, between(random, 1.1, 1.6)),
        kink(0.42, between(random, -0.5, -0.1)),
        to,
      ],
    });
    // A star off to one side of it, a little farther out.
    const angle = Math.atan2(a[1], a[0]) - between(random, 0.3, 0.55);
    const middle = polar(
      angle,
      Math.hypot(a[0], a[1]) + between(random, 2.4, 3.6),
    );
    const reach = between(random, 1.1, 1.6);
    const tilt = between(random, 0, TURN / 8);
    marks.push({
      kind: "star",
      points: Array.from({ length: 8 }, (_, k) =>
        polar(tilt + (k / 8) * TURN, k % 2 === 0 ? reach : reach * 0.3, middle),
      ),
    });
  }
  return marks;
}

/**
 * Returns a fuzzball posed, as plain geometry on the mark's grid about its
 * body's middle. With no pose it is the brand mark.
 *
 * @param {FuzzballPose} [pose]
 * @returns {FuzzballShape}
 */
export function fuzzballShape(pose = {}) {
  const {
    face = "rest",
    look,
    charge = 0,
    small = false,
    tiny = 0,
    seed = 1,
  } = pose;
  const fur = combFur(pose);
  const furWidth = small ? FUR_WIDTH * 1.25 : FUR_WIDTH;
  return {
    body: BODY,
    fur,
    furWidth,
    eyes: eyesOf(face, look, small, tiny),
    sparks: charge >= 2.5 && !small ? sparksOf(fur, seed) : [],
    reach:
      Math.max(...fur.map(({ to }) => Math.hypot(to[0], to[1]))) + furWidth / 2,
  };
}

/**
 * Returns how far the mark's fur reaches from its middle at a charge, on the
 * grid, for what holds a fuzzball to be sized by.
 *
 * @param {number} [charge]
 * @returns {number}
 */
export function furReach(charge = 0) {
  return fuzzballShape({ charge }).reach;
}

/**
 * Returns the colors a static charge sparks in for an ink: a bright middle
 * and the ink's own halo in a dark palette, ink on paper in a light one.
 *
 * @param {string} ink
 * @param {Palette} palette
 * @returns {{ core: string, halo: string }}
 */
export function sparkTones(ink, palette) {
  return palette.mode === "light"
    ? { core: mix(ink, palette.fieldText, 0.4), halo: ink }
    : { core: mix(ink, "#ffffff", 0.82), halo: ink };
}

/**
 * @typedef {object} FuzzballLook How a fuzzball is drawn, beside its pose.
 * @property {string} ink Its body's and fur's color.
 * @property {number} size How many pixels its grid of 32 units takes; its fur reaches about 0.9 of that.
 * @property {boolean} [shadow] Whether a soft shadow lies under it, for a portrait.
 * @property {number} [outline] The width, in pixels, of an outline in the field's color around it.
 */

/**
 * Returns a fuzzball drawn in a palette, about its body's middle. At 12
 * pixels and under it is drawn in its small form unless told otherwise.
 *
 * @param {FuzzballPose & FuzzballLook} look
 * @param {Palette} palette
 * @returns {string}
 */
export function fuzzballSvg(look, palette) {
  const { ink, size, shadow = false, outline = 0 } = look;
  const small = look.small ?? size <= SMALL_UNDER;
  const tiny = look.tiny ?? clamp((SMALL_UNDER - size) / 4, 0, 1);
  const shape = fuzzballShape({ ...look, small, tiny });
  // The grid is scaled here, point by point, so that what `num()` rounds
  // is a pixel and never a unit of the mark's grid.
  const by = size / GRID;
  const at = (/** @type {Point} */ [x, y]) =>
    /** @type {Point} */ ([x * by, y * by]);
  const d = shape.fur
    .map(({ from, control, to }) => {
      const [a, b, c] = [at(from), at(control), at(to)];
      return `M${num(a[0])} ${num(a[1])}Q${num(b[0])} ${num(b[1])} ${num(c[0])} ${num(c[1])}`;
    })
    .join("");
  const fur = (/** @type {string} */ color, /** @type {number} */ wider) =>
    circle(0, 0, shape.body * by + wider, color) +
    `<path d="${d}"${attrs({ fill: "none", stroke: color, "stroke-width": shape.furWidth * by + 2 * wider, "stroke-linecap": "round" })}/>`;
  const tones = { eye: EYE_INK, glint: GLINT };
  const parts = [];
  if (shadow) {
    parts.push(
      ellipse(
        0,
        (shape.body + 3.1) * by,
        8.6 * by,
        1.5 * by,
        mix(
          palette.field,
          palette.fieldText,
          palette.mode === "light" ? 0.12 : 0.3,
        ),
      ),
    );
  }
  if (outline > 0) parts.push(fur(palette.field, outline));
  parts.push(fur(ink, 0));
  for (const mark of shape.eyes) {
    const color = tones[mark.tone];
    if (mark.kind === "ellipse" && mark.at) {
      const [x, y] = at(mark.at);
      parts.push(
        ellipse(x, y, (mark.rx ?? 0) * by, (mark.ry ?? 0) * by, color),
      );
    } else if (mark.kind === "polygon" && mark.points) {
      parts.push(polygon(mark.points.map(at), color));
    } else if (mark.points) {
      parts.push(polyline(mark.points.map(at), color, (mark.width ?? 1) * by));
    }
  }
  const spark = sparkTones(ink, palette);
  for (const mark of shape.sparks) {
    const points = mark.points.map(at);
    if (mark.kind === "tick") {
      parts.push(polyline(points, spark.halo, 1.5 * by, { opacity: 0.4 }));
      parts.push(polyline(points, spark.core, Math.max(0.8, 0.55 * by)));
    } else {
      parts.push(
        polygon(points, spark.halo, {
          opacity: 0.4,
          stroke: spark.halo,
          "stroke-width": 1.1 * by,
          "stroke-linejoin": "round",
        }),
      );
      parts.push(polygon(points, spark.core));
    }
  }
  return place(parts.join(""));
}
