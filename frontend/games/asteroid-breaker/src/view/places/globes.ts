import { clamp, lerp } from "@fz/core/math";
import type { Point } from "@fz/phaser/shapes";
import { TURN } from "../../rules/angles";

// The geometry the landmarks are cut from, in the units each is handed: a
// globe of flat faces, a crater on one, a tilted ring and a jagged line.

/** Says a way in three dimensions, its z toward the viewer. */
export type Vec3 = readonly [number, number, number];

/** Describes a flat face, and how brightly the field's light falls on it, from 0.3 to a little over 1. */
export interface Face {
  readonly points: readonly Point[];
  readonly light: number;
}

/** Returns a way at length one. */
function unit([x, y, z]: Vec3): Vec3 {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

/**
 * The way the field's light comes from: its upper left and the viewer's
 * side, as the rocks are lit.
 */
export const LIGHT: Vec3 = unit([-0.52, -0.62, 0.58]);

/** Returns how brightly the field's light falls on a face that looks a way, from 0.3 to a little over 1. */
export function lightOn(normal: Vec3): number {
  const facing =
    normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2];
  return 0.3 + 0.95 * Math.max(0, facing);
}

/** Returns the way a triangle faces, toward the viewer. */
function normalOf(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as const;
  const facing = unit([
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ]);
  return facing[2] < 0 ? [-facing[0], -facing[1], -facing[2]] : facing;
}

/** Returns a number drawn evenly from a span. */
export function between(
  random: () => number,
  least: number,
  most: number,
): number {
  return least + (most - least) * random();
}

/** Returns one of a list's entries, drawn evenly. */
export function pick<T>(random: () => number, list: readonly [T, ...T[]]): T {
  return list[Math.floor(random() * list.length)] ?? list[0];
}

/** Returns the point at an angle and a distance from a middle; a quarter turn points down, as a screen's y does. */
export function polar(angle: number, reach: number, middle: Point): Point {
  return {
    x: middle.x + Math.cos(angle) * reach,
    y: middle.y + Math.sin(angle) * reach,
  };
}

