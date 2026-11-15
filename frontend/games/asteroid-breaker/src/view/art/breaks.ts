// A rock's break and a held hit's spark, as the art kit's `makeBreak()`,
// `breakFx()` and `heldHitFx()` (`docs/asteroid-breaker-uplift/art/lib/fx.mjs`)
// draw them: the rock's own facets fly apart as shards, tumbling, shrinking
// and fading into the field's color, so none is taken for a small rock, with
// a ring of dust and a few sparks of light, all of it over in under half a
// second; and a spark where a held hit struck, thrown back the way the shot
// came. Each is plain data, made once from the rock's own seed, and where
// each of its pieces is drawn a time after, in device pixels from its
// middle, written into a record the scene keeps rather than a new one each
// frame.

import { easeOutCubic, lerp, shareDone } from "@fz/core/math";
import { createRandom } from "@fz/core/random";
import type { ArtScale, Point } from "@fz/phaser/shapes";
import { TURN } from "../../rules/angles";
import type { RockKindId } from "../../rules/catalog/rocks";
import { ROCK_OUTLINES, type Rock } from "../../rules/rocks/rocks";
import { type Moving, type Place, type Torus, across } from "../../rules/torus";
import { ROCK_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import { inLight } from "../colors/rock_light";
import { mixTone } from "../colors/tones";
import {
  type BySize,
  FIRST_SEED,
  bySize,
  rockColor,
  rockShape,
} from "./rock_art";
import type { Facet, Part } from "./rocks/cut";
import { litBy } from "./rocks/light";
import type { RockShape } from "./rocks/rock_shape";
import {
  type Facing,
  around,
  between,
  hull,
  polar,
  reachAt,
  unitFacing,
} from "./rocks/space";

/** How long a rock's break lasts, from its flash to the last of its pieces gone, in milliseconds. */
export const BREAK_MS = 450;

/** How long a held hit's spark lasts, in milliseconds. */
export const HELD_MS = 200;

/** How long a broken rock shows whole, flashing, before it comes apart, in milliseconds. */
const WHOLE_MS = 30;

/**
 * How strongly a broken rock flashes toward its flash's tone, as it breaks,
 * how long it holds that, and when it has faded, in milliseconds.
 */
const FLASH = { most: 0.86, holds: 25, gone: 95 } as const;

/** How far toward the field a shard's color has gone as it is gone. */
const SHARD_FADE = 0.85;

/** How long a held hit's spark takes as the kit's impact plays it, which its whole time stretches over. */
const IMPACT_MS = 160;

/** How long a glint swells and goes, in milliseconds. */
const GLINT_MS = 150;

/**
 * Where a break's dust's ring starts and how far it spreads, and how wide
 * it is as it starts, each in shares of the rock's radius, its width as
 * thick as the dust.
 */
const DUST_RING = { from: 0.7, spread: 1.05, width: 0.16 } as const;

/** How large a puff of dust is as it starts, and how much it grows, in shares of its own radius. */
const PUFF_GROWS = { from: 0.7, by: 0.9 } as const;

/**
 * How many shapes of a held hit's spark there are, each from a seed of its
 * own, one picked for each hit, so hits in a row throw their ticks apart.
 */
const IMPACT_SHAPES = 8;

/** How long the four-point spark at a held hit lasts, as its impact plays it, in milliseconds. */
const IMPACT_FLASH_MS = 80;

/** The least a line of a break is drawn, and how much a glint is padded, in CSS pixels. */
const LEAST_CSS_PX = { line: 1, glint: 0.6 } as const;

/** Describes how a kind of rock comes apart, as the kit's `BREAK_STYLES` has it. */
interface BreakStyle {
  /** The shards that fly the whole time, at its largest; the rest are gone in a few frames. */
  readonly heroes: number;
  /** How far a hero flies, at least and at most, in the rock's radii. */
  readonly reach: readonly [number, number];
  /** The most a shard turns as it flies, in radians. */
  readonly spin: number;
  /** The size a shard ends at, as a share of its own. */
  readonly shrink: number;
  readonly sparks: number;
  readonly glints: number;
  /** How thick its dust is, 0 for none. */
  readonly dust: number;
  /** What its shards are cut from its facets as: as they are, as slivers, or as a few plates. */
  readonly cut: "facets" | "slivers" | "plates";
  /** The smaller rocks the kit draws it leaving, which the rules lay instead. */
  readonly pieces: number;
  /** How wide its sparks are, in field units. */
  readonly sparkWidth: number;
}

/** How each kind of rock comes apart, as the kit has it. */
const BREAK_STYLES: Readonly<Record<RockKindId, BreakStyle>> = {
  stone: {
    heroes: 6,
    reach: [0.85, 1.45],
    spin: 2.4,
    shrink: 0.45,
    sparks: 4,
    glints: 0,
    dust: 1,
    cut: "facets",
    pieces: 2,
    sparkWidth: 0.1,
  },
  ice: {
    heroes: 12,
    reach: [1.1, 1.95],
    spin: 4.6,
    shrink: 0.3,
    sparks: 0,
    glints: 5,
    dust: 0.45,
    cut: "slivers",
    pieces: 3,
    sparkWidth: 0.1,
  },
  crystal: {
    heroes: 5,
    reach: [0.85, 1.4],
    spin: 2.4,
    shrink: 0.45,
    sparks: 3,
    glints: 3,
    dust: 0.8,
    cut: "facets",
    pieces: 2,
    sparkWidth: 0.1,
  },
  // Heavy plates that barely turn, and bright, wide sparks.
  iron: {
    heroes: 7,
    reach: [0.85, 1.25],
    spin: 0.9,
    shrink: 0.6,
    sparks: 9,
    glints: 0,
    dust: 0.4,
    cut: "plates",
    pieces: 2,
    sparkWidth: 0.14,
  },
  volatile: {
    heroes: 7,
    reach: [1.0, 1.7],
    spin: 3,
    shrink: 0.35,
    sparks: 0,
    glints: 0,
    dust: 0,
    cut: "facets",
    pieces: 0,
    sparkWidth: 0.1,
  },
  lodestone: {
    heroes: 6,
    reach: [0.85, 1.4],
    spin: 2.2,
    shrink: 0.45,
    sparks: 4,
    glints: 0,
    dust: 0.9,
    cut: "facets",
    pieces: 2,
    sparkWidth: 0.1,
  },
  boulder: {
    heroes: 11,
    reach: [0.7, 1.25],
    spin: 1.8,
    shrink: 0.4,
    sparks: 10,
    glints: 0,
    dust: 1.5,
    cut: "facets",
    pieces: 3,
    sparkWidth: 0.1,
  },
};

/** Describes a piece of a broken rock that flies off and fades: one of its facets. */
export interface Shard {
  /** Its corners about its own middle, in shares of the rock's radius. */
  readonly points: readonly Point[];
  /** Its middle as the rock breaks, in shares of the rock's radius. */
  readonly at: Point;
  /** The way out from the rock's middle it flies, a unit long, before the blow pushes it. */
  readonly out: Point;
  /** How far its way is turned off that, in radians. */
  readonly sway: number;
  /** The way it faces, as the facet it was cut from did. */
  readonly facing: Facing;
  readonly part: Part;
  /** How far it flies, in shares of the rock's radius. */
  readonly reach: number;
  /** How far it turns as it flies, in radians, either way. */
  readonly spin: number;
  /** Its size as it goes, a share of its own. */
  readonly shrink: number;
  /** How long it flies, from the rock coming apart, in milliseconds. */
  readonly life: number;
  /** Whether it flies the whole time, where the rest are gone in a few frames. */
  readonly hero: boolean;
}

/** Describes a spark of light thrown from a point: a short line flying out, bright at its head. */
export interface Tick {
  /** The way it flies, in radians. */
  readonly angle: number;
  /** How far its head flies, in field units. */
  readonly reach: number;
  /** How long it is as it starts, in field units. */
  readonly length: number;
  /** How long after the break or the hit it starts, in milliseconds. */
  readonly delay: number;
  /** How long it flies, in milliseconds. */
  readonly life: number;
}

/** Describes where sparks start, in field units: how far from their point, and how wide. */
export interface TickStart {
  readonly from: number;
  readonly width: number;
}

/** Describes a puff of a break's dust, about the ring it spreads on. */
export interface Puff {
  /** Where round the ring it lies, before the rock's turn, in radians. */
  readonly angle: number;
  /** How far out it lies, as a share of the ring's radius. */
  readonly at: number;
  /** Its radius, in shares of the rock's. */
  readonly r: number;
}

/** Describes a glint of light a break of ice or crystal throws, a four-point star. */
export interface Glint {
  /** Where it shows, before the rock's turn, in shares of the rock's radius. */
  readonly at: Point;
  /** How long after the break it shows, in milliseconds. */
  readonly delay: number;
  /** Its radius at its fullest, in shares of the rock's. */
  readonly r: number;
  /** How far it is turned, in radians. */
  readonly turn: number;
}

/** Describes a rock's break, as plain data: its own facets as shards, its dust, its sparks and its glints. */
export interface Break {
  /** The rock that breaks, whose outline flashes before it comes apart. */
  readonly shape: RockShape;
  /** In the order they are drawn, each over those before it. */
  readonly shards: readonly Shard[];
  /** Thrown from its middle, in field units. */
  readonly sparks: readonly Tick[];
  /** How far from its middle its sparks start, and how wide they are. */
  readonly sparkStart: TickStart;
  /** Round the ring its dust spreads on. */
  readonly puffs: readonly Puff[];
  readonly glints: readonly Glint[];
  /** How thick its dust is, 0 for none. */
  readonly dust: number;
  /**
   * How far from its middle any of it is drawn, at most, in field units,
   * short of the pixel or so its finest lines and glints are drawn at
   * least: where it is drawn again past an edge it reaches across.
   */
  readonly reach: number;
}

/** Returns the middle of a polygon's corners. */
function middleOf(points: readonly Point[]): Point {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** Returns a polygon's area. */
function areaOf(points: readonly Point[]): number {
  let sum = 0;
  points.forEach((p, i) => {
    const q = around(points, i + 1);
    sum += p.x * q.y - q.x * p.y;
  });
  return Math.abs(sum) / 2;
}

/** The least area a body's facet flies at, in square radii: a dent's are too small. */
const LEAST_SHARD_AREA = 0.024;

/** Returns a triangle's two slivers, split from the middle of its shortest side to its far corner. */
function sliversOf(facet: Facet): readonly Facet[] {
  const { points } = facet;
  if (points.length !== 3) return [facet];
  const sides = points
    .map((from, i) => ({
      from,
      to: around(points, i + 1),
      apex: around(points, i + 2),
    }))
    .sort(
      (p, q) =>
        Math.hypot(p.to.x - p.from.x, p.to.y - p.from.y) -
        Math.hypot(q.to.x - q.from.x, q.to.y - q.from.y),
    );
  const { from, to, apex } = around(sides, 0);
  const mid = middleOf([from, to]);
  return [
    { ...facet, points: [apex, from, mid] },
    { ...facet, points: [apex, mid, to] },
  ];
}

/**
 * Returns a rock's facets as a few heavy plates: its triangles joined in
 * runs, each plate the hull of a run, facing the way they face together,
 * and each of its flat tops halved.
 */
function platesOf(facets: readonly Facet[]): readonly Facet[] {
  const triangles = facets.filter(({ points }) => points.length === 3);
  const tops = facets.filter(({ points }) => points.length > 3);
  const run = Math.max(2, Math.round(triangles.length / 5));
  const plates: Facet[] = [];
  for (let i = 0; i < triangles.length; i += run) {
    const group = triangles.slice(i, i + run);
    const sum = (axis: keyof Facing): number =>
      group.reduce((total, { facing }) => total + facing[axis], 0);
    plates.push({
      points: hull(group.flatMap(({ points }) => points)),
      facing: unitFacing({ x: sum("x"), y: sum("y"), z: sum("z") }),
      part: "body",
    });
  }
  for (const top of tops) {
    const half = Math.floor(top.points.length / 2);
    plates.push({ ...top, points: top.points.slice(0, half + 1) });
    plates.push({
      ...top,
      points: [...top.points.slice(half), ...top.points.slice(0, 1)],
    });
  }
  return plates;
}

/**
 * Returns a rock's facets cut for breaking, a dent's left out, as its kind
 * comes apart: as they are, each triangle split into two slivers, or joined
 * into a few plates.
 */
function cutForBreaking(
  shape: RockShape,
  cut: BreakStyle["cut"],
): readonly Facet[] {
  const facets = shape.facets.filter(
    ({ points, part }) => part !== "body" || areaOf(points) > LEAST_SHARD_AREA,
  );
  switch (cut) {
    case "facets":
      return facets;
    case "slivers":
      return facets.flatMap(sliversOf);
    case "plates":
      return platesOf(facets);
  }
}

/**
 * Returns sparks thrown from a point, spread round a fan about a way, each
 * from its own draws: its angle, reach, length, delay and life, from spans
 * in the caller's units.
 */
function makeTicks(
  random: () => number,
  count: number,
  how: {
    readonly fan: number;
    readonly reach: readonly [number, number];
    readonly length: readonly [number, number];
    readonly life: readonly [number, number];
    readonly delay: number;
  },
): readonly Tick[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: ((i + between(random, 0.15, 0.85)) / count - 0.5) * how.fan,
    reach: between(random, ...how.reach),
    length: between(random, ...how.length),
    delay: between(random, 0, how.delay),
    life: between(random, ...how.life),
  }));
}

