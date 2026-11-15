// The cracks a rock shows for the hits it has taken and held: jagged lines
// in from its edge, one more a hit, the same ones every time for the same
// rock, as the art kit's `cracksOf()` draws them.

import { createRandom } from "@fz/core/random";
import type { Point } from "@fz/phaser/shapes";
import { TURN } from "../../../rules/angles";
import type { RockShape } from "./rock_shape";
import { around, between, jagged, polar, reachAt } from "./space";

/** How far each crack's angle turns from the last, in radians, near the golden angle, so none lies on another. */
const CRACK_TURN = 2.4;

/** How far in from its rim a crack keeps, as a share of the rim's reach. */
const CRACK_EDGE = 0.94;

/**
 * Returns the cracks a rock shows for the hits it has taken and held: for
 * each, a jagged line in from its rim toward its middle, and a branch off
 * that line's middle, each kept inside its rim. The cracks for fewer hits
 * are the first of those for more. Its seed is mixed by hand from the
 * rock's outline, as the kit mixes it, so the cracks are the kit's.
 */
export function cracksOf(
  rock: Pick<RockShape, "outline" | "rim">,
  hits: number,
): readonly (readonly Point[])[] {
  const random = createRandom(
    rock.outline.length * 977 + Math.round(around(rock.outline, 0).x * 1e4),
  );
  /** Returns a point at an angle, a share of the way out to the rim there. */
  const inside = (angle: number, share: number): Point =>
    polar(angle, share * reachAt(rock.rim, angle));
  /** Returns a line's points, each brought inside the edge if it strays past it. */
  const held = (line: readonly Point[]): readonly Point[] =>
    line.map(({ x, y }) => {
      const most = CRACK_EDGE * reachAt(rock.rim, Math.atan2(y, x));
      const far = Math.hypot(x, y);
      return far > most
        ? { x: (x * most) / far, y: (y * most) / far }
        : { x, y };
    });
  const cracks: (readonly Point[])[] = [];
  const first = between(random, 0, TURN);
  for (let i = 0; i < hits; i++) {
    const angle = first + i * CRACK_TURN + between(random, -0.3, 0.3);
    const from = inside(angle, CRACK_EDGE);
    const toward = angle + between(random, -0.5, 0.5);
    const to = polar(toward, between(random, 0.05, 0.3));
    const line = held(jagged(random, from, to, 5, 0.09));
    cracks.push(line);
    const side = random() < 0.5 ? -1 : 1;
    const branchAngle = angle + side * between(random, 0.5, 0.9);
    const branchEnd = inside(branchAngle, between(random, 0.5, 0.78));
    cracks.push(held(jagged(random, around(line, 2), branchEnd, 3, 0.1)));
  }
  return cracks;
}