/** Returns a point turned about the origin by an angle, in radians. */
export function rotated({ x, y }: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/** Describes a corner of a globe: where it lies on its disc, how high it stands, and its angle about the middle. */
interface Corner {
  readonly p: Point;
  readonly z: number;
  readonly angle: number;
}

/** Says where a ring of a globe's corners lies, as a share of its radius in, and how many corners it has. */
export interface GlobeRing {
  readonly at: number;
  readonly sides: number;
}

/** The corner a ring with none would give, as no globe's ring is. */
const NO_CORNER: Corner = { p: { x: 0, y: 0 }, z: 1, angle: 0 };

/**
 * Returns the triangles between two rings of corners, each in order of its
 * angle from about the same start.
 */
function zip(
  outer: readonly Corner[],
  inner: readonly Corner[],
): (readonly [Corner, Corner, Corner])[] {
  const cornerAt = (ring: readonly Corner[], k: number): Corner =>
    ring[k % ring.length] ?? NO_CORNER;
  const angleAt = (ring: readonly Corner[], k: number): number =>
    cornerAt(ring, k).angle + (k >= ring.length ? TURN : 0);
  const triangles: (readonly [Corner, Corner, Corner])[] = [];
  let i = 0;
  let j = 0;
  while (i < outer.length || j < inner.length) {
    if (
      i < outer.length &&
      (j >= inner.length || angleAt(outer, i + 1) <= angleAt(inner, j + 1))
    ) {
      triangles.push([
        cornerAt(outer, i),
        cornerAt(outer, i + 1),
        cornerAt(inner, j),
      ]);
      i++;
    } else {
      triangles.push([
        cornerAt(inner, j),
        cornerAt(inner, j + 1),
        cornerAt(outer, i),
      ]);
      j++;
    }
  }
  return triangles;
}

/**
 * Returns a globe of radius 1 cut in flat faces, each lit: rings of corners
 * on a ball, seen from straight on, outward in, the first on its edge,
 * joined in triangles up to its middle.
 */
export function globe(
  random: () => number,
  rings: readonly GlobeRing[],
): readonly Face[] {
  const corners = rings.map((ring, k) =>
    Array.from({ length: ring.sides }, (_, i): Corner => {
      const angle =
        ((i + (k % 2) * 0.5 + between(random, -0.16, 0.16)) / ring.sides) *
        TURN;
      const reach = k === 0 ? 1 : ring.at * between(random, 0.95, 1.05);
      return {
        p: polar(angle, reach, { x: 0, y: 0 }),
        z: Math.sqrt(Math.max(0, 1 - reach * reach)),
        angle,
      };
    }),
  );
  const faceOf = ([a, b, c]: readonly [Corner, Corner, Corner]): Face => ({
    points: [a.p, b.p, c.p],
    light: lightOn(
      normalOf([a.p.x, a.p.y, a.z], [b.p.x, b.p.y, b.z], [c.p.x, c.p.y, c.z]),
    ),
  });
  const faces = corners
    .slice(1)
    .flatMap((inner, k) => zip(corners[k] ?? [], inner).map(faceOf));
  const last = corners.at(-1) ?? [];
  const top: Corner = {
    p: { x: between(random, -0.05, 0.05), y: between(random, -0.05, 0.05) },
    z: 1,
    angle: 0,
  };
  return [
    ...faces,
    ...last.map((corner, i) =>
      faceOf([corner, last[(i + 1) % last.length] ?? corner, top]),
    ),
  ];
}

/** How many sides a crater's rim is cut in. */
const CRATER_SIDES = 14;

/**
 * Returns the faces of a crater on a globe of radius 1, each lit: a floor, a
 * crescent of wall in shade on the side the light comes from, and a lit
 * crescent across the floor from it, which faces the light.
 *
 * @param at Its middle on the globe's disc.
 * @param r Its radius.
 * @param turn Where its rim's corners start, in radians.
 */
export function crater(at: Point, r: number, turn: number): readonly Face[] {
  const out: Vec3 = [
    at.x,
    at.y,
    Math.sqrt(Math.max(0.01, 1 - at.x * at.x - at.y * at.y)),
  ];
  const across = unit([-out[1], out[0], 0]);
  const along: Vec3 = [
    out[1] * across[2] - out[2] * across[1],
    out[2] * across[0] - out[0] * across[2],
    out[0] * across[1] - out[1] * across[0],
  ];
  /** Returns a point of the crater, at an angle and a share of its radius. */
  const on = (angle: number, share: number): Point => ({
    x:
      out[0] +
      (across[0] * Math.cos(angle) + along[0] * Math.sin(angle)) * r * share,
    y:
      out[1] +
      (across[1] * Math.cos(angle) + along[1] * Math.sin(angle)) * r * share,
  });
  const lightWay = Math.hypot(LIGHT[0], LIGHT[1]);
  const ground = lightOn(out);
  /** Returns how squarely the wall at an angle faces the light, from -1, turned from it, to 1. */
  const facing = (angle: number): number => {
    const { x, y } = on(angle, 1);
    return (
      (-(x - at.x) * LIGHT[0] - (y - at.y) * LIGHT[1]) /
      (Math.hypot(x - at.x, y - at.y) * lightWay || 1)
    );
  };
  /** Returns how far in the wall's foot lies at an angle: the wall is widest where it faces the light or turns from it. */
  const foot = (angle: number): number =>
    1 - 0.3 * Math.abs(facing(angle)) ** 1.5;
  const walls: Face[] = [];
  const floor: Point[] = [];
  for (let i = 0; i < CRATER_SIDES; i++) {
    const from = turn + (i / CRATER_SIDES) * TURN;
    const to = turn + ((i + 1) / CRATER_SIDES) * TURN;
    const toward = facing((from + to) / 2);
    floor.push(on(from, foot(from)));
    if (Math.abs(toward) < 0.3) continue;
    walls.push({
      points: [on(from, 1), on(to, 1), on(to, foot(to)), on(from, foot(from))],
      light: clamp(ground + 0.5 * toward, 0.3, 1.12),
    });
  }
  return [{ points: floor, light: Math.max(0.32, ground - 0.07) }, ...walls];
}

/** Says how a ring about a middle is seen: its middle, and its height over its width and its tilt, in radians. */
export interface RingView {
  readonly middle: Point;
  readonly squash: number;
  readonly tilt: number;
}

/**
 * Returns a point on a tilted ring around a middle, a circle seen from the
 * side, so it shows as an ellipse: at a reach and an angle on it, from 0 to
 * half a turn on its near side, which shows lower.
 */
export function onRing(
  { middle, squash, tilt }: RingView,
  reach: number,
  angle: number,
): Point {
  const { x, y } = rotated(
    { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach * squash },
    tilt,
  );
  return { x: middle.x + x, y: middle.y + y };
}

/**
 * Returns a stretch of a band of a ring as a polygon, its outer edge and
 * then its inner edge back, between two reaches and two angles.
 */
export function bandOf(
  ring: RingView,
  [inner, outer]: readonly [number, number],
  [from, to]: readonly [number, number],
  steps: number,
): readonly Point[] {
  const angleAt = (i: number): number => lerp(from, to, i / steps);
  const edge = Array.from({ length: steps + 1 }, (_, i) => angleAt(i));
  return [
    ...edge.map((angle) => onRing(ring, outer, angle)),
    ...edge
      .slice()
      .reverse()
      .map((angle) => onRing(ring, inner, angle)),
  ];
}

/**
 * Returns a jagged line between two points, each corner straying across it
 * by up to a share of its length.
 */
export function forked(
  random: () => number,
  from: Point,
  to: Point,
  steps: number,
  sway: number,
): readonly Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const corners = Array.from({ length: steps - 1 }, (_, k): Point => {
    const off = between(random, -sway, sway);
    const share = (k + 1) / steps;
    return {
      x: from.x + dx * share - dy * off,
      y: from.y + dy * share + dx * off,
    };
  });
  return [from, ...corners, to];
}