/** Takes so many draws from a random and leaves them. */
function skip(random: () => number, draws: number): void {
  for (let i = 0; i < draws; i++) random();
}

/**
 * Returns a rock's break, as the kit makes it from a seed: its own facets,
 * cut as its kind comes apart, as the shards that fly, those spread round
 * it flying the whole time and the rest gone in a few frames; its sparks,
 * puffs of dust and glints. The same rock from the same seed breaks the
 * same every time; how far it has turned and the blow that broke it only
 * turn and push its pieces as they are drawn.
 *
 * Its seed is mixed by hand, as the kit mixes it, so each break is the one
 * the kit drew; and its draws are taken in the kit's order, those for the
 * smaller rocks the kit draws it leaving among them, which the rules lay
 * instead, so its sparks are the kit's too.
 */
export function makeBreak(shape: RockShape, seed: number): Break {
  const style = BREAK_STYLES[shape.kind];
  const random = createRandom(
    seed * 4099 + shape.kind.length * 17 + shape.size.length,
  );
  const big = shape.size === "large" || shape.size === "boulder";
  const small = shape.size === "small";
  const facets = cutForBreaking(shape, style.cut);
  const heroes = Math.max(
    3,
    Math.round(style.heroes * (big ? 1 : small ? 0.6 : 0.8)),
  );
  // The heroes are spread round the rock, so none of its sides is left bare.
  const byAngle = facets
    .map(({ points }, i) => {
      const { x, y } = middleOf(points);
      return { i, angle: Math.atan2(y, x) };
    })
    .sort((a, b) => a.angle - b.angle);
  const every = Math.max(1, byAngle.length / heroes);
  const chosen = new Set(
    Array.from(
      { length: heroes },
      (_, k) => around(byAngle, Math.floor(k * every + every / 2)).i,
    ),
  );
  const shards = facets.map((facet, i): Shard => {
    const at = middleOf(facet.points);
    const far = Math.hypot(at.x, at.y);
    const out =
      far < 0.06
        ? polar(between(random, 0, TURN), 1)
        : { x: at.x / far, y: at.y / far };
    const hero = chosen.has(i) || facet.part === "gem";
    const turnWay = random() < 0.5 ? -1 : 1;
    const sway = between(random, -0.28, 0.28);
    const reach = hero
      ? between(random, ...style.reach)
      : between(random, 0.25, 0.55);
    const spin = turnWay * between(random, 0.4, 1) * style.spin;
    const life = hero
      ? between(random, 0.82, 1) * (BREAK_MS - WHOLE_MS)
      : between(random, 110, 190);
    return {
      points: facet.points.map(({ x, y }) => ({ x: x - at.x, y: y - at.y })),
      at,
      out,
      sway,
      facing: facet.facing,
      part: facet.part,
      reach,
      spin,
      shrink: style.shrink,
      life,
      hero,
    };
  });
  // The kit's smaller rocks: a heading drawn for each, one way or the
  // other of two, and its turn and spin.
  const pieces = small ? 0 : style.pieces;
  skip(random, pieces * (pieces === 2 ? 3 : 4));
  const radius = ROCK_RADIUS[shape.size];
  const sparks = makeTicks(random, Math.round(style.sparks * (big ? 1 : 0.6)), {
    fan: TURN,
    reach: [0.75, 1.35],
    length: [0.22, 0.4],
    life: [160, 240],
    delay: 40,
  }).map((tick) => ({
    ...tick,
    reach: tick.reach * radius,
    length: Math.max(0.3, tick.length * radius * 0.6),
  }));
  const puffCount = style.dust > 0 ? (big ? 8 : 5) : 0;
  const puffs = Array.from({ length: puffCount }, (_, i) => ({
    angle: ((i + between(random, -0.3, 0.3)) / puffCount) * TURN,
    at: between(random, 0.9, 1.08),
    r: between(random, 0.11, 0.2),
  }));
  const glints = Array.from(
    { length: Math.round(style.glints * (big ? 1 : 0.6)) },
    () => {
      const angle = between(random, 0, TURN);
      return {
        at: polar(angle, between(random, 0.5, 1.5)),
        delay: between(random, 50, 250),
        r: between(random, 0.12, 0.22),
        turn: between(random, 0, 0.6),
      };
    },
  );
  const made = {
    shape,
    shards,
    sparks,
    sparkStart: { from: radius * 0.45, width: style.sparkWidth },
    puffs,
    glints,
    dust: style.dust,
  };
  return { ...made, reach: reachOf(made) };
}

