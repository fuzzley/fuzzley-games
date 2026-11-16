// The rocks' shapes: each a low dome of flat facets, cut like a stone from a
// seed, with the marks its kind is told by, as plain geometry in shares of its
// radius. It is the art kit's `makeRock()`
// (`docs/archive/asteroid-breaker-uplift/art/lib/rocks.mjs`), cutting the same
// rock from the same seed.

import { createRandom } from "@fz/core/random";
import type { Point } from "@fz/phaser/shapes";
import { TURN } from "../../../rules/angles";
import type {
  ROCK_KINDS,
  RockKindId,
  RockSize,
} from "../../../rules/catalog/rocks";
import {
  type Corner,
  type Cut,
  type Dome,
  type Facet,
  dent,
  dome,
  prism,
} from "./cut";
import { around, between, hull, jagged, pointBetween, polar } from "./space";

/** Names the tone a line or a dot on a rock is drawn in. */
export type MarkTone =
  /** Its body's deepest shade: a seam, a rivet. */
  | "deep"
  /** Its body's lit tone: a lodestone's lit pole and its field. */
  | "lit"
  /** A volatile rock's glowing core, which no light falls on. */
  | "core"
  /** White, where the light catches it, faint. */
  | "glint"
  /** Its body's lit tone, faint and wide, as light along a metal plate. */
  | "sheen";

/** Describes a line drawn on a rock. */
export interface RockLine {
  readonly points: readonly Point[];
  readonly tone: MarkTone;
  /** How wide it is, in shares of the rock's radius. */
  readonly width: number;
}

/** Describes a round mark on a rock. */
export interface RockDot {
  readonly at: Point;
  /** Its radius, in shares of the rock's. */
  readonly r: number;
  readonly tone: Extract<MarkTone, "deep" | "glint">;
}

/** Describes a soft light a rock gives off, which no light falls on. */
export interface RockGlow {
  readonly at: Point;
  /** How far it reaches, in shares of the rock's radius. */
  readonly r: number;
  /** Whose light it is: a volatile rock's core or a crystal's gems. */
  readonly tone: "core" | "gem";
  /** How strongly it shows, from 0 to 1. */
  readonly strength: number;
}

/** Describes a rock as it is cut, in shares of its radius about its middle. */
export interface RockShape {
  readonly kind: RockKindId;
  readonly size: RockSize;
  /** Around all of it, the gems that stand out of a crystal included. */
  readonly outline: readonly Point[];
  /** Around its dome alone, which its cracks keep inside. */
  readonly rim: readonly Point[];
  /** Back to front, each over those before it. */
  readonly facets: readonly Facet[];
  readonly lines: readonly RockLine[];
  readonly dots: readonly RockDot[];
  readonly glows: readonly RockGlow[];
  /** Lines drawn round it, past its outline, which nothing hits: a lodestone's field. */
  readonly aura: readonly RockLine[];
}

/** What a kind adds to a dome as it is cut: its dents or its gems, its marks and its glow. */
type Marks = Partial<
  Pick<RockShape, "outline" | "facets" | "lines" | "dots" | "glows" | "aura">
>;

/** Draws a kind's marks on a dome cut at a size, from the draws the dome left. */
type MarkDome = (random: () => number, dome: Dome, size: RockSize) => Marks;

/** The sizes a kind of rock comes in, as the catalog gives its hits at each. */
type SizeOf<K extends RockKindId> = Extract<
  keyof (typeof ROCK_KINDS)[K]["hits"],
  RockSize
>;

/** Describes how a kind of rock is cut: at each size it comes in, and its marks. */
interface KindCut<S extends RockSize> {
  readonly sizes: Readonly<Record<S, Cut>>;
  readonly marks: MarkDome;
}

/** Returns the dents a stone or a boulder is pitted with, each drawn as it comes. */
function dents(
  random: () => number,
  count: number,
  least: number,
  most: number,
): readonly Facet[] {
  return Array.from({ length: count }, () => {
    const at = polar(between(random, 0, TURN), between(random, 0.2, 0.62));
    return dent(random, at, between(random, least, most));
  }).flat();
}

/** How many dents a stone has at each size. */
const STONE_DENTS: Readonly<Partial<Record<RockSize, number>>> = {
  large: 2,
  medium: 1,
};

