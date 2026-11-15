// The fuzzball: the mark the site and the games share with fuzzley.info, a
// pom-pom with two eyes, and the actor the Asteroid Breaker uplift's art kit
// made of it. Its geometry is fuzzley.info's (branding/favicon/icon.svg in
// that repository, drawn by make_favicons.py), on a 32-unit grid. Its faces,
// told by its eyes alone, its look, and its fur combed by force and by
// static are the kit's, as plain geometry on that grid about its body's
// middle, which a canvas and a page each draw; and it is drawn here in SVG.
//
// It is one file, with no relative import, since an app compiles it with no
// `.ts` allowed in an import, and Node loads it for the Vite plugin's icons,
// stripping its types alone, which needs one.

/** Describes an ellipse on the mark's grid. */
export interface Ellipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** Describes a circle on the mark's grid. */
export interface Circle {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/**
 * The fuzzball's shapes, for an inline `<svg>` that colors the body and the
 * fur itself, such as with the palette's accent.
 */
export const FUZZBALL = {
  viewBox: "0 0 32 32",
  body: { cx: 16, cy: 17.2, r: 10.4 } satisfies Circle,
  /** The strands around the body, drawn as round-capped strokes. */
  fur: {
    d: "M24.2 17.15Q25.93 17.34 27.44 19.45M23.92 19.31Q25.5 19.93 26.36 22.34M23.49 20.54Q25 21.43 25.51 23.99M22.81 21.77Q24.12 22.88 24.17 25.45M21.39 23.38Q22.45 24.9 21.88 27.54M20.44 24.09Q21.14 25.54 20.15 27.82M18.91 24.86Q19.38 26.67 17.94 28.95M16.67 25.37Q16.59 26.85 14.68 28.26M14.67 25.29Q14.16 27.16 11.72 28.48M13.32 24.95Q12.56 26.55 10.05 27.29M12.2 24.46Q11.35 25.66 8.99 25.83M10.49 23.28Q9.36 24.24 7.01 23.81M9.55 22.26Q8.19 23.08 5.86 22.29M8.71 20.95Q7.12 21.55 4.87 20.34M7.99 18.96Q6.12 19.17 4.06 17.4M7.8 17.18Q6.03 16.98 4.5 14.84M7.98 15.5Q6.28 14.93 5.21 12.52M8.49 13.9Q7.12 13.09 6.7 10.65M9.67 11.99Q8.29 10.6 8.37 7.82M10.77 10.89Q9.77 9.37 10.42 6.79M11.74 10.19Q11.1 8.75 12.16 6.54M13.27 9.47Q12.85 7.67 14.35 5.44M15.4 9.02Q15.43 6.42 17.7 3.93M17.2 9.09Q17.76 6.73 20.43 4.93M18.96 9.55Q19.93 7.61 22.75 6.65M19.67 9.87Q20.57 8.49 23.07 8.16M21.78 11.38Q23.11 10.33 25.62 10.78M22.9 12.77Q24.39 12.05 26.72 13.04M23.31 13.49Q24.97 12.86 27.3 14.07M24.07 15.76Q25.67 15.68 27.37 17.47",
    width: 2.8,
  },
  eyes: [
    { cx: 13.4, cy: 17, rx: 2.3, ry: 3 },
    { cx: 20.6, cy: 17, rx: 2.3, ry: 3 },
  ] satisfies readonly Ellipse[],
  glints: [
    { cx: 14.2, cy: 15.8, r: 0.85 },
    { cx: 21.4, cy: 15.8, r: 0.85 },
  ] satisfies readonly Circle[],
  /** The eyes' color, the same in every palette, since they sit on the fur. */
  ink: "#14171b",
  glint: "#ffffff",
} as const;

/**
 * Describes a point on the fuzzball's grid, y down: about its body's middle,
 * as its fur, its faces and its sparks are laid out, unless it is said to
 * be on the mark's view box.
 */
export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

/** How many units of the fuzzball's grid its view box is across, its body and fur placed on it. */
export const FUZZBALL_GRID = 32;

/** Returns a point on the mark's view box as it lies from the body's middle. */
export function aboutBody(point: GridPoint): GridPoint {
  return { x: point.x - FUZZBALL.body.cx, y: point.y - FUZZBALL.body.cy };
}

/** A whole turn, in radians. */
const TURN = 2 * Math.PI;

/**
 * Names one of the fuzzball's faces, and what the art kit shows it for:
 * `rest`, the brand mark's; `blink`, now and then; `set`, thrusting or
 * firing; `eep`, a near miss; `happy`, a stray home; `dizzy`, knocked
 * about; `sleepy`, waiting; `plead`, a stray adrift; and `squeeze`, in a
 * dash.
 */
export type FuzzballFace =
  | "rest"
  | "blink"
  | "set"
  | "eep"
  | "happy"
  | "dizzy"
  | "sleepy"
  | "plead"
  | "squeeze";

/** Every face, in the order the art kit's sheet shows them. */
export const FUZZBALL_FACES: readonly FuzzballFace[] = [
  "rest",
  "blink",
  "set",
  "eep",
  "happy",
  "dizzy",
  "sleepy",
  "plead",
  "squeeze",
];

/** Names what an eye's mark is drawn in: the eyes' ink, or the glints' white (`FUZZBALL.ink`, `FUZZBALL.glint`). */
export type EyeTone = "eye" | "glint";

/** Describes an ellipse of a face. */
export interface EyeEllipse {
  readonly kind: "ellipse";
  readonly tone: EyeTone;
  readonly at: GridPoint;
  readonly rx: number;
  readonly ry: number;
}

/** Describes a polygon of a face, filled. */
export interface EyePolygon {
  readonly kind: "polygon";
  readonly tone: EyeTone;
  readonly points: readonly GridPoint[];
}

/** Describes a line of a face through points, round at its ends and its corners. */
export interface EyeStroke {
  readonly kind: "stroke";
  readonly tone: EyeTone;
  readonly points: readonly GridPoint[];
  readonly width: number;
}

/** Describes a mark of a face, on the mark's grid about its body's middle. */
export type EyeMark = EyeEllipse | EyePolygon | EyeStroke;

/**
 * Says how far a fuzzball's eyes shift toward what it looks at, on its
 * grid: across and down for a full look, and whether a look takes them
 * about the body's middle, from a little right of it, where the mark has
 * them.
 */
export interface FuzzballLook {
  readonly across: number;
  readonly down: number;
  readonly centered: boolean;
}

/** Says how a fuzzball's eyes are drawn. With none of it, they are the mark's own. */
export interface EyesPose {
  /** Its face; the mark's own is `rest`. */
  readonly face?: FuzzballFace;
  /** The way it looks, toward which its eyes shift, a look longer than a unit counted as one; without one, the face's own (`restingLook()`). */
  readonly look?: GridPoint;
  /** How far a look shifts its eyes; `FUZZBALL_LOOK` unless asked for more. */
  readonly range?: FuzzballLook;
  /** Whether it is drawn in its small form: larger eyes further apart, heavier lines and no glints. */
  readonly small?: boolean;
  /** How far toward its smallest the small form is drawn, from 0, as at 12 pixels across its grid, to 1, as at 8: its eyes grow and part. */
  readonly tiny?: number;
}

/**
 * How far the eyes shift for a look, as the brick games have always moved
 * them: a little, from where the mark has them.
 */
export const FUZZBALL_LOOK: FuzzballLook = {
  across: 1.3,
  down: 0.9,
  centered: false,
};

/**
 * How far the eyes shift for a look as the art kit shifts them, for a
 * fuzzball that acts with its eyes, as a pilot does: further, and about
 * the body's middle.
 */
export const FUZZBALL_LOOK_FAR: FuzzballLook = {
  across: 1.9,
  down: 1.35,
  centered: true,
};

/** The way a face looks unless told where: a stray adrift pleads upward. */
const RESTING_LOOKS: Readonly<Partial<Record<FuzzballFace, GridPoint>>> = {
  plead: { x: 0, y: -0.75 },
};

/** The mark's eyes and their glints, about the body's middle, from its left. */
const EYES = FUZZBALL.eyes.map((eye, i) => {
  const glint = FUZZBALL.glints[i];
  if (!glint) throw new Error("The fuzzball's mark has an eye with no glint.");
  return {
    at: aboutBody({ x: eye.cx, y: eye.cy }),
    rx: eye.rx,
    ry: eye.ry,
    glint: aboutBody({ x: glint.cx, y: glint.cy }),
    shine: glint.r,
  };
});

/** How far right of the body's middle the mark's eyes sit, between them, and half the way from one to the other. */
const EYES_RIGHT = EYES.reduce((sum, { at }) => sum + at.x, 0) / EYES.length;
const EYES_APART = ((EYES.at(-1)?.at.x ?? 0) - (EYES[0]?.at.x ?? 0)) / 2;

/** Returns the way a face looks unless told where: up for `plead`, straight out for the rest. */
export function restingLook(face: FuzzballFace): GridPoint {
  return RESTING_LOOKS[face] ?? { x: 0, y: 0 };
}

/**
 * Returns how far a look shifts the eyes from where the mark has them, on
 * the grid, a look longer than a unit counted as a unit, so a scene that
 * bakes the eyes looking straight out moves them by this.
 */
export function lookOffset(
  look: GridPoint,
  range: FuzzballLook = FUZZBALL_LOOK,
): GridPoint {
  const far = Math.hypot(look.x, look.y);
  const way = far > 1 ? { x: look.x / far, y: look.y / far } : look;
  const centering = range.centered ? EYES_RIGHT * Math.min(1, far) : 0;
  return {
    x: way.x * range.across - centering,
    y: way.y * range.down,
  };
}

/**
 * Returns a face's eyes looking a way, on the grid about the body's middle:
 * each eye's marks of the eyes' ink first, from the left, then their
 * glints, which lie over them.
 */
export function eyesOf({
  face = "rest",
  look = restingLook(face),
  range = FUZZBALL_LOOK,
  small = false,
  tiny = 0,
}: EyesPose = {}): readonly EyeMark[] {
  const offset = lookOffset(look, range);
  // The small form's eyes sit further apart, the more so the smaller it is.
  const spread = small ? EYES_APART * (lerp(1.14, 1.42, tiny) - 1) : 0;
  const form = { small, tiny };
  const marks = EYES.flatMap((eye, i) => {
    const side = i === 0 ? -1 : 1;
    const moved = { x: offset.x + side * spread, y: offset.y };
    return eyeMarks(
      face,
      {
        ...eye,
        at: shifted(eye.at, moved),
        glint: shifted(eye.glint, moved),
      },
      side,
      form,
    );
  });
  return [
    ...marks.filter(({ tone }) => tone === "eye"),
    ...marks.filter(({ tone }) => tone === "glint"),
  ];
}

/** Describes one of the mark's eyes as a face draws it: its middle, its radii, and its glint's middle and radius. */
interface Eye {
  readonly at: GridPoint;
  readonly rx: number;
  readonly ry: number;
  readonly glint: GridPoint;
  readonly shine: number;
}

/** Returns the marks of one eye of a face, -1 its side for the eye on the left and 1 for the one on the right. */
function eyeMarks(
  face: FuzzballFace,
  eye: Eye,
  side: -1 | 1,
  { small, tiny }: { readonly small: boolean; readonly tiny: number },
): readonly EyeMark[] {
  const { x, y } = eye.at;
  // The small form's eyes are larger for the body, and its lines heavier, to hold a pixel.
  const grow = small ? lerp(1.3, 1.6, tiny) : 1;
  const rx = eye.rx * grow;
  const ry = eye.ry * grow;
  const line = small ? lerp(1.9, 2.4, tiny) : 1.35;
  const glint = (dx: number, dy: number, r: number): readonly EyeMark[] =>
    small ? [] : [ellipse("glint", { x: x + dx, y: y + dy }, r, r)];
  const stroke = (points: readonly GridPoint[], width: number): EyeStroke => ({
    kind: "stroke",
    tone: "eye",
    points,
    width,
  });
  switch (face) {
    case "rest":
      return [
        ellipse("eye", eye.at, rx, ry),
        ...(small ? [] : [ellipse("glint", eye.glint, eye.shine, eye.shine)]),
      ];
    case "blink":
      return [
        stroke(
          arcThrough(
            { x: x - rx, y: y + 0.5 },
            { x, y: y + 1.1 },
            { x: x + rx, y: y + 0.5 },
          ),
          line * 1.05,
        ),
      ];
    case "happy":
      return [
        stroke(
          arcThrough(
            { x: x - rx * 1.05, y: y + 1.3 },
            { x, y: y - 1.7 },
            { x: x + rx * 1.05, y: y + 1.3 },
          ),
          line * 1.15,
        ),
      ];
    case "squeeze":
      // "> <": each eye a chevron, its point toward the other.
      return [
        stroke(
          [
            { x: x + side * rx * 0.95, y: y - ry * 0.72 },
            { x: x - side * rx * 0.8, y: y + 0.1 },
            { x: x + side * rx * 0.95, y: y + ry * 0.72 },
          ],
          line * 1.1,
        ),
      ];
    case "set": {
      // The lids come down straight across the top third.
      const lid = y - ry + 2 * ry * 0.34;
      const glintAt = { x: eye.glint.x, y: lid + 0.55 };
      return [
        polygon("eye", below(ellipsePoints(eye.at, rx, ry), lid, 0)),
        stroke(
          [
            { x: x - rx * 0.98, y: lid },
            { x: x + rx * 0.98, y: lid },
          ],
          line * 0.6,
        ),
        ...(small
          ? []
          : [
              polygon(
                "glint",
                below(
                  ellipsePoints(glintAt, eye.shine, eye.shine, 16),
                  lid + 0.38,
                  0,
                ),
              ),
            ]),
      ];
    }
    case "sleepy": {
      // Half shut, the lids drooping toward the outside.
      const lid = y + ry * 0.16;
      const slope = side * 0.2;
      return [
        polygon("eye", below(ellipsePoints(eye.at, rx, ry), lid, slope, x)),
        stroke(
          [
            { x: x - rx * 1.15, y: lid - rx * 1.15 * slope },
            { x: x + rx * 1.15, y: lid + rx * 1.15 * slope },
          ],
          line * 0.8,
        ),
      ];
    }
    case "eep":
      return [
        ellipse(
          "eye",
          { x: x + side * 0.35, y: y - 0.6 },
          rx * 1.27,
          ry * 1.08,
        ),
        ...glint(side * 0.35 + 1.15, -2.05, 0.58),
      ];
    case "plead":
      return [
        ellipse("eye", { x, y: y - 0.3 }, rx * 1.16, ry * 1.12),
        ...glint(0.75, -1.75, 1.2),
        ...glint(-0.95, 1.0, 0.55),
      ];
    case "dizzy":
      return small
        ? [ellipse("eye", eye.at, rx * 0.8, rx * 0.8)]
        : [stroke(spiral(eye.at, side), 0.95)];
  }
}

/** Returns an ellipse of a face. */
function ellipse(
  tone: EyeTone,
  at: GridPoint,
  rx: number,
  ry: number,
): EyeEllipse {
  return { kind: "ellipse", tone, at, rx, ry };
}

/** Returns a polygon of a face. */
function polygon(tone: EyeTone, points: readonly GridPoint[]): EyePolygon {
  return { kind: "polygon", tone, points };
}

/** Returns a spiral about an eye's middle, wound one way for the eye on the left and the other for the one on the right. */
function spiral(at: GridPoint, side: -1 | 1): readonly GridPoint[] {
  return Array.from({ length: 45 }, (_, i) => {
    const share = i / 44;
    const angle = side * share * TURN * 1.75 + 1;
    const radius = 0.25 + share * 2.55;
    return {
      x: at.x + Math.cos(angle) * radius,
      y: at.y + Math.sin(angle) * radius,
    };
  });
}

/** Returns the points around an ellipse, clockwise from its right. */
function ellipsePoints(
  at: GridPoint,
  rx: number,
  ry: number,
  count = 32,
): readonly GridPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * TURN;
    return { x: at.x + Math.cos(angle) * rx, y: at.y + Math.sin(angle) * ry };
  });
}