/** Returns the farthest of some points from the origin. */
function farthestOf(points: readonly Point[]): number {
  return Math.max(0, ...points.map(({ x, y }) => Math.hypot(x, y)));
}

/**
 * Returns how far from a break's middle any of it is drawn, at most, in
 * field units: the rock whole, its shards at their reach, its dust's ring
 * and puffs spread out, its glints at their fullest, and its sparks' heads.
 */
function reachOf(made: Omit<Break, "reach">): number {
  const { shape, shards, sparks, sparkStart, puffs, glints, dust } = made;
  const spread = DUST_RING.from + DUST_RING.spread;
  const radii = [
    farthestOf(shape.outline),
    ...shards.map(
      ({ points, at, reach }) =>
        Math.hypot(at.x, at.y) + reach + farthestOf(points),
    ),
    ...(dust > 0 ? [spread + (DUST_RING.width * dust) / 2] : []),
    ...puffs.map(
      ({ at, r }) => spread * at + r * (PUFF_GROWS.from + PUFF_GROWS.by),
    ),
    ...glints.map(({ at, r }) => Math.hypot(at.x, at.y) + r),
  ];
  const thrown = sparks.map(
    ({ reach }) => sparkStart.from + reach + sparkStart.width / 2,
  );
  return Math.max(ROCK_RADIUS[shape.size] * Math.max(...radii), ...thrown);
}

