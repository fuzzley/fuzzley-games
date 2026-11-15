import { TURN } from "../../rules/angles";
import {
  type GlobeRing,
  type RingView,
  bandOf,
  between,
  globe,
} from "./globes";
import {
  type Flat,
  type Mark,
  SHORT_SIDE,
  type Scenery,
  type Site,
  flatsOf,
  poolsAt,
  washAt,
} from "./marks";

/** The ringed planet's faces, in rings from its edge in. */
const PLANET: readonly GlobeRing[] = [
  { at: 1, sides: 30 },
  { at: 0.84, sides: 12 },
  { at: 0.56, sides: 8 },
  { at: 0.26, sides: 4 },
];

/** The planet's three rings: each its inner and outer reach, in the planet's radii, and the light on it. */
const BANDS: readonly (readonly [number, number, number])[] = [
  [1.34, 1.5, 0.62],
  [1.55, 1.94, 1.04],
  [1.99, 2.2, 0.8],
];

/** How many corners each half of a ring's band is drawn with along it. */
const BAND_STEPS = 26;

/** How many motes of dust drift for each 2,880 units² of the field. */
const MOTES_PER_AREA = 20;

/**
 * Returns the Inner belt: the limb of a ringed planet low in the right
 * corner, its lit shoulder toward the field, in a warm, calm wash, with
 * motes of dust.
 */
export function innerBelt(site: Site): Scenery {
  const { width, height, random, strewn } = site;
  const S = SHORT_SIDE;
  const ring: RingView = {
    middle: { x: width - 0.36 * S, y: height + 0.14 * S },
    squash: 0.26,
    tilt: (16 / 360) * TURN,
  };
  const radius = 0.5 * S;
  // The rings' far side, which the planet hides where it stands before it,
  // then the planet, then their near side.
  const bands = (from: number, to: number): readonly Flat[] =>
    BANDS.map(([inner, outer, light]) => ({
      kind: "flat",
      points: bandOf(
        ring,
        [inner * radius, outer * radius],
        [from, to],
        BAND_STEPS,
      ),
      light,
      tint: "ice",
    }));
  const landmark: readonly Mark[] = [
    ...bands(TURN / 2, TURN),
    ...flatsOf(globe(random, PLANET), ring.middle, radius, "stone"),
    ...bands(0, TURN / 2),
  ];
  const air = Array.from(
    { length: Math.round((MOTES_PER_AREA * width * height) / 2880) },
    (): Mark => {
      const r = between(strewn, 0.2, 0.42);
      const at = { x: strewn() * width, y: strewn() * height };
      return {
        kind: "soft",
        at,
        rx: r,
        ry: r,
        turn: 0,
        tint: "stone",
        strength: between(strewn, 0.45, 0.9),
        small: true,
      };
    },
  );
  return {
    wash: [
      ...poolsAt(
        { x: width + 0.12 * S, y: height - 0.08 * S },
        { x: width - 0.62 * S, y: height - 0.12 * S },
        0.8,
        "accent",
        0.9,
      ),
      washAt(site, { x: 0.14, y: 0.14 }, 0.7, "ice", 0.7),
      washAt(site, { x: 0.4, y: 0.62 }, 0.45, "crystal", 0.3),
    ],
    landmark,
    air,
    vignette: { depth: 0.18 * S, tint: "accent", strength: 0.6 },
    starTint: "stone",
  };
}