/**
 * Returns what of a polygon lies below a line: the line at a height where
 * it crosses `across`, falling `slope` for each unit to the right.
 */
function below(
  points: readonly GridPoint[],
  height: number,
  slope: number,
  across = 0,
): readonly GridPoint[] {
  const under = ({ x, y }: GridPoint): number =>
    y - (height + (x - across) * slope);
  return points.flatMap((a, i) => {
    const b = points[(i + 1) % points.length] ?? a;
    const da = under(a);
    const db = under(b);
    const kept = da >= 0 ? [a] : [];
    if (da >= 0 === db >= 0) return kept;
    const share = da / (da - db);
    return [...kept, { x: lerp(a.x, b.x, share), y: lerp(a.y, b.y, share) }];
  });
}

/** Returns the points of a quadratic curve bent to pass through a middle point, from its start to its end. */
function arcThrough(
  from: GridPoint,
  through: GridPoint,
  to: GridPoint,
  count = 12,
): readonly GridPoint[] {
  const control = {
    x: 2 * through.x - (from.x + to.x) / 2,
    y: 2 * through.y - (from.y + to.y) / 2,
  };
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const u = 1 - t;
    return {
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    };
  });
}

/** Returns a point moved by an offset. */
function shifted(point: GridPoint, by: GridPoint): GridPoint {
  return { x: point.x + by.x, y: point.y + by.y };
}