/** Every kind and size of rock's outlines' breaks, each made once from the seed its outline is cut from. */
const ROCK_BREAKS: BySize<readonly Break[]> = bySize((kind, size) =>
  Array.from({ length: ROCK_OUTLINES }, (_, outline) =>
    makeBreak(rockShape({ kind, size, outline }), FIRST_SEED + outline),
  ),
);

/**
 * Returns how a rock of a kind and size breaks in one of its outlines: from
 * its own facets, by its own seed, the same every time.
 *
 * @throws {RangeError} For an outline a kind and size of rock isn't drawn in.
 */
export function breakOf(rock: Pick<Rock, "kind" | "size" | "outline">): Break {
  const made = ROCK_BREAKS[rock.kind][rock.size]?.[rock.outline];
  if (made === undefined) {
    throw new RangeError(
      `No ${rock.size} ${rock.kind} rock breaks in outline ${String(rock.outline)}.`,
    );
  }
  return made;
}

/** How hard a blow pushes a broken rock's shards along its way, in shares of the rock's radius. */
const PUSH = 0.38;

/**
 * Writes how far the blow that broke a rock pushes its shards into a
 * record and returns it: along the blow's way, a share along each axis or
 * none, as the rock lay before it turned, in shares of its radius.
 */
export function shardPushOf(
  wayX: number,
  wayY: number,
  turn: number,
  into: Moving,
): Moving {
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  into.x = (wayX * cos + wayY * sin) * PUSH;
  into.y = (wayY * cos - wayX * sin) * PUSH;
  return into;
}

