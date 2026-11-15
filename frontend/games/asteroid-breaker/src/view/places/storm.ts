import type { Point } from "@fz/phaser/shapes";
import { TURN } from "../../rules/angles";
import { between, forked, pick } from "./globes";
import {
  type Bank,
  type Flicker,
  type Mark,
  SHORT_SIDE,
  type Scenery,
  type Site,
  poolsAt,
  washAt,
} from "./marks";

/** A degree, in radians. */
const DEGREE = TURN / 360;

/** Says a billow of the thunderhead: across and up from the field's lower left corner, and half its width and height, each in short sides. */
type BillowAt = readonly [number, number, number, number];

/**
 * The thunderhead's billows, back to front: its anvil, which a wide field's
 * top cuts off, then down its tower, each lower billow standing before the
 * one above it.
 */
const TOWER: readonly BillowAt[] = [
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
];

/** The thunderhead's foot, which stands before the forks inside it. */
const FOOT: readonly BillowAt[] = [
  [0.36, 0.3, 0.15, 0.11],
  [0.02, 0.22, 0.24, 0.17],
  [0.3, 0.16, 0.24, 0.15],
  [0.56, 0.08, 0.22, 0.12],
  [0.1, 0.04, 0.3, 0.14],
  [0.42, 0.0, 0.26, 0.1],
  [0.8, -0.02, 0.22, 0.08],
];

/** Says a place across and up from the field's lower left corner, in short sides. */
type Spot = readonly [across: number, up: number];

/** Says where a fork of lightning runs: its top and its foot. */
type ForkAt = readonly [top: Spot, foot: Spot];

/**
 * The forks of lightning inside the tower, each where it runs and how often
 * it flickers, the first about every eleven seconds.
 */
const FORKS: readonly (readonly [ForkAt, Flicker])[] = [
  [
    [
      [0.24, 0.92],
      [0.31, 0.4],
    ],
    { every: 11, after: 4.2 },
  ],
  [
    [
      [0.07, 0.74],
      [0.13, 0.26],
    ],
    { every: 17, after: 9.5 },
  ],
];

/** How many streaks of wind cross the field for each 2,880 units² of it. */
const STREAKS_PER_AREA = 15;

/**
 * Returns the Storm: a thunderhead towering up the field's left side, dim
 * forks of lightning inside it, in an ember and violet wash crossed by wind.
 */
export function storm(site: Site): Scenery {
  const { width, height, random, strewn } = site;
  const S = SHORT_SIDE;
  /** Returns a place across and up from the field's lower left corner, in short sides. */
  const at = (x: number, up: number): Point => ({
    x: x * S,
    y: height - up * S,
  });
  const bank = (billows: readonly BillowAt[]): Bank => ({
    kind: "bank",
    billows: billows.map(([x, up, rx, ry]) => ({
      at: at(
        x + between(random, -0.015, 0.015),
        up + between(random, -0.015, 0.015),
      ),
      rx: rx * S,
      ry: ry * S,
      turn: between(random, -9, 9) * DEGREE,
    })),
    tint: "crystal",
    rim: 0.022 * S,
  });
  const tower = bank(TOWER);
  const foot = bank(FOOT);
  // Each fork, with the glow it throws on the cloud around it.
  const forks = FORKS.flatMap(([[top, foot], flicker]): readonly Mark[] => {
    const from = at(...top);
    const to = at(...foot);
    const trunk = forked(random, from, to, 7, 0.09);
    const branches = [2, 4].map((k, i): Mark => {
      const start = trunk[k] ?? from;
      const end = {
        x: start.x + between(random, 0.08, 0.16) * S * (i === 0 ? 1 : -1),
        y: start.y + between(random, 0.08, 0.14) * S,
      };
      return {
        kind: "line",
        points: forked(random, start, end, 4, 0.14),
        width: 0.1,
        tint: "spark",
        strength: 0.4,
        fine: true,
        flicker,
      };
    });
    return [
      {
        kind: "soft",
        at: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
        rx: 0.2 * S,
        ry: 0.26 * S,
        turn: 10 * DEGREE,
        tint: "spark",
        strength: 0.25,
        flicker,
      },
      {
        kind: "line",
        points: trunk,
        width: 0.16,
        tint: "spark",
        strength: 0.55,
        flicker,
      },
      ...branches,
    ];
  });
  const air = Array.from(
    { length: Math.round((STREAKS_PER_AREA * width * height) / 2880) },
    (): Mark => {
      const middle = { x: strewn() * width, y: strewn() * height };
      return {
        kind: "streak",
        at: middle,
        length: between(strewn, 9, 19),
        width: between(strewn, 0.06, 0.11),
        turn: (-13 + between(strewn, -2.5, 2.5)) * DEGREE,
        tint: pick(strewn, ["text", "text", "crystal"]),
        strength: between(strewn, 0.5, 1),
      };
    },
  );
  return {
    wash: [
      washAt(site, { x: 0.82, y: 0.88 }, 0.74, "volatile", 0.85),
      ...poolsAt(at(0.52, 0.5), at(0.2, 0.52), 0.72, "crystal", 0.85),
      washAt(site, { x: 0.98, y: 0.1 }, 0.5, "danger", 0.55),
      washAt(site, { x: 0.56, y: 0.56 }, 0.42, "deep", 0.8),
    ],
    landmark: [tower, ...forks, foot],
    air,
    vignette: { depth: 0.18 * S, tint: "crystal", strength: 0.6 },
    starTint: "volatile",
  };
}
