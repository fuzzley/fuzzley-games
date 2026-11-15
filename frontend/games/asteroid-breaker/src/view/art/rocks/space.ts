// The little geometry a rock is cut with: points about its middle, in shares
// of its radius, y running down the screen as the field's does, and ways in
// three dimensions, z toward the viewer.

import { lerp } from "@fz/core/math";
import type { Point } from "@fz/phaser/shapes";

/** Describes a way in three dimensions, a unit long: x right, y down the screen, z toward the viewer. */
export interface Facing {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Returns a number drawn evenly from a span. */
export function between(
  random: () => number,
  least: number,
  most: number,
): number {
  return lerp(least, most, random());
}

/**
 * Returns the point at an angle and a distance from a middle; angle 0 points
 * right and a quarter turn points down, as the field's y does.
 */
export function polar(
  angle: number,
  radius: number,
  middle: Point = { x: 0, y: 0 },
): Point {
  return {
    x: middle.x + Math.cos(angle) * radius,
    y: middle.y + Math.sin(angle) * radius,
  };
}

/**
 * Returns a point turned about the origin, by an angle in radians, as the
 * kit turns it, where `@fz/phaser/shapes`'s `turned()` takes degrees.
 */
export function turnedBy({ x, y }: Point, angle: number): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** Returns a point a share of the way from one to another. */
export function pointBetween(from: Point, to: Point, share: number): Point {
  return { x: lerp(from.x, to.x, share), y: lerp(from.y, to.y, share) };
}

/**
 * Returns the item of a ring at a place counted round it, so one past its
 * end is its first and -1 its last.
 *
 * @throws {RangeError} For a ring with nothing in it.
 */
export function around<T>(ring: readonly T[], place: number): T {
  const item = ring[((place % ring.length) + ring.length) % ring.length];
  if (item === undefined) throw new RangeError("An empty ring has no items.");
  return item;
}

/** Returns a way a unit long, or the way itself where it has no length. */
export function unitFacing({ x, y, z }: Facing): Facing {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

/**
 * Returns the way a flat triangle faces, from its three corners, each a point
 * and how high it stands: toward the viewer, whichever way its corners run.
 */
export function facingOf(
  a: Point,
  aZ: number,
  b: Point,
  bZ: number,
  c: Point,
  cZ: number,
): Facing {
  const u = { x: b.x - a.x, y: b.y - a.y, z: bZ - aZ };
  const v = { x: c.x - a.x, y: c.y - a.y, z: cZ - aZ };
  const facing = unitFacing({
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  });
  return facing.z < 0 ? { x: -facing.x, y: -facing.y, z: -facing.z } : facing;
}

/**
 * Returns a jagged line from one point to another: the two ends, and
 * `steps - 1` points between, evenly along it, each pushed across it by up
 * to `sway` of its length either way.
 */
export function jagged(
  random: () => number,
  from: Point,
  to: Point,
  steps: number,
  sway: number,
): readonly Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const across = { x: -dy / length, y: dx / length };
  const points = [from];
  for (let i = 1; i < steps; i++) {
    const share = i / steps;
    const off = between(random, -sway, sway) * length;
    points.push({
      x: from.x + dx * share + across.x * off,
      y: from.y + dy * share + across.y * off,
    });
  }
  points.push(to);
  return points;
}

/** Returns the convex hull of points, in order around it. */
export function hull(points: readonly Point[]): readonly Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (from: readonly Point[]): Point[] => {
    const chain: Point[] = [];
    for (const point of from) {
      while (
        chain.length >= 2 &&
        cross(around(chain, -2), around(chain, -1), point) <= 0
      ) {
        chain.pop();
      }
      chain.push(point);
    }
    return chain;
  };
  const lower = half(sorted);
  const upper = half(sorted.reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * Returns how far an outline reaches from its middle at an angle: where a ray
 * from the middle leaves it, or 1 where none does.
 */
export function reachAt(outline: readonly Point[], angle: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let reach = 0;
  outline.forEach((a, i) => {
    const b = around(outline, i + 1);
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const cross = dx * ey - dy * ex;
    if (Math.abs(cross) < 1e-12) return;
    const along = (a.x * ey - a.y * ex) / cross;
    const share = (a.x * dy - a.y * dx) / cross;
    if (along > 0 && share >= 0 && share <= 1) reach = Math.max(reach, along);
  });
  return reach || 1;
}