/** Describes a rock as it broke: how it breaks, how far it had turned, and how the blow pushes its shards. */
export interface Broken {
  readonly made: Break;
  /** How far it had turned, in radians. */
  readonly turn: number;
  /** The blow's push on its shards, as {@link shardPushOf} writes it. */
  readonly push: Readonly<Moving>;
}

/**
 * Describes a polygon of a break or a held hit at a moment, written each
 * frame: its place, in device pixels from the middle it plays about; how
 * far it is turned, in radians; how many device pixels a share of its
 * points' unit takes; its color; and how opaque it is.
 */
export interface Placed {
  x: number;
  y: number;
  turn: number;
  scale: number;
  color: number;
  alpha: number;
}

/** Describes a line of a spark at a moment, in device pixels from the middle it plays about, written each frame. */
export interface Streak {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  width: number;
  color: number;
  alpha: number;
}

/** Describes a disc of dust, or the ring it spreads on, at a moment, in device pixels from the break's middle, written each frame. */
export interface Round {
  x: number;
  y: number;
  radius: number;
  /** How wide its ring is, or 0 for a disc. */
  width: number;
  color: number;
  alpha: number;
}

/** Describes a polygon a round of a unit's radius is drawn as. */
export interface RoundShape {
  /** Its sides, each from a corner to the next, the last back to the first. */
  readonly sides: readonly (readonly [Point, Point])[];
  /** Its inside, as triangles fanned from its first corner. */
  readonly fan: readonly (readonly [Point, Point, Point])[];
  /** How far inside its circle each side falls, in shares of its radius. */
  readonly sag: number;
}

/** Returns a corner of a polygon of so many corners and a unit's radius, its first at the right. */
function cornerOf(corner: number, count: number): Point {
  return polar((corner / count) * TURN, 1);
}

/** Returns the polygon of so many corners a round of a unit's radius is drawn as. */
function roundShape(count: number): RoundShape {
  return {
    sides: Array.from({ length: count }, (_, side) => [
      cornerOf(side, count),
      cornerOf(side + 1, count),
    ]),
    fan: Array.from({ length: count - 2 }, (_, triangle) => [
      cornerOf(0, count),
      cornerOf(triangle + 1, count),
      cornerOf(triangle + 2, count),
    ]),
    sag: 1 - Math.cos(Math.PI / count),
  };
}

/**
 * The polygons a round is drawn as, fewest corners first, the finest apart.
 *
 * A break's dust is drawn in the fewest its size spares: `Graphics`' own
 * circles take a hundred corners, made anew each frame, and its fills
 * triangulate them, which a crowd of breaks can't spare.
 */
const ROUNDS: readonly RoundShape[] = [6, 8, 12, 16, 24, 32].map(roundShape);
const FINEST_ROUND = roundShape(48);

/**
 * How far inside its circle a round's sides may fall, in CSS pixels: a
 * puff of dust, small, soft and fading, further than the ring it spreads
 * on, whose edge is long.
 */
export const ROUND_SAG = { ring: 0.5, puff: 0.75 } as const;

/**
 * Returns the polygon of fewest corners a round of a radius, in device
 * pixels, is drawn as, its sides falling no further inside its circle than
 * so many CSS pixels at a pixel ratio, or the finest there is.
 */
export function roundOf(
  radius: number,
  sag: number,
  pixelRatio: number,
): RoundShape {
  const most = sag * pixelRatio;
  for (const round of ROUNDS) {
    if (radius * round.sag <= most) return round;
  }
  return FINEST_ROUND;
}

/** Describes the tones something that gives off light is drawn in: its bright middle and its body. */
export interface Energy {
  /** Near white on a dark field, and its densest ink on a light one. */
  readonly hot: number;
  /** Its own color, a little lifted on a dark field. */
  readonly body: number;
}