/** Describes one of the fuzzball's strands of fur: a curve from inside its body out to its tip, about its body's middle, on its grid. */
export interface Strand {
  readonly from: GridPoint;
  readonly control: GridPoint;
  readonly to: GridPoint;
}

/** Says how the fuzzball's fur is combed. With none of it, it is the mark's own. */
export interface FurPose {
  /**
   * Its static step, from 0, flat, as the mark is, through 1, lifted, and
   * 2, standing, to `MOST_LIFT`, on end and sparking; between two steps, the
   * fur is between them.
   */
  readonly lift?: number;
  /** The push on it, about a unit long for a thrust and two for a dash; its fur sweeps the other way. */
  readonly lean?: GridPoint;
  /** How far its fur stands out in a fright, from 0 to 1. */
  readonly puff?: number;
  /** Whether it is drawn in its small form: every other strand, a little longer, and wider (`SMALL_FUR_WIDTH`). */
  readonly small?: boolean;
  /** A radius about its body's middle that its fur stays inside, as the glass around it holds it. */
  readonly within?: number;
}

/** Describes a mark of static about the fur, on the grid: a tick, a jagged line through its points, or a star, a polygon. */
export interface SparkMark {
  readonly kind: "tick" | "star";
  readonly points: readonly GridPoint[];
}