/** How many dents a boulder has, which are smaller than a stone's. */
const BOULDER_DENTS = 5;

/** How every boulder is cut, a set piece's as the plain one's. */
const BOULDER_CUT: Cut = {
  sides: 17,
  jag: 0.14,
  rings: [
    { at: 0.78, z: 0.34, sides: 11 },
    { at: 0.5, z: 0.6, sides: 7 },
  ],
  top: 0.78,
};

/** How many fissures a crumbling boulder shows round its rim, where its stones come away. */
const FISSURES = 5;

/** Returns a boulder's seam: a jagged line across it, from rim to rim, which its cracks follow. */
function seamAcross(random: () => number): RockLine {
  const a = between(random, 0, TURN);
  const across = a + TURN / 2 + between(random, -0.5, 0.5);
  return {
    points: jagged(random, polar(a, 0.86), polar(across, 0.8), 7, 0.07),
    tone: "deep",
    width: 0.022,
  };
}

/**
 * Returns the seams that glow on a dome: the edges of its innermost ring,
 * spokes out from its corners to the ring outside it, and on toward its
 * rim, with the glow of its heart, a volatile rock's and a storm boulder's.
 */
function glowingSeams(
  random: () => number,
  dome: Dome,
  heart: readonly RockGlow[],
): Marks {
  const core = innermost(dome);
  const mid = around(dome.rings, -2);
  const { outline } = dome;
  const lines: RockLine[] = [
    {
      points: [...core.map(({ p }) => p), cornerAt(core, 0)],
      tone: "core",
      width: 0.05,
    },
  ];
  core.forEach((corner, i) => {
    const outer = cornerAt(
      mid,
      Math.floor((i * mid.length) / core.length) % mid.length,
    );
    lines.push({
      points: jagged(random, corner.p, outer, 2, 0.1),
      tone: "core",
      width: 0.04,
    });
    const rim = around(
      outline,
      Math.floor(((i + 0.5) * outline.length) / core.length),
    );
    lines.push({
      points: jagged(random, outer, pointBetween(outer, rim, 0.72), 2, 0.12),
      tone: "core",
      width: 0.028,
    });
  });
  return { lines, glows: heart };
}

/** Returns the innermost ring of a dome's corners. */
function innermost(dome: Dome): readonly Corner[] {
  return around(dome.rings, -1);
}

/** Returns one of a ring's corners' points, by its place in the ring, its first for one past its end. */
function cornerAt(ring: readonly Corner[], i: number): Point {
  return around(ring, i).p;
}

/**
 * How each kind of rock is cut at each size it comes in, as the kit cuts it,
 * and the marks it is told by.
 */
