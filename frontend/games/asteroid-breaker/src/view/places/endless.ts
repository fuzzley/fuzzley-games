import type { Point } from "@fz/phaser/shapes";
import type { Place } from "../../rules/torus";
import { TURN } from "../../rules/angles";
import { CONSTELLATION } from "../art/pilot_art";
import { CONSTELLATION_SIZE } from "../field/specks";
import { between, pick } from "./globes";
import {
  type Mark,
  SHORT_SIDE,
  type Scenery,
  type Site,
  washAt,
} from "./marks";

/** A degree, in radians. */
const DEGREE = TURN / 360;

/** How many of the band's own stars it holds for each 82 units of its length. */
const BAND_STARS = 120;

/** How many far galaxies smudge the field for each 2,880 units² of it. */
const SMUDGES_PER_AREA = 6;

/**
 * Returns the constellation an Endless wave lays, as landmark specks joined
 * by a faint line: the fuzzball's tips of fur and its eyes, brighter, about
 * a middle in field units.
 */
function constellation(middle: Point): readonly Mark[] {
  const placed = ({ x, y }: Point): Point => ({
    x: middle.x + x * CONSTELLATION_SIZE,
    y: middle.y + y * CONSTELLATION_SIZE,
  });
  const specks = CONSTELLATION.specks.map(placed);
  return [
    {
      kind: "line",
      points: [...specks, ...specks.slice(0, 1)],
      width: 0.07,
      tint: "muted",
      strength: 0.55,
      fine: true,
    },
    ...specks.map((at): Mark => ({ kind: "speck", at, r: 0.15, depth: "mid" })),
    ...CONSTELLATION.eyes.map((eye): Mark => ({
      kind: "speck",
      at: placed(eye),
      r: 0.2,
      depth: "bright",
    })),
  ];
}

/**
 * Returns Endless: the pale band of a galaxy from corner to corner, a dark
 * lane down it, thick with its own stars, with the wave's constellation over
 * it where it lies, as shares of the field, and far galaxies smudged about.
 */
export function endless(site: Site, laid: Readonly<Place> | null): Scenery {
  const { width, height, random, strewn } = site;
  const S = SHORT_SIDE;
  const reach = Math.hypot(width, height);
  const turn = Math.atan2(-height, width);
  /** Returns a place along the band and across it, in field units from the field's middle. */
  const at = (a: number, b: number): Point => ({
    x: width / 2 + (width / reach) * a + (height / reach) * b,
    y: height / 2 - (height / reach) * a + (width / reach) * b,
  });
  const band: readonly Mark[] = [
    {
      kind: "soft",
      at: at(0, 0),
      rx: 0.62 * reach,
      ry: 0.3 * S,
      turn,
      tint: "violet",
      strength: 0.42,
    },
    {
      kind: "soft",
      at: at(0, 0.01 * S),
      rx: 0.52 * reach,
      ry: 0.14 * S,
      turn,
      tint: "text",
      strength: 0.42,
    },
    {
      kind: "soft",
      at: at(-0.14 * reach, 0),
      rx: 0.34 * S,
      ry: 0.19 * S,
      turn,
      tint: "text",
      strength: 0.16,
    },
    {
      kind: "soft",
      at: at(0.02 * reach, 0.04 * S),
      rx: 0.44 * reach,
      ry: 0.036 * S,
      turn,
      tint: "deep",
      strength: 0.9,
    },
  ];
  // The band's own stars, thick down its middle and thinning to its edges.
  const crowd: Mark[] = [];
  for (let i = 0; i < Math.round((BAND_STARS * reach) / 82); i++) {
    const a = between(random, -0.56, 0.56) * reach;
    const b = (random() + random() + random() - 1.5) * 0.15 * S;
    const star = at(a, b);
    if (star.x < 0 || star.x > width || star.y < 0 || star.y > height) continue;
    const mid = random() < 0.4;
    crowd.push({
      kind: "speck",
      at: star,
      r: mid ? between(random, 0.1, 0.13) : between(random, 0.065, 0.095),
      depth: mid ? "mid" : "far",
    });
  }
  const air = Array.from(
    { length: Math.round((SMUDGES_PER_AREA * width * height) / 2880) },
    (): Mark => {
      const r = between(strewn, 0.45, 0.8);
      const middle = { x: strewn() * width, y: strewn() * height };
      return {
        kind: "soft",
        at: middle,
        rx: r,
        ry: r * between(strewn, 0.3, 0.5),
        turn: between(strewn, 0, 180) * DEGREE,
        tint: pick(strewn, ["text", "violet", "blue"]),
        strength: between(strewn, 0.6, 1),
        small: true,
      };
    },
  );
  return {
    wash: [
      washAt(site, { x: 0.14, y: 0.18 }, 0.75, "deep", 1),
      washAt(site, { x: 0.86, y: 0.84 }, 0.75, "deep", 1),
      washAt(site, { x: 0.78, y: 0.2 }, 0.5, "blue", 0.5),
      washAt(site, { x: 0.2, y: 0.82 }, 0.5, "violet", 0.45),
    ],
    landmark: [
      ...band,
      ...crowd,
      ...(laid ? constellation({ x: laid.x * width, y: laid.y * height }) : []),
    ],
    air,
    vignette: { depth: 0.18 * S, tint: "violet", strength: 0.6 },
    starTint: "violet",
  };
}