/** Static's last step, at which the fur stands on end and sparks. */
export const MOST_LIFT = 3;

/** The step past which static sparks about the fur, so fur eased toward its last step sparks before it gets there. */
export const SPARKS_FROM = 2.5;

/** How wide a strand of the small form's fur is, on the grid: a quarter wider than the mark's, to hold a pixel. */
export const SMALL_FUR_WIDTH = FUZZBALL.fur.width * 1.25;

/**
 * How static's sparks are drawn, as the art kit draws them: each mark a
 * faint halo in the fuzzball's ink beneath a bright core.
 *
 * The halo is drawn at `haloAlpha`: a tick's a line `tickHalo` units of the
 * grid wide, and a star's the star with a line `starHalo` wide round it,
 * round at its corners. A tick's core is a line `tickCore` wide, or
 * `tickCoreLeast` CSS pixels where that is wider, so it still shows small,
 * and each line is round at its ends and its corners. The core's color is
 * the ink mixed toward the text by `coreMix.light` in a light palette, and
 * toward white by `coreMix.dark` in a dark one.
 */
export const SPARK_LOOK = {
  haloAlpha: 0.4,
  tickHalo: 1.5,
  tickCore: 0.55,
  tickCoreLeast: 0.8,
  starHalo: 1.1,
  coreMix: { light: 0.4, dark: 0.82 },
} as const;

/** What each step of static does to the fur: how far each strand straightens, how much longer it grows, and how unevenly, every other strand taller. */
const LIFT = {
  straight: [0, 0.5, 0.88, 1],
  longer: [0, 1.1, 2.3, 3.3],
  uneven: [0, 0.1, 0.45, 0.85],
} as const;

/** How much shorter the shorter strands grow than the taller, as a share of how unevenly the fur is lifted. */
const SHORTER = 0.7;