const KIND_CUTS = {
  // Round, with cut dents.
  stone: {
    sizes: {
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
    marks: (random, _, size) => ({
      facets: dents(random, STONE_DENTS[size] ?? 0, 0.12, 0.2),
    }),
  },
  // Gems standing out of stone, glowing.
  crystal: {
    sizes: {
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
    marks: (random, { outline }, size) => {
      const gems = size === "large" ? 4 : 3;
      const fan = between(random, 0, TURN);
      const prisms = Array.from({ length: gems }, (_, i) => {
        const angle =
          fan + (i - (gems - 1) / 2) * 0.62 + between(random, -0.12, 0.12);
        const length =
          i === Math.floor(gems / 2) ? 1.02 : between(random, 0.7, 0.9);
        return prism(
          polar(angle, 0.12),
          angle,
          length - 0.12,
          between(random, 0.13, 0.17),
        );
      }).flat();
      return {
        facets: prisms,
        glows: [{ at: polar(fan, 0.45), r: 0.95, tone: "gem", strength: 0.5 }],
        dots: [{ at: polar(fan, 0.62), r: 0.05, tone: "glint" }],
        // The gems reach past the stone they stand in.
        outline: hull([...outline, ...prisms.flatMap(({ points }) => points)]),
      };
    },
  },
  // Long shards, with fractures from its middle and glints where the light catches.
  ice: {
    sizes: {
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
    marks: (random, _, size) => {
      const big = size === "large";
      const lines = Array.from({ length: big ? 3 : 2 }, () => {
        const a = between(random, 0, TURN);
        const turn = between(random, -0.3, 0.3);
        const to = polar(a + turn, between(random, 0.5, 0.78));
        return {
          points: jagged(random, polar(a, 0.08), to, 3, 0.12),
          tone: "glint" as const,
          width: 0.035,
        };
      });
      return {
        lines,
        dots: [
          { at: { x: -0.3, y: -0.34 }, r: big ? 0.07 : 0.09, tone: "glint" },
          ...(big
            ? [{ at: { x: -0.12, y: -0.52 }, r: 0.04, tone: "glint" } as const]
            : []),
        ],
      };
    },
  },
  // The largest, pitted, with a seam across it that its cracks follow.
  boulder: {
    sizes: { boulder: BOULDER_CUT },
    marks: (random) => ({
      facets: dents(random, BOULDER_DENTS, 0.07, 0.13),
      lines: [seamAcross(random)],
    }),
  },
  // Blocky, flat-topped, with a seam across its plates, a sheen and a rivet in each corner.
  iron: {
    sizes: {
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
    marks: (random, dome, size) => {
      const inner = innermost(dome);
      const half = Math.floor(inner.length / 2);
      const seam = between(random, -0.3, 0.3);
      const first = cornerAt(inner, 0);
      return {
        lines: [
          {
            points: [
              pointBetween(first, cornerAt(inner, 1), 0.5 + seam * 0.4),
              pointBetween(
                cornerAt(inner, half),
                cornerAt(inner, half + 1),
                0.5 - seam * 0.4,
              ),
            ],
            tone: "deep",
            width: 0.035,
          },
          {
            points: [
              { x: first.x * 0.2 - 0.3, y: -0.3 },
              { x: first.x * 0.2 + 0.05, y: 0.28 },
            ],
            tone: "sheen",
            width: 0.16,
          },
        ],
        dots: inner
          .filter((_, i) => size !== "small" || i % 2 === 0)
          .map(({ p }) => ({
            at: { x: p.x * 0.8, y: p.y * 0.8 },
            r: size === "small" ? 0.07 : 0.05,
            tone: "deep" as const,
          })),
      };
    },
  },
  // Seams that glow: the edges of its inner rings, and spokes out from them.
  volatile: {
    sizes: {
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
    marks: (random, dome) =>
      glowingSeams(random, dome, [
        { at: { x: 0, y: 0 }, r: 1.25, tone: "core", strength: 0.55 },
        { at: { x: 0, y: 0 }, r: 0.42, tone: "core", strength: 0.9 },
      ]),
  },
  // Long, a band at each pole, its field's lines around it.
  lodestone: {
    sizes: {
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
    marks: () => ({
      lines: [
        { points: poleBand(-1), tone: "lit", width: 0.07 },
        { points: poleBand(1), tone: "deep", width: 0.07 },
      ],
      aura: [-1, 1].map((side) => ({
        points: fieldLine(side),
        tone: "lit" as const,
        width: 0.03,
      })),
    }),
  },
  // A boulder pitted as the plain one is, fissured round its rim where
  // its stones come away.
  crumbling: {
    sizes: { boulder: BOULDER_CUT },
    marks: (random) => {
      const first = between(random, 0, TURN);
      const fissures = Array.from({ length: FISSURES }, (_, i) => {
        const a = first + (i * TURN) / FISSURES + between(random, -0.3, 0.3);
        const turn = between(random, -0.25, 0.25);
        return {
          points: jagged(random, polar(a, 0.9), polar(a + turn, 0.58), 3, 0.08),
          tone: "deep" as const,
          width: 0.03,
        };
      });
      return {
        facets: dents(random, BOULDER_DENTS + 2, 0.07, 0.13),
        lines: [seamAcross(random), ...fissures],
      };
    },
  },
  // A boulder in iron's tones, its rind of plates seamed round its crown
  // and out to its rim, a rivet at each plate's corner and a sheen.
  ironclad: {
    sizes: { boulder: BOULDER_CUT },
    marks: (random, dome) => {
      const crown = innermost(dome);
      const rind = around(dome.rings, 1);
      const plates = Array.from({ length: 4 }, (_, i) => {
        const at = cornerAt(
          crown,
          Math.floor((i * crown.length) / 4 + between(random, 0, 1)),
        );
        const a = Math.atan2(at.y, at.x);
        return {
          points: [at, polar(a + between(random, -0.15, 0.15), 0.94)],
          tone: "deep" as const,
          width: 0.03,
        };
      });
      return {
        lines: [
          {
            points: [...crown.map(({ p }) => p), cornerAt(crown, 0)],
            tone: "deep",
            width: 0.03,
          },
          ...plates,
          {
            points: [
              { x: -0.45, y: -0.35 },
              { x: -0.05, y: 0.3 },
            ],
            tone: "sheen",
            width: 0.18,
          },
        ],
        dots: rind.map(({ p }) => ({
          at: { x: p.x * 0.92, y: p.y * 0.92 },
          r: 0.035,
          tone: "deep" as const,
        })),
      };
    },
  },
  // A boulder whose heart is a volatile rock's: seams that glow from its
  // crown out toward its rim, over a few dents.
  stormheart: {
    sizes: { boulder: BOULDER_CUT },
    marks: (random, dome) => {
      const facets = dents(random, 3, 0.07, 0.11);
      return {
        facets,
        ...glowingSeams(random, dome, [
          { at: { x: 0, y: 0 }, r: 1.1, tone: "core", strength: 0.5 },
          { at: { x: 0, y: 0 }, r: 0.36, tone: "core", strength: 0.85 },
        ]),
      };
    },
  },
} as const satisfies { readonly [K in RockKindId]: KindCut<SizeOf<K>> };

/** How far from a lodestone's middle its poles' bands lie. */
const POLE = 0.6;

/** Returns the band across a lodestone's pole on a side, -1 its left and 1 its right. */
function poleBand(side: number): readonly Point[] {
  return [
    { x: side * POLE, y: -0.3 },
    { x: side * (POLE + 0.05), y: 0.3 },
  ];
}

/**
 * How far a lodestone's field's lines reach along it, and how far out from
 * it they start and rise, in shares of its radius, each with the share of
 * it the kit draws.
 */
const FIELD_LINE = {
  reach: 1.22,
  along: 0.92,
  rise: 0.34,
  lift: 0.7,
  out: 0.62,
} as const;

/** How many legs a lodestone's field's line is drawn in. */
const FIELD_LEGS = 14;

/** Returns a lodestone's field's line on a side, -1 above it and 1 below, arcing from pole to pole. */
function fieldLine(side: number): readonly Point[] {
  const { reach, along, rise, lift, out } = FIELD_LINE;
  return Array.from({ length: FIELD_LEGS + 1 }, (_, i) => {
    const t = (i / FIELD_LEGS) * Math.PI;
    return {
      x: -Math.cos(t) * reach * along,
      y: side * (rise + Math.sin(t) * lift * out),
    };
  });
}

/** Returns how a kind of rock is cut at a size, or null at a size it doesn't come in. */
export function cutOf(kind: RockKindId, size: RockSize): Cut | null {
  const sizes: Readonly<Partial<Record<RockSize, Cut>>> = KIND_CUTS[kind].sizes;
  return sizes[size] ?? null;
}

/**
 * Returns a rock of a kind and size, cut from a seed, the same rock every
 * time from the same three.
 *
 * Its seed is mixed by hand, as the kit mixes it, rather than by
 * `@fz/core/random`'s `mixSeed()`, so each rock is the one the kit drew;
 * the length of its kind's id and of its size's name are part of the mix,
 * so a renamed kind or size is cut anew.
 *
 * @throws {RangeError} For a size the kind isn't cut at.
 */
export function makeRock(
  kind: RockKindId,
  size: RockSize,
  seed: number,
): RockShape {
  const cut = cutOf(kind, size);
  if (cut === null) throw new RangeError(`A ${kind} rock isn't cut ${size}.`);
  const random = createRandom(seed * 7919 + kind.length * 131 + size.length);
  const cutDome = dome(random, cut);
  const marks: Marks = KIND_CUTS[kind].marks(random, cutDome, size);
  return {
    kind,
    size,
    outline: marks.outline ?? cutDome.outline,
    rim: cutDome.outline,
    facets: [...cutDome.facets, ...(marks.facets ?? [])],
    lines: marks.lines ?? [],
    dots: marks.dots ?? [],
    glows: marks.glows ?? [],
    aura: marks.aura ?? [],
  };
}