/**
 * Returns the tones something of a color that gives off light is drawn in.
 * On a dark field its middle is the color lifted nearly to white; a light
 * field is already the brightest thing there is, so there its middle is
 * the color's densest ink, mixed toward the field's text, as the shots
 * are drawn in: ink on paper.
 */
export function energyOf(
  color: number,
  palette: Pick<BeltPalette, "mode" | "shot">,
): Energy {
  return palette.mode === "light"
    ? { hot: mixTone(color, palette.shot, 0.45), body: color }
    : {
        hot: mixTone(color, 0xffffff, 0.82),
        body: mixTone(color, 0xffffff, 0.22),
      };
}

/** Returns a share that rises to 1 at a peak and falls back, for a thing that shows and goes. */
function swell(share: number, peak: number): number {
  if (share <= 0 || share >= 1) return 0;
  return share < peak ? share / peak : 1 - (share - peak) / (1 - peak);
}

/** Returns how strongly a broken rock flashes, a time after it broke: held, then fading. */
function flashOf(since: number): number {
  return (
    FLASH.most * (1 - shareDone(FLASH.holds, since, FLASH.gone - FLASH.holds))
  );
}

/**
 * Returns the tone an ink flashes in as its rock is struck: nearly white on
 * a dark field, and a pale tint of the ink on a light one, where white would
 * be the field itself.
 */
function flashTone(ink: number, palette: Pick<BeltPalette, "mode">): number {
  return mixTone(ink, 0xffffff, palette.mode === "light" ? 0.62 : 0.9);
}

/** Returns the ink a part of a kind of rock is drawn in: a crystal's gems in its own, its body in a stone's. */
function inkOf(kind: RockKindId, part: Part, palette: BeltPalette): number {
  return part === "gem" ? palette.rocks.crystal : rockColor(kind, palette);
}

/** Returns a rock's radius in device pixels at a scale. */
function radiusOf(made: Break, scale: ArtScale): number {
  return ROCK_RADIUS[made.shape.size] * scale.unit;
}

/**
 * Writes the rock whole, a time after it broke, into a record and returns
 * whether it shows: its outline, about its middle, turned as it was,
 * flashing, until it comes apart.
 */
export function wholeAt(
  { made, turn }: Broken,
  since: number,
  palette: BeltPalette,
  scale: ArtScale,
  into: Placed,
): boolean {
  if (since >= WHOLE_MS) return false;
  const ink = rockColor(made.shape.kind, palette);
  into.x = 0;
  into.y = 0;
  into.turn = turn;
  into.scale = radiusOf(made, scale);
  into.color = mixTone(ink, flashTone(ink, palette), flashOf(since));
  into.alpha = 1;
  return true;
}

/**
 * Writes one of a broken rock's shards, a time after it broke, into a record
 * and returns whether it shows: once the rock has come apart, flying out
 * along its way and the blow's, slowing, tumbling and shrinking, lit as the
 * field's light falls on the way it faces, flashing first, and fading into
 * the field's color and out as its life runs.
 */
export function shardAt(
  shard: Shard,
  { made, turn, push }: Broken,
  since: number,
  palette: BeltPalette,
  scale: ArtScale,
  into: Placed,
): boolean {
  if (since < WHOLE_MS) return false;
  const done = shareDone(WHOLE_MS, since, shard.life);
  if (done >= 1) return false;
  const heading =
    Math.atan2(shard.out.y + push.y, shard.out.x + push.x) + shard.sway;
  const far = shard.reach * easeOutCubic(done);
  const x = shard.at.x + Math.cos(heading) * far;
  const y = shard.at.y + Math.sin(heading) * far;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const radius = radiusOf(made, scale);
  const turned = turn + shard.spin * done;
  const ink = inkOf(made.shape.kind, shard.part, palette);
  const lit = inLight(ink, litBy(shard.facing, turned, palette.rockLight));
  const flashed = mixTone(lit, flashTone(ink, palette), flashOf(since));
  into.x = (x * cos - y * sin) * radius;
  into.y = (x * sin + y * cos) * radius;
  into.turn = turned;
  into.scale = radius * lerp(1, shard.shrink, done);
  into.color = mixTone(flashed, palette.field, done ** 1.6 * SHARD_FADE);
  into.alpha = 1 - done ** 3;
  return true;
}

/** Returns the tone a kind of rock's dust is drawn in: its body's ink mixed toward the field. */
function dustTone(kind: RockKindId, palette: BeltPalette): number {
  return mixTone(
    rockColor(kind, palette),
    palette.field,
    palette.mode === "light" ? 0.45 : 0.3,
  );
}

/** Returns how far a break's dust has spread, a time after it broke, from 0 to 1. */
function dustShare(since: number): number {
  return shareDone(15, since, BREAK_MS - 35);
}

/**
 * Writes the ring a broken rock's dust spreads on, a time after it broke,
 * into a record and returns whether it shows: spreading out past the rock's
 * edge, thinning and fading.
 */