/** How far a push of a unit sweeps the fur's tips, on the grid. */
const SWEEP = 3.5;

/** How far a full puff stands the fur's tips out, and rounds each strand out, on the grid. */
const PUFF = { out: 1.7, round: 1.2 } as const;

/** How much longer the small form's strands are, on the grid. */
const SMALL_LONGER = 0.5;

/** How far past the body's edge a tip lies at the nearest, swept flat against it, on the grid. */
const LIES_FLAT = 0.5;

/**
 * The jumps of static's sparks, drawn once from the art kit's seed for a
 * full charge on its sheet.
 *
 * Each says from which tall strand's tip it jumps to the next tall one's;
 * how far its bolt kinks out, at 0.58 of the way, and back, at 0.42; and the
 * star beside it: how far it turns back from the tip, how far past it it
 * lies, how far its points reach and how far it is turned.
 */
const JUMPS = [
  {
    strand: 8,
    out: 1.104,
    back: -0.292,
    star: { turn: 0.346, past: 2.771, reach: 1.34, tilt: 0.192 },
  },
  {
    strand: 18,
    out: 1.171,
    back: -0.174,
    star: { turn: 0.362, past: 2.568, reach: 1.532, tilt: 0.494 },
  },
  {
    strand: 26,
    out: 1.134,
    back: -0.227,
    star: { turn: 0.315, past: 3.227, reach: 1.386, tilt: 0.52 },
  },
] as const;

/** How far past a tip a spark's bolt leaves it and reaches the next, on the grid. */
const BOLT_OUT = 1.7;

/** How far a star's short points reach, as a share of its long ones'. */
const STAR_WAIST = 0.3;

/**
 * Returns the fuzzball's strands of fur read from its path, each a move to
 * a point and a quadratic curve from it, about its body's middle.
 *
 * @throws {Error} for a strand drawn any other way.
 */
export function strandsOf(path: string): readonly Strand[] {
  return path
    .split("M")
    .slice(1)
    .map((strand) => {
      const [
        fromX = NaN,
        fromY = NaN,
        controlX = NaN,
        controlY = NaN,
        toX = NaN,
        toY = NaN,
        ...rest
      ] = strand.replace("Q", " ").trim().split(/\s+/).map(Number);
      if (
        rest.length > 0 ||
        [fromX, fromY, controlX, controlY, toX, toY].some(Number.isNaN)
      ) {
        throw new Error(
          `The fuzzball's fur has a strand it can't read: M${strand}`,
        );
      }
      return {
        from: aboutBody({ x: fromX, y: fromY }),
        control: aboutBody({ x: controlX, y: controlY }),
        to: aboutBody({ x: toX, y: toY }),
      };
    });
}

/** The fuzzball's own thirty strands of fur, read from its path, clockwise from its right. */
export const FUZZBALL_STRANDS: readonly Strand[] = strandsOf(FUZZBALL.fur.d);

/**
 * Returns the fuzzball's fur combed for a pose: lifted and straightened by
 * static, every other strand taller as it lifts, so the fringe breaks into
 * points; stood out and rounded in a fright; swept away from a push on it,
 * as `sweptFur()` sweeps it; and held inside what is around it. With none
 * of these it is the mark's own fur, give or take a rounding.
 */
export function combFur({
  lift = 0,
  lean = { x: 0, y: 0 },
  puff = 0,
  small = false,
  within = Infinity,
}: FurPose = {}): readonly Strand[] {
  const straight = ramp(LIFT.straight, lift);
  const longer = ramp(LIFT.longer, lift);
  const uneven = ramp(LIFT.uneven, lift);
  const sweep = sweepOf(lean);
  const most = within - FUZZBALL.fur.width / 2;
  // The small form keeps every other strand, so its fringe still shows as bumps.
  const kept = small
    ? FUZZBALL_STRANDS.filter((_, i) => i % 2 === 0)
    : FUZZBALL_STRANDS;
  return kept.map(({ from, control, to }, i) => {
    const root = Math.atan2(from.y, from.x);
    const swirl =
      ((Math.atan2(to.y, to.x) - root + TURN * 1.5) % TURN) - TURN / 2;
    const grown =
      longer +
      uneven * (i % 2 === 0 ? 1 : -SHORTER) +
      puff * PUFF.out +
      (small ? SMALL_LONGER : 0);
    const tip = polar(
      root + swirl * (1 - straight),
      Math.hypot(to.x, to.y) + grown,
    );
    // The bend moves with the tip, rounds out in a fright and pulls straight with a charge.
    const carried = {
      x: control.x + (tip.x - to.x) / 2,
      y: control.y + (tip.y - to.y) / 2,
    };
    const fluff = polar(Math.atan2(carried.y, carried.x), puff * PUFF.round);
    const swept = sweptStrand(
      {
        from,
        control: {
          x: lerp(carried.x + fluff.x, (from.x + tip.x) / 2, straight),
          y: lerp(carried.y + fluff.y, (from.y + tip.y) / 2, straight),
        },
        to: tip,
      },
      i,
      sweep,
    );
    return {
      from,
      control: heldBetween(swept.control, 0, most),
      to: heldBetween(swept.to, FUZZBALL.body.r + LIES_FLAT, most),
    };
  });
}

