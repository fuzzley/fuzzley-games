// How a rock is cut: a low dome of flat facets, its outline a ring of
// corners at its foot and rings of corners inside it, each higher, joined
// into triangles, with a peak or a flat top; and the dents and gems a kind
// adds to it. Everything is in shares of the rock's radius.

import type { Point } from "@fz/phaser/shapes";
import { TURN } from "../../../rules/angles";
import {
  type Facing,
  around,
  between,
  facingOf,
  polar,
  unitFacing,
} from "./space";

/** Names whose ink a facet takes: its rock's body's, or a crystal's gem's. */
export type Part = "body" | "gem";

/** Describes a flat face of a rock. */
export interface Facet {
  /** Its corners, in shares of the rock's radius. */
  readonly points: readonly Point[];
  /** The way it faces, which the light falls on. */
  readonly facing: Facing;
  readonly part: Part;
}

/** Describes a ring of corners inside a rock's outline. */
export interface Ring {
  /** How far out it lies, as a share of the outline's reach there. */
  readonly at: number;
  /** How high it stands. */
  readonly z: number;
  readonly sides: number;
}

/** Says how a kind of rock is cut at a size. */
export interface Cut {
  /** The corners of its outline. */
  readonly sides: number;
  /** How much nearer a corner may lie than the farthest, from 0 to 1. */
  readonly jag: number;
  /** Its height over its width, 1 where it is left out. */
  readonly squash?: number;
  /** How much nearer every other corner lies, for a shard, none where it is left out. */
  readonly spike?: number;
  /** Its rings of corners, inward from the outline. */
  readonly rings: readonly Ring[];
  /** How high its peak stands, where it has one. */
  readonly top: number;
  /** Whether its last ring is capped flat rather than drawn up to a peak. */
  readonly flatTop?: boolean;
}

/** Describes a corner of a rock's dome: where it lies, how high, and at what angle about the middle. */
export interface Corner {
  readonly p: Point;
  readonly z: number;
  readonly angle: number;
}

/** Describes a rock's dome as it was cut: its outline, its facets and its rings of corners, the outline's first. */
export interface Dome {
  readonly outline: readonly Point[];
  readonly facets: readonly Facet[];
  readonly rings: readonly (readonly Corner[])[];
}

/** The way a facet faces that lies flat, straight at the viewer. */
export const FLAT: Facing = { x: 0, y: 0, z: 1 };

/** Returns how far apart two angles are, the short way round. */
function angleApart(a: number, b: number): number {
  return Math.abs(((a - b + TURN * 1.5) % TURN) - TURN / 2);
}

/** Returns a corner's angle counted on past `from`, and a turn more once a walk has passed its ring's end. */
function unwrapped(ring: readonly Corner[], k: number, from: number): number {
  const { angle } = around(ring, k);
  const behind = angle < from - TURN / 2 ? TURN : 0;
  return angle + behind + (k >= ring.length ? TURN : 0);
}

/**
 * Returns the triangles between two rings of corners, each in order of its
 * angle: a walk round both, taking the corner whose angle comes next.
 *
 * @throws {RangeError} Where either ring has no corners.
 */
export function strip(
  outer: readonly Corner[],
  inner: readonly Corner[],
): readonly (readonly [Corner, Corner, Corner])[] {
  const first = around(outer, 0);
  let start = 0;
  let nearest = Infinity;
  inner.forEach((corner, i) => {
    const off = angleApart(corner.angle, first.angle);
    if (off < nearest) {
      nearest = off;
      start = i;
    }
  });
  // The inner ring starts at the corner nearest the outer's first.
  const rolled = inner.map((_, i) => around(inner, i + start));
  const triangles: (readonly [Corner, Corner, Corner])[] = [];
  let i = 0;
  let j = 0;
  while (i < outer.length || j < rolled.length) {
    const a = around(outer, i);
    const b = around(rolled, j);
    const aNext = unwrapped(outer, i + 1, first.angle);
    const bNext = unwrapped(rolled, j + 1, first.angle);
    if (i < outer.length && (j >= rolled.length || aNext <= bNext)) {
      triangles.push([a, around(outer, i + 1), b]);
      i++;
    } else {
      triangles.push([b, around(rolled, j + 1), a]);
      j++;
    }
  }
  return triangles;
}

/** Returns a facet of three corners. */
function facetOf(
  [a, b, c]: readonly [Corner, Corner, Corner],
  part: Part,
): Facet {
  return {
    points: [a.p, b.p, c.p],
    facing: facingOf(a.p, a.z, b.p, b.z, c.p, c.z),
    part,
  };
}