export function dustAt(
  { made }: Broken,
  since: number,
  palette: BeltPalette,
  scale: ArtScale,
  into: Round,
): boolean {
  const done = dustShare(since);
  if (made.dust <= 0 || done <= 0 || done >= 1) return false;
  const radius = radiusOf(made, scale);
  into.x = 0;
  into.y = 0;
  into.radius =
    radius * (DUST_RING.from + DUST_RING.spread * easeOutCubic(done));
  into.width = Math.max(
    LEAST_CSS_PX.line * scale.pixelRatio,
    radius * DUST_RING.width * (1 - done) * made.dust,
  );
  into.color = dustTone(made.shape.kind, palette);
  into.alpha = 0.55 * (1 - done);
  return true;
}

/**
 * Writes a puff of a broken rock's dust, a time after it broke, into a record
 * and returns whether it shows: on the ring its dust spreads on, swelling
 * and fading.
 */
export function puffAt(
  puff: Puff,
  broken: Broken,
  since: number,
  palette: BeltPalette,
  scale: ArtScale,
  into: Round,
): boolean {
  if (!dustAt(broken, since, palette, scale, into)) return false;
  const done = dustShare(since);
  const angle = puff.angle + broken.turn;
  const far = into.radius * puff.at;
  into.x = Math.cos(angle) * far;
  into.y = Math.sin(angle) * far;
  into.radius =
    radiusOf(broken.made, scale) *
    puff.r *
    (PUFF_GROWS.from + PUFF_GROWS.by * done);
  into.width = 0;
  into.alpha = 0.42 * (1 - done) * Math.min(1, broken.made.dust);
  return true;
}

/** How far from a held hit its sparks start, and how wide they are. */
const IMPACT_START: TickStart = { from: 0.15, width: 0.1 };

/** Writes a streak along an angle, from so near its point to so far, at an alpha, into a record. */
function streakAlong(
  streak: Streak,
  angle: number,
  near: number,
  far: number,
  alpha: number,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  streak.fromX = cos * near;
  streak.fromY = sin * near;
  streak.toX = cos * far;
  streak.toY = sin * far;
  streak.alpha = alpha;
}

/**
 * Writes a spark of light, a time after it was thrown, into two records,
 * its body and its bright head, and returns whether it shows: flying out
 * from so far off its point along its way turned by an angle, shortening
 * and fading, in device pixels at a scale.
 */
export function tickAt(
  tick: Tick,
  since: number,
  start: TickStart,
  turn: number,
  energy: Energy,
  scale: ArtScale,
  body: Streak,
  hot: Streak,
): boolean {
  if (since < tick.delay) return false;
  const done = shareDone(tick.delay, since, tick.life);
  if (done >= 1) return false;
  const { unit } = scale;
  const head = (start.from + tick.reach * easeOutCubic(done)) * unit;
  const tail = Math.max(
    start.from * unit,
    head - tick.length * unit * (1 - done * 0.7),
  );
  const width = Math.max(
    LEAST_CSS_PX.line * scale.pixelRatio,
    start.width * unit * (1 - done * 0.4),
  );
  const alpha = 1 - done * done;
  const angle = tick.angle + turn;
  streakAlong(body, angle, tail, head, alpha);
  body.width = width;
  body.color = energy.body;
  streakAlong(hot, angle, lerp(tail, head, 0.55), head, alpha);
  hot.width = width * 0.6;
  hot.color = energy.hot;
  return true;
}

/**
 * Writes one of a broken rock's sparks, a time after it broke, into two
 * records, as {@link tickAt} does, from near its middle.
 */
export function sparkAt(
  tick: Tick,
  { made }: Broken,
  since: number,
  energy: Energy,
  scale: ArtScale,
  body: Streak,
  hot: Streak,
): boolean {
  return tickAt(tick, since, made.sparkStart, 0, energy, scale, body, hot);
}

/**
 * Returns the corners of a four-point spark about the origin, its points a
 * radius out, turned by an angle, its waist a share of that.
 */
export function sparkPoints(
  r: number,
  pinch: number,
  turn: number,
): readonly Point[] {
  return Array.from({ length: 8 }, (_, i) =>
    polar(turn + (i / 8) * TURN, i % 2 === 1 ? r * pinch : r),
  );
}

/** A glint's corners, a unit out, unturned. */
export const GLINT_POINTS = sparkPoints(1, 0.2, 0);

/**
 * Writes one of a broken rock's glints, a time after it broke, into a
 * record and returns whether it shows: a star of {@link GLINT_POINTS},
 * swelling and going, in white on a dark field and in the rock's ink on a
 * light one.
 */
export function glintAt(
  glint: Glint,
  { made, turn }: Broken,
  since: number,
  palette: BeltPalette,
  scale: ArtScale,
  into: Placed,
): boolean {
  if (since < glint.delay) return false;
  const done = shareDone(glint.delay, since, GLINT_MS);
  if (done >= 1) return false;
  const radius = radiusOf(made, scale);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  into.x = (glint.at.x * cos - glint.at.y * sin) * radius;
  into.y = (glint.at.x * sin + glint.at.y * cos) * radius;
  into.turn = glint.turn;
  into.scale =
    radius * glint.r * swell(done, 0.35) +
    LEAST_CSS_PX.glint * scale.pixelRatio;
  into.color =
    palette.mode === "light"
      ? rockColor(made.shape.kind, palette)
      : palette.glint;
  into.alpha = 0.95;
  return true;
}