/**
 * Returns fur swept away from a push on it, as a thrust lays it back and a
 * dash sweeps it flat: each tip carried the other way, those on the lee
 * side furthest, those facing the push laid on the body; and past a
 * thrust's push the lee side breaks into tufts, every other strand
 * streaming further. Its roots stay where they grew, and with no push it
 * is the fur it was handed.
 */
export function sweptFur(
  fur: readonly Strand[],
  lean: GridPoint,
): readonly Strand[] {
  const sweep = sweepOf(lean);
  if (sweep.x === 0 && sweep.y === 0) return fur;
  return fur.map((strand, i) => {
    const swept = sweptStrand(strand, i, sweep);
    return {
      ...swept,
      to: heldBetween(swept.to, FUZZBALL.body.r + LIES_FLAT, Infinity),
    };
  });
}

/**
 * Returns the marks of static at its last step, about fur on end: three
 * jagged ticks, each jumping from one tall strand's tip to the next tall
 * one's, a third of the way round from each other, and a small star beside
 * each, a little further out. They follow the fur's tips, wherever it is
 * combed.
 *
 * @throws {RangeError} for fur of another number of strands than the
 *   fuzzball's own, such as the small form's.
 */
export function sparksOf(fur: readonly Strand[]): readonly SparkMark[] {
  if (fur.length !== FUZZBALL_STRANDS.length) {
    throw new RangeError(
      `Static sparks about the fuzzball's ${String(FUZZBALL_STRANDS.length)} strands, not ${String(fur.length)}`,
    );
  }
  return JUMPS.flatMap(({ strand, out, back, star }) => {
    const from = tipOf(fur, strand);
    const to = tipOf(fur, strand + 2);
    const start = outFrom(from, BOLT_OUT);
    const end = outFrom(to, BOLT_OUT);
    const kink = (share: number, by: number): GridPoint =>
      outFrom(
        {
          x: lerp(start.x, end.x, share),
          y: lerp(start.y, end.y, share),
        },
        by,
      );
    const middle = polar(
      Math.atan2(from.y, from.x) - star.turn,
      Math.hypot(from.x, from.y) + star.past,
    );
    return [
      { kind: "tick", points: [start, kink(0.58, out), kink(0.42, back), end] },
      {
        kind: "star",
        points: Array.from({ length: 8 }, (_, k) =>
          polar(
            star.tilt + (k / 8) * TURN,
            k % 2 === 0 ? star.reach : star.reach * STAR_WAIST,
            middle,
          ),
        ),
      },
    ];
  });
}

/** Returns how a push sweeps the fur: the other way, `SWEEP` for each unit of it. */
function sweepOf(lean: GridPoint): GridPoint {
  return { x: -lean.x * SWEEP, y: -lean.y * SWEEP };
}

/**
 * Returns a strand, the `i`th of its fur, swept: its tip carried along the
 * sweep, the further the more it lies to the lee, its bend a little.
 */
function sweptStrand(
  { from, control, to }: Strand,
  i: number,
  sweep: GridPoint,
): Strand {
  const pushed = Math.hypot(sweep.x, sweep.y);
  if (pushed === 0) return { from, control, to };
  const lee =
    (to.x * sweep.x + to.y * sweep.y) / (Math.hypot(to.x, to.y) * pushed);
  const tuft =
    lee > 0
      ? 1 + clamp(pushed / SWEEP - 1, 0, 1) * lee * (i % 2 === 0 ? 0.3 : -0.25)
      : 1;
  const give = (0.75 + 0.25 * lee) * tuft;
  return {
    from,
    control: { x: control.x + sweep.x * 0.3, y: control.y + sweep.y * 0.3 },
    to: { x: to.x + sweep.x * give, y: to.y + sweep.y * give },
  };
}

/** Returns a strand's tip, or nowhere for one the fur lacks. */
function tipOf(fur: readonly Strand[], i: number): GridPoint {
  return fur[i]?.to ?? { x: NaN, y: NaN };
}

/** Returns a point moved further out from the body's middle, or nearer it for a negative distance. */
function outFrom(point: GridPoint, by: number): GridPoint {
  const far = Math.hypot(point.x, point.y) || 1;
  return { x: point.x * (1 + by / far), y: point.y * (1 + by / far) };
}

/** Returns a point held between two distances from the body's middle. */
function heldBetween(point: GridPoint, least: number, most: number): GridPoint {
  const far = Math.hypot(point.x, point.y) || 1;
  const held = clamp(far, least, Math.max(least, most));
  return { x: (point.x / far) * held, y: (point.y / far) * held };
}

/** Returns the value a step of the way along a list, between its entries, at the first before it and the last past it. */
function ramp(steps: readonly number[], step: number): number {
  const at = clamp(step, 0, steps.length - 1);
  const i = Math.min(Math.floor(at), steps.length - 2);
  return lerp(steps[i] ?? 0, steps[i + 1] ?? 0, at - i);
}

/** Returns the point at an angle, in radians clockwise from the right, and a distance from a middle. */
function polar(
  angle: number,
  radius: number,
  middle: GridPoint = { x: 0, y: 0 },
): GridPoint {
  return {
    x: middle.x + Math.cos(angle) * radius,
    y: middle.y + Math.sin(angle) * radius,
  };
}

