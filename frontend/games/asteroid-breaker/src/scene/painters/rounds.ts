import type { Point } from "@fz/phaser/shapes";
import type { GameObjects } from "phaser";
import { type RoundShape, ROUND_SAG, roundOf } from "../../view/art/breaks";

/** Returns the sides of a polygon of so many corners and a unit's radius, its first corner at the right, and how far inside its circle each falls. */
function sidesOf(count: number): Pick<RoundShape, "sides" | "sag"> {
  const corner = (index: number): Point => ({
    x: Math.cos((index / count) * 2 * Math.PI),
    y: Math.sin((index / count) * 2 * Math.PI),
  });
  return {
    sides: Array.from({ length: count }, (_, side) => [
      corner(side),
      corner(side + 1),
    ]),
    sag: 1 - Math.cos(Math.PI / count),
  };
}

/**
 * The polygons a ring too large for the dust's finest is drawn as, fewest
 * corners first: the wave's crosses the field, a couple of thousand pixels
 * out, where the dust's finest falls pixels inside its circle.
 */
const FINER_RINGS = [64, 96, 128, 192].map(sidesOf);
const FINEST_RING = sidesOf(256);

/**
 * Returns the polygon of fewest corners a ring of a radius, in device
 * pixels, is drawn as, its sides falling no further inside its circle than
 * a ring's may at a pixel ratio, or the finest there is.
 */
function ringOf(
  radius: number,
  pixelRatio: number,
): Pick<RoundShape, "sides" | "sag"> {
  const most = ROUND_SAG.ring * pixelRatio;
  const round = roundOf(radius, ROUND_SAG.ring, pixelRatio);
  if (radius * round.sag <= most) return round;
  for (const ring of FINER_RINGS) {
    if (radius * ring.sag <= most) return ring;
  }
  return FINEST_RING;
}

/**
 * Fills a disc about a place on the canvas, out to a radius in pixels, in
 * the fill style set, as a polygon of as few corners as its size spares at
 * a pixel ratio, fanned in triangles that meet without overlapping, so one
 * at part alpha blends once: `Graphics`' own circles take a hundred
 * corners, made anew each frame.
 */
export function fillRound(
  graphics: GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  pixelRatio: number,
): void {
  const { fan } = roundOf(radius, ROUND_SAG.puff, pixelRatio);
  for (const [a, b, c] of fan) {
    graphics.fillTriangle(
      x + a.x * radius,
      y + a.y * radius,
      x + b.x * radius,
      y + b.y * radius,
      x + c.x * radius,
      y + c.y * radius,
    );
  }
}

/**
 * Fills a ring about a place on the canvas, centred on a radius and as wide
 * as a line, both in pixels, in the fill style set, as a band of triangles
 * that meet without overlapping, as `fillRound()` fills a disc: a stroke's
 * joins overlap inside each bend, which a ring at part alpha shows as a
 * rim.
 */
export function strokeRound(
  graphics: GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  width: number,
  pixelRatio: number,
): void {
  const outer = radius + width / 2;
  const inner = Math.max(0, radius - width / 2);
  const { sides } = ringOf(outer, pixelRatio);
  for (const [from, to] of sides) {
    const innerFromX = x + from.x * inner;
    const innerFromY = y + from.y * inner;
    const outerToX = x + to.x * outer;
    const outerToY = y + to.y * outer;
    graphics.fillTriangle(
      x + from.x * outer,
      y + from.y * outer,
      outerToX,
      outerToY,
      innerFromX,
      innerFromY,
    );
    graphics.fillTriangle(
      innerFromX,
      innerFromY,
      outerToX,
      outerToY,
      x + to.x * inner,
      y + to.y * inner,
    );
  }
}