/**
 * Returns the sparks a held hit throws, as the kit's impact makes them from
 * a seed: so many, fanned back about the way the shot came, each to a
 * reach in field units.
 */
export function makeImpact(count: number, seed: number): readonly Tick[] {
  return makeTicks(createRandom(seed * 97 + 5), count, {
    fan: TURN * 0.42,
    reach: [0.7, 1.3],
    length: [0.3, 0.5],
    life: [110, 150],
    delay: 10,
  });
}

/** Returns each shape of a held hit's sparks, so many in each, made once. */
function impactShapes(count: number): readonly (readonly Tick[])[] {
  return Array.from({ length: IMPACT_SHAPES }, (_, seed) =>
    makeImpact(count, seed + 1),
  );
}

/** The shapes of the sparks a held hit throws: more off iron, which rings. */
const IMPACTS = { iron: impactShapes(7), other: impactShapes(5) } as const;

/**
 * Returns the sparks a held hit on a kind of rock throws, the shape its
 * event's serial picks, so hits in a row throw theirs apart.
 */
export function impactOf(kind: RockKindId, serial: number): readonly Tick[] {
  return around(IMPACTS[kind === "iron" ? "iron" : "other"], serial);
}

/** Returns how far a held hit's spark is through the kit's impact, a time after the hit: its time stretched over the hit's. */
function impactSince(since: number): number {
  return since * (IMPACT_MS / HELD_MS);
}

/**
 * Writes one of a held hit's sparks, a time after the hit, into two records,
 * as {@link tickAt} does, fanned back about the way the shot came.
 */
export function impactTickAt(
  tick: Tick,
  toward: number,
  since: number,
  energy: Energy,
  scale: ArtScale,
  body: Streak,
  hot: Streak,
): boolean {
  return tickAt(
    tick,
    impactSince(since),
    IMPACT_START,
    toward,
    energy,
    scale,
    body,
    hot,
  );
}

/** A held hit's four-point spark's corners, a unit out, unturned. */
export const IMPACT_POINTS = sparkPoints(1, 0.3, 0);

/** How far a held hit's four-point spark reaches as it starts, in field units. */
const IMPACT_FLASH = 0.42;

/**
 * Writes the four-point spark where a held hit struck, a time after it,
 * into a record and returns whether it shows: a star of
 * {@link IMPACT_POINTS} turned to the way the shot came, shrinking and
 * fading, in the energy's bright middle.
 */
export function impactFlashAt(
  toward: number,
  since: number,
  energy: Energy,
  scale: ArtScale,
  into: Placed,
): boolean {
  const done = shareDone(0, impactSince(since), IMPACT_FLASH_MS);
  if (done >= 1) return false;
  into.x = 0;
  into.y = 0;
  into.turn = toward;
  into.scale = IMPACT_FLASH * scale.unit * (1 - done * 0.6);
  into.color = energy.hot;
  into.alpha = 1 - done;
  return true;
}

/**
 * How far from where it struck any of a held hit's spark is drawn, at most,
 * in field units, short of the pixel or so its finest lines are drawn at
 * least: its four-point spark, and the heads of the longest-reaching
 * sparks of any of its shapes, off iron or any other kind.
 */
export const HELD_REACH = Math.max(
  IMPACT_FLASH,
  ...[...IMPACTS.iron, ...IMPACTS.other].flatMap((ticks) =>
    ticks.map(
      ({ reach }) => IMPACT_START.from + reach + IMPACT_START.width / 2,
    ),
  ),
);

/**
 * Returns how far a rock's rim lies from its middle toward a way, in field
 * units, where a held hit's spark is thrown from: its outline turned as the
 * rock has turned.
 */
export function rimToward(
  rock: Pick<Rock, "kind" | "size" | "outline" | "angle">,
  toward: number,
): number {
  return (
    reachAt(rockShape(rock).outline, toward - rock.angle) *
    ROCK_RADIUS[rock.size]
  );
}

/**
 * Returns the way, in radians, from a place on the field back toward where
 * a shot came from: toward the ship the shortest way across the wrap, or,
 * while none flies, toward the field's light, as a held hit's flash stands.
 */
export function towardShip(
  field: {
    readonly ship: Readonly<Place> | null;
    readonly torus: Readonly<Torus>;
  },
  x: number,
  y: number,
  palette: Pick<BeltPalette, "rockLight">,
): number {
  const { ship, torus } = field;
  if (ship === null) {
    const { way } = palette.rockLight;
    return Math.atan2(way.y, way.x);
  }
  return Math.atan2(
    across(y, ship.y, torus.height),
    across(x, ship.x, torus.width),
  );
}