/** Returns the value a share of the way from one number to another. */
function lerp(from: number, to: number, share: number): number {
  return from + (to - from) * share;
}

/** Returns a value held between two others. */
function clamp(value: number, least: number, most: number): number {
  return Math.min(most, Math.max(least, value));
}

/** Says how a fuzzball is posed: its face, its look and its fur. With none of it, it is the mark. */
export interface FuzzballPose extends EyesPose, FurPose {}

/** Describes a posed fuzzball, on the mark's grid about its body's middle, its body the mark's own. */
export interface FuzzballShape {
  /** Its strands of fur, each drawn `furWidth` wide, round at its ends. */
  readonly fur: readonly Strand[];
  readonly furWidth: number;
  /** Its eyes' marks, back to front. */
  readonly eyes: readonly EyeMark[];
  /** Static's sparks about its fur, from `SPARKS_FROM` on, which the small form leaves out. */
  readonly sparks: readonly SparkMark[];
  /** How far its fur reaches from its middle, its strands' round ends included, its sparks left out. */
  readonly reach: number;
}

/** Says which form a fuzzball is drawn in, as `fuzzballForm()` gives it for a size. */
export interface FuzzballForm {
  readonly small: boolean;
  readonly tiny: number;
}

/** The size, in CSS pixels across the mark's grid of 32 units, at and under which a fuzzball is drawn in its small form. */
export const SMALL_UNDER = 12;

/** How many CSS pixels smaller than `SMALL_UNDER` the small form is at its smallest. */
const SMALLEST_BY = 4;

/**
 * Returns a fuzzball posed, as plain geometry on the mark's grid about its
 * body's middle. With no pose it is the mark.
 */
export function fuzzballShape(pose: FuzzballPose = {}): FuzzballShape {
  const fur = combFur(pose);
  const furWidth = pose.small ? SMALL_FUR_WIDTH : FUZZBALL.fur.width;
  return {
    fur,
    furWidth,
    eyes: eyesOf(pose),
    sparks: (pose.lift ?? 0) >= SPARKS_FROM && !pose.small ? sparksOf(fur) : [],
    reach:
      Math.max(...fur.map(({ to }) => Math.hypot(to.x, to.y))) + furWidth / 2,
  };
}

/**
 * Returns the form a fuzzball is drawn in at a size, in CSS pixels across
 * its grid: its own above `SMALL_UNDER`, and its small form at and under
 * it, smaller still down to 8 pixels, where it is at its smallest.
 */
export function fuzzballForm(pixels: number): FuzzballForm {
  return {
    small: pixels <= SMALL_UNDER,
    tiny: clamp((SMALL_UNDER - pixels) / SMALLEST_BY, 0, 1),
  };
}

/** The fur's color: one for both color schemes, or one for each. */
export type FuzzballFill =
  string | { readonly light: string; readonly dark: string };