/**
 * Returns a dome cut from draws of a seeded random: an outline whose
 * farthest corner reaches the radius, and rings of corners inside it, each
 * higher, joined into facets, under a peak or a flat top.
 */
export function dome(random: () => number, cut: Cut): Dome {
  const squash = cut.squash ?? 1;
  const unsized = Array.from({ length: cut.sides }, (_, i) => {
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
    return {
      p: { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach * squash },
      z: 0,
      angle,
    };
  });
  const farthest = Math.max(...unsized.map(({ p }) => Math.hypot(p.x, p.y)));
  const rim: readonly Corner[] = unsized.map((corner) => ({
    ...corner,
    p: { x: corner.p.x / farthest, y: corner.p.y / farthest },
  }));
  /** Returns the outline's reach at an angle, as its corner nearest that angle reaches, unsquashed. */
  const rimAt = (angle: number): number => {
    let reach = 1;
    let nearest = Infinity;
    for (const corner of rim) {
      const off = angleApart(corner.angle, angle);
      if (off < nearest) {
        nearest = off;
        reach = Math.hypot(corner.p.x, corner.p.y / squash);
      }
    }
    return reach;
  };
  const rings: (readonly Corner[])[] = [rim];
  for (const ring of cut.rings) {
    const turn = between(random, 0, TURN);
    const corners = Array.from({ length: ring.sides }, (_, i) => {
      const angle =
        (turn + ((i + between(random, -0.2, 0.2)) / ring.sides) * TURN) % TURN;
      const reach = ring.at * rimAt(angle) * between(random, 0.9, 1.08);
      return {
        p: { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach * squash },
        z: ring.z * between(random, 0.9, 1.1),
        angle,
      };
    });
    rings.push(corners.sort((a, b) => a.angle - b.angle));
  }
  const facets: Facet[] = [];
  rings.forEach((outer, r) => {
    const inner = rings[r + 1];
    if (inner === undefined) return;
    for (const triangle of strip(outer, inner)) {
      facets.push(facetOf(triangle, "body"));
    }
  });
  const last = around(rings, -1);
  if (cut.flatTop) {
    facets.push({ points: last.map(({ p }) => p), facing: FLAT, part: "body" });
  } else {
    const peak: Corner = {
      p: {
        x: between(random, -0.1, 0.1),
        y: between(random, -0.1, 0.1) * squash,
      },
      z: cut.top,
      angle: 0,
    };
    last.forEach((corner, i) => {
      facets.push(facetOf([corner, around(last, i + 1), peak], "body"));
    });
  }
  return { outline: rim.map(({ p }) => p), facets, rings };
}

/**
 * Returns the facets of a dent: a shallow pit of six sides, its walls
 * facing its middle, so the light finds its far wall.
 */
export function dent(
  random: () => number,
  at: Point,
  radius: number,
): readonly Facet[] {
  const sides = 6;
  const turn = between(random, 0, TURN);
  const rim = Array.from({ length: sides }, (_, i) => {
    const angle = turn + (i / sides) * TURN;
    return {
      p: polar(angle, radius * between(random, 0.85, 1.1), at),
      z: 0,
      angle,
    };
  });
  const pit: Corner = { p: at, z: -radius * 0.9, angle: 0 };
  return rim.map((corner, i) =>
    facetOf([corner, around(rim, i + 1), pit], "body"),
  );
}

/** How far a gem's two faces lean off its ridge, against how far they face the viewer. */
const GEM_TILT = { lean: 0.75, up: 0.66 } as const;

/** How far along a gem its sides run straight before they close to its tip. */
const GEM_SHOULDER = 0.72;

/**
 * Returns the facets of a gem: a long prism with a ridge down its middle,
 * standing out from a point at an angle, its half width either side.
 */
export function prism(
  base: Point,
  angle: number,
  length: number,
  half: number,
): readonly Facet[] {
  const along = polar(angle, 1);
  const across = polar(angle + TURN / 4, 1);
  const at = (l: number, w: number): Point => ({
    x: base.x + along.x * l + across.x * w,
    y: base.y + along.y * l + across.y * w,
  });
  const tip = at(length, 0);
  const foot = at(0, 0);
  return [-1, 1].map((side) => ({
    points: [
      at(0, side * half),
      at(length * GEM_SHOULDER, side * half),
      tip,
      foot,
    ],
    facing: unitFacing({
      x: side * across.x * GEM_TILT.lean,
      y: side * across.y * GEM_TILT.lean,
      z: GEM_TILT.up,
    }),
    part: "gem",
  }));
}
