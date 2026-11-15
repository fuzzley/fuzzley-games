import type { GameObjects } from "phaser";
import { ROUND_SAG, roundOf } from "../../view/art/breaks";

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
  const { sides } = roundOf(outer, ROUND_SAG.ring, pixelRatio);
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