/** Describes a circle of a face, on the mark's view box. */
export interface SvgCircle {
  readonly kind: "circle";
  readonly tone: EyeTone;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/** Describes an ellipse of a face, on the mark's view box. */
export interface SvgEllipse {
  readonly kind: "ellipse";
  readonly tone: EyeTone;
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** Describes a polygon of a face, on the mark's view box, its points as SVG lists them. */
export interface SvgPolygon {
  readonly kind: "polygon";
  readonly tone: EyeTone;
  readonly points: string;
}

/** Describes a line of a face, on the mark's view box, its points as SVG lists them, drawn round at its ends and its corners. */
export interface SvgPolyline {
  readonly kind: "polyline";
  readonly tone: EyeTone;
  readonly points: string;
  readonly width: number;
}

/**
 * Describes a mark of a face as SVG draws it, in its tone's color: an
 * ellipse whose radii agree is a circle.
 */
export type SvgEyeMark = SvgCircle | SvgEllipse | SvgPolygon | SvgPolyline;

/**
 * Describes a mark of static as SVG draws it, on the mark's view box, its
 * points as SVG lists them, as `SPARK_LOOK` says: a tick, a line through
 * them, or a star, a polygon.
 */
export interface SvgSparkMark {
  readonly kind: "tick" | "star";
  readonly points: string;
}

/**
 * Describes a posed fuzzball as SVG draws it, on the mark's view box, its
 * numbers to a hundredth of a unit of the grid, as the mark's own are: its
 * body is the mark's.
 *
 * Fur lifted, puffed or swept, and static's sparks, reach past the view
 * box, the body never growing, so what draws it lets them show past it, as
 * far as `reach` says.
 */
export interface FuzzballDrawing {
  /** Its fur, as a path's `d`, each strand a move and a quadratic curve. */
  readonly fur: string;
  readonly furWidth: number;
  /** Its eyes' marks, back to front. */
  readonly eyes: readonly SvgEyeMark[];
  /** Static's marks, over the rest. */
  readonly sparks: readonly SvgSparkMark[];
  /** How far it reaches from the body's middle, on the grid: its fur, and its sparks with their halos. */
  readonly reach: number;
}

/** Says how `fuzzballSvg()` draws the fuzzball. */
export interface FuzzballSvgOptions {
  /**
   * Whether its eyes have their glints, as they do unless left out: leave
   * them out for an image drawn 16 pixels across, where each is under half
   * a pixel and only turns the eye grey.
   */
  readonly withGlints?: boolean;
  /** Its face, the mark's own unless another is given. */
  readonly face?: FuzzballFace;
}

/**
 * Returns a posed fuzzball as SVG draws it, on the mark's view box, for a
 * page's own `<svg>` to bind. With no pose it is the mark, number for
 * number.
 */
export function fuzzballDrawing(pose: FuzzballPose = {}): FuzzballDrawing {
  const shape = fuzzballShape(pose);
  const halo = Math.max(SPARK_LOOK.tickHalo, SPARK_LOOK.starHalo) / 2;
  return {
    fur: furPath(shape.fur),
    furWidth: shape.furWidth,
    eyes: shape.eyes.map(svgEyeMark),
    sparks: shape.sparks.map(({ kind, points }) => ({
      kind,
      points: pointsOf(points),
    })),
    reach: Math.max(
      shape.reach,
      ...shape.sparks.flatMap(({ points }) =>
        points.map(({ x, y }) => Math.hypot(x, y) + halo),
      ),
    ),
  };
}

/**
 * Returns the fuzzball as an SVG file, its fur in the given color, at rest
 * unless given another face.
 */
export function fuzzballSvg(
  fill: FuzzballFill,
  { withGlints = true, face = "rest" }: FuzzballSvgOptions = {},
): string {
  const { light, dark } =
    typeof fill === "string" ? { light: fill, dark: fill } : fill;
  const { body, fur } = FUZZBALL;
  const furStyle = (color: string): string =>
    `.body{fill:${color}}.fur{stroke:${color}}`;
  const darkStyle =
    dark === light
      ? ""
      : `@media (prefers-color-scheme:dark){${furStyle(dark)}}`;
  const eyes = eyesOf({ face }).map(svgEyeMark);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FUZZBALL.viewBox}">`,
    `<style>${furStyle(light)}${darkStyle}</style>`,
    `<circle class="body" cx="${body.cx}" cy="${body.cy}" r="${body.r}"/>`,
    `<path class="fur" d="${fur.d}" fill="none" stroke-width="${fur.width}" stroke-linecap="round"/>`,
    ...eyes
      .filter(({ tone }) => withGlints || tone !== "glint")
      .map(eyeElement),
    "</svg>",
    "",
  ].join("\n");
}

/** Returns a mark of a face as an SVG element, in the eyes' ink or the glints' white. */
function eyeElement(mark: SvgEyeMark): string {
  const color = mark.tone === "glint" ? FUZZBALL.glint : FUZZBALL.ink;
  switch (mark.kind) {
    case "circle":
      return `<circle cx="${String(mark.cx)}" cy="${String(mark.cy)}" r="${String(mark.r)}" fill="${color}"/>`;
    case "ellipse":
      return `<ellipse cx="${String(mark.cx)}" cy="${String(mark.cy)}" rx="${String(mark.rx)}" ry="${String(mark.ry)}" fill="${color}"/>`;
    case "polygon":
      return `<polygon points="${mark.points}" fill="${color}"/>`;
    case "polyline":
      return `<polyline points="${mark.points}" fill="none" stroke="${color}" stroke-width="${String(mark.width)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

/** Returns a mark of a face as SVG draws it, on the mark's view box. */
function svgEyeMark(mark: EyeMark): SvgEyeMark {
  const { tone } = mark;
  switch (mark.kind) {
    case "ellipse": {
      const { x, y } = onViewBox(mark.at);
      return mark.rx === mark.ry
        ? { kind: "circle", tone, cx: x, cy: y, r: hundredths(mark.rx) }
        : {
            kind: "ellipse",
            tone,
            cx: x,
            cy: y,
            rx: hundredths(mark.rx),
            ry: hundredths(mark.ry),
          };
    }
    case "polygon":
      return { kind: "polygon", tone, points: pointsOf(mark.points) };
    case "stroke":
      return {
        kind: "polyline",
        tone,
        points: pointsOf(mark.points),
        width: hundredths(mark.width),
      };
  }
}

/** Returns strands of fur as a path's `d` on the mark's view box, as the mark's own is written. */
function furPath(fur: readonly Strand[]): string {
  return fur
    .map(({ from, control, to }) => `M${xy(from)}Q${xy(control)} ${xy(to)}`)
    .join("");
}

/** Returns points as SVG lists a polygon's or a line's. */
function pointsOf(points: readonly GridPoint[]): string {
  return points
    .map(onViewBox)
    .map(({ x, y }) => `${String(x)},${String(y)}`)
    .join(" ");
}

/** Returns a point about the body's middle as a path on the mark's view box writes it. */
function xy(point: GridPoint): string {
  const { x, y } = onViewBox(point);
  return `${String(x)} ${String(y)}`;
}

/** Returns a point about the body's middle on the mark's view box, to a hundredth. */
function onViewBox({ x, y }: GridPoint): GridPoint {
  return {
    x: hundredths(x + FUZZBALL.body.cx),
    y: hundredths(y + FUZZBALL.body.cy),
  };
}

/** Returns a number to a hundredth, as the mark's own are written, never as -0. */
function hundredths(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}
