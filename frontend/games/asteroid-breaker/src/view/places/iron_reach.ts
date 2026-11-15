import { lerp } from "@fz/core/math";
import type { Point } from "@fz/phaser/shapes";
import { TURN } from "../../rules/angles";
import {
  type GlobeRing,
  type RingView,
  between,
  crater,
  globe,
  onRing,
  pick,
  polar,
  rotated,
} from "./globes";
import {
  type Mark,
  SHORT_SIDE,
  type Scenery,
  type Site,
  flatsOf,
  poolsAt,
  washAt,
} from "./marks";

/** The moon's faces, in rings from its edge in. */
const MOON: readonly GlobeRing[] = [
  { at: 1, sides: 28 },
  { at: 0.82, sides: 11 },
  { at: 0.52, sides: 7 },
  { at: 0.24, sides: 4 },
];

/**
 * The moon's craters, each its middle and its radius in the moon's: two
 * wider than a boulder, and pits smaller than a small rock, so none is taken
 * for one, which are fine marks.
 */
const CRATERS: readonly (readonly [number, number, number])[] = [
  [-0.5, -0.2, 0.27],
  [-0.26, 0.52, 0.3],
  [-0.14, -0.52, 0.045],
  [-0.76, 0.12, 0.04],
  [-0.62, 0.6, 0.045],
  [-0.04, 0.16, 0.04],
  [-0.86, -0.3, 0.035],
];

/** A crater narrower than this, in the moon's radii, is a pit, a fine mark. */
const PIT = 0.1;

/** How many spans the girder ring is cut in, some gone. */
const SPANS = 16;

/** How many bays of lacing each span shows. */
const BAYS = 4;

/** How many filings lie along the moon's field for each 2,880 units² of the field. */
const FILINGS_PER_AREA = 30;

/** How many tries the filings take to fall on the field, at most. */
const FILING_TRIES = 600;

/**
 * Returns a span of the girder ring, a solid thing cut and lit as the moon
 * is, with no line drawn on it, since a line this near the play reads as
 * something that plays: its side, which faces the viewer and not the light,
 * hanging from the lower of its long edges, its top, and its lacing.
 */
function span(
  ring: RingView,
  reaches: readonly [number, number],
  radius: number,
  i: number,
  lean: number,
  drift: number,
): readonly Mark[] {
  const { middle, tilt } = ring;
  const from = ((i + 0.08) / SPANS) * TURN;
  const to = ((i + 0.92) / SPANS) * TURN;
  const about = onRing(ring, (reaches[0] + reaches[1]) / 2, (from + to) / 2);
  const away = Math.hypot(about.x - middle.x, about.y - middle.y) || 1;
  // A span beside a gap may have drifted loose: turned and moved outward.
  const moved = (point: Point): Point => {
    const { x, y } = rotated(
      { x: point.x - about.x, y: point.y - about.y },
      lean,
    );
    return {
      x: about.x + x + ((about.x - middle.x) / away) * drift,
      y: about.y + y + ((about.y - middle.y) / away) * drift,
    };
  };
  const along = (reach: number, share: number): Point =>
    moved(onRing(ring, reach, lerp(from, to, share)));
  const [inner, outer] = reaches;
  const a = along(outer, 0);
  const b = along(outer, 1);
  const c = along(inner, 1);
  const d = along(inner, 0);
  const [low, high] = a.y + b.y > d.y + c.y ? [a, b] : [d, c];
  const drop = rotated({ x: 0, y: 0.05 * radius }, tilt + lean);
  // Its top catches the light by how it lies around the ring.
  const light =
    0.8 + 0.22 * Math.max(0, -Math.cos((from + to) / 2 - tilt + 0.9));
  const lacing = Array.from({ length: BAYS }, (_, bay): readonly Mark[] => {
    const start = bay / BAYS;
    const end = (bay + 1) / BAYS;
    return [
      {
        kind: "flat",
        points: [along(outer, start), along(outer, end), along(inner, start)],
        light: light + 0.1,
        tint: "iron",
        fine: true,
      },
      {
        kind: "flat",
        points: [along(inner, start), along(inner, end), along(outer, end)],
        light: light - 0.18,
        tint: "iron",
        fine: true,
      },
    ];
  });
  return [
    {
      kind: "flat",
      points: [
        low,
        high,
        { x: high.x + drop.x, y: high.y + drop.y },
        { x: low.x + drop.x, y: low.y + drop.y },
      ],
      light: 0.44,
      tint: "iron",
    },
    { kind: "flat", points: [a, b, c, d], light, tint: "iron" },
    ...lacing.flat(),
  ];
}

/** Returns a filing: a sliver of metal at a place, lying along a way, blunt at both ends. */
function filing(strewn: () => number, at: Point, angle: number): Mark {
  const long = between(strewn, 0.14, 0.2);
  const wide = between(strewn, 0.05, 0.07);
  const cut = wide * 0.6;
  const sliver: readonly Point[] = [
    { x: -long + cut, y: -wide },
    { x: long - cut, y: -wide },
    { x: long, y: -wide + cut },
    { x: long, y: wide - cut },
    { x: long - cut, y: wide },
    { x: -long + cut, y: wide },
    { x: -long, y: wide - cut },
    { x: -long, y: -wide + cut },
  ];
  return {
    kind: "flat",
    points: sliver.map((corner) => {
      const { x, y } = rotated(corner, angle + TURN / 4);
      return { x: at.x + x, y: at.y + y };
    }),
    light: between(strewn, 0.75, 1.1),
    tint: "iron",
    small: true,
  };
}

/**
 * Returns the Iron reach: a cold, cratered moon on the right edge, the
 * broken spans of a girder ring around it, in a steel wash with dark pools,
 * and filings strewn along the moon's field.
 */
export function ironReach(site: Site): Scenery {
  const { width, height, random, strewn } = site;
  const S = SHORT_SIDE;
  const radius = 0.44 * S;
  const ring: RingView = {
    middle: { x: width - 0.04 * S, y: 0.33 * S },
    squash: 0.3,
    tilt: (-14 / 360) * TURN,
  };
  const reaches = [1.45 * radius, 1.58 * radius] as const;
  const far: Mark[] = [];
  const near: Mark[] = [];
  for (let i = 0; i < SPANS; i++) {
    // The ring is broken: some spans are gone, and one beside a gap has drifted loose.
    const gone = random() < 0.3;
    const loose = random() < 0.3;
    const lean = loose ? between(random, -0.18, 0.18) : 0;
    const drift = loose ? between(random, -0.06, 0.12) * radius : 0;
    if (gone) continue;
    const side = (i + 0.5) / SPANS < 0.5 ? near : far;
    side.push(...span(ring, reaches, radius, i, lean, drift));
  }
  const moon = [
    ...flatsOf(globe(random, MOON), ring.middle, radius, "iron"),
    ...CRATERS.flatMap(([x, y, r]) =>
      flatsOf(
        crater({ x, y }, r, between(random, 0, TURN)),
        ring.middle,
        radius,
        "iron",
        r < PIT,
      ),
    ),
  ];
  const air: Mark[] = [];
  const filings = Math.round((FILINGS_PER_AREA * width * height) / 2880);
  for (let tries = 0; air.length < filings && tries < FILING_TRIES; tries++) {
    const reach =
      pick(strewn, [0.95, 1.3, 1.7]) * S + between(strewn, -1.6, 1.6);
    const angle = between(strewn, 0, TURN);
    const at = polar(angle, reach, ring.middle);
    if (at.x < 0 || at.x > width || at.y < 0 || at.y > height) continue;
    air.push(filing(strewn, at, angle));
  }
  return {
    wash: [
      ...poolsAt(
        { x: width - 0.02 * S, y: 0.82 * S },
        { x: width - 0.3 * S, y: 0.16 * S },
        0.74,
        "iron",
        0.9,
      ),
      washAt(site, { x: 0.14, y: 0.8 }, 0.72, "deep", 0.9),
      washAt(site, { x: 0.26, y: 0.14 }, 0.42, "lodestone", 0.42),
      washAt(site, { x: 0.6, y: 0.94 }, 0.45, "ice", 0.35),
    ],
    landmark: [...far, ...moon, ...near],
    air,
    vignette: { depth: 0.18 * S, tint: "iron", strength: 0.6 },
    starTint: "ice",
  };
}
