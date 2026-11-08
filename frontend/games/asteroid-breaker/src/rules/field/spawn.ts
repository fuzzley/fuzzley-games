// A wave's rocks are laid out fairly, in its formation: each starts far
// enough from the waiting ship, across the wrap, on a course, as play
// flies it, that keeps clear of it for a while. A new ship waits where it
// is safest.

import { TURN } from "../angles";
import type { RockKindId, RockSize } from "../catalog/rocks";
import { drawIn, nextDraw } from "../draws";
import {
  type CourseField,
  type Rock,
  type RockField,
  addRock,
  flyRock,
} from "../rocks/rocks";
import { stepsIn } from "../stepper";
import { type Place, across, distanceSquared, middleOf, wrap } from "../torus";
import {
  FAIR_COURSE,
  FAIR_COURSE_MS,
  FAIR_DISTANCE,
  ROCK_RADIUS,
  SAFE_AHEAD_MS,
  SAFE_GRID,
  SAFE_MIDDLE,
} from "../tuning";
import type { Formation, WaveRocks } from "../waves/waves";

/** The golden angle, which spreads a cluster's rocks evenly about its middle. */
const GOLDEN_ANGLE = (TURN / 2) * (3 - Math.sqrt(5));

/** How many steps round an ellipse its length is measured in, to space places evenly along it. */
const ELLIPSE_STEPS = 720;

/**
 * How many times a rock's speed is halved at most to keep it clear, which
 * leaves it all but still.
 */
const HALVINGS = 20;

/**
 * How far inside a bound a course aimed at it is kept, in units, so its steps'
 * rounding can't cross it.
 */
const HAIR = 1e-6;

/** How far inside the field's edges a ring keeps the outline of a large rock on it, in units. */
const RING_GAP = 1;

/**
 * Lays a wave's rocks out on the field in a formation, fairly, as the ship
 * waits at a place, by the field's draws.
 */
export function layOut(
  field: RockField,
  rocks: readonly WaveRocks[],
  formation: Formation,
  ship: Place,
): void {
  const each = rocks.flatMap(({ kind, size, count }) =>
    Array.from({ length: count }, () => ({ kind, size })),
  );
  LAYOUTS[formation](field, each, ship);
}

/**
 * Returns whether a rock lies fairly by a place: {@link FAIR_DISTANCE} off
 * it at least, across the wrap, on a course that comes no nearer than
 * {@link FAIR_COURSE} in its first {@link FAIR_COURSE_MS}, flown as play
 * flies it with the ship waiting there, a drawn rock's pull among it.
 */
export function liesFairly(
  field: Omit<CourseField, "ship">,
  rock: Readonly<Rock>,
  ship: Place,
): boolean {
  const { torus, pace, rockSpeed } = field;
  if (
    distanceSquared(torus, ship.x, ship.y, rock.x, rock.y) <
    FAIR_DISTANCE ** 2
  ) {
    return false;
  }
  // Step by step, as a course so long may cross the wrap.
  const ahead: CourseField = { ship, torus, pace, rockSpeed };
  const course = { ...rock };
  for (let step = 0; step < stepsIn(FAIR_COURSE_MS); step++) {
    flyRock(ahead, course);
    if (
      distanceSquared(torus, ship.x, ship.y, course.x, course.y) <
      FAIR_COURSE ** 2
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Returns where a new ship is safest: the field's middle, if no whole rock
 * is within {@link SAFE_MIDDLE} of it, else the place of a grid
 * {@link SAFE_GRID} across and down whose nearest rock will be farthest
 * {@link SAFE_AHEAD_MS} ahead.
 */
export function safestPlace(field: RockField): Place {
  const { width, height } = field.torus;
  const middle = middleOf(field.torus);
  if (nearestRock(field, middle, 0) >= SAFE_MIDDLE) return middle;
  let safest = middle;
  let room = -1;
  for (let row = 0; row < SAFE_GRID; row++) {
    for (let column = 0; column < SAFE_GRID; column++) {
      const place = {
        x: ((column + 0.5) * width) / SAFE_GRID,
        y: ((row + 0.5) * height) / SAFE_GRID,
      };
      const placeRoom = nearestRock(field, place, SAFE_AHEAD_MS);
      if (placeRoom > room) {
        safest = place;
        room = placeRoom;
      }
    }
  }
  return safest;
}

/** Describes a rock a formation lays. */
interface ToLay {
  readonly kind: RockKindId;
  readonly size: RockSize;
}

/** Lays rocks out in a formation about the ship's place. */
type Layout = (field: RockField, rocks: readonly ToLay[], ship: Place) => void;

/** How each formation lays its rocks out. */
const LAYOUTS: Readonly<Record<Formation, Layout>> = {
  // Each where it is drawn, flying the way it is drawn.
  scatter: (field, rocks, ship) => {
    for (const { kind, size } of rocks) {
      const { x, y } = placeOff(field, ship);
      const rock = addRock(field, kind, size, x, y, nextDraw(field) * TURN);
      if (rock) keepClear(field, rock, ship);
    }
  },
  // Evenly along an ellipse round the ship, as long and as wide as the
  // field leaves a large rock inside it, so a larger field's ring, of more
  // rocks, spreads round it; all flying along it one way.
  ring: (field, rocks, ship) => {
    const { width, height } = field.torus;
    const halfAcross = width / 2 - ROCK_RADIUS.large - RING_GAP;
    const halfDown = height / 2 - ROCK_RADIUS.large - RING_GAP;
    const from = nextDraw(field);
    const way = nextDraw(field) < 0.5 ? -1 : 1;
    const angles = evenlyAlong(halfAcross, halfDown, rocks.length, from);
    rocks.forEach(({ kind, size }, i) => {
      const angle = angles[i] ?? 0;
      const x = wrap(ship.x + Math.cos(angle) * halfAcross, width);
      const y = wrap(ship.y + Math.sin(angle) * halfDown, height);
      const along = Math.atan2(
        way * halfDown * Math.cos(angle),
        -way * halfAcross * Math.sin(angle),
      );
      const rock = addRock(field, kind, size, x, y, along);
      if (rock) keepClear(field, rock, ship);
    });
  },
  // Evenly across the short side, half the long side from the ship, all
  // flying along the long side one way at one speed: the slowest drawn,
  // and no faster than keeps the rock in line with the ship clear of it,
  // which keeps every rock of it clear but those drawn to the ship, which
  // are slowed further.
  wall: (field, rocks, ship) => {
    const { width, height } = field.torus;
    const wide = width >= height;
    const long = wide ? width : height;
    const short = wide ? height : width;
    const heading =
      (wide ? 0 : TURN / 4) + (nextDraw(field) < 0.5 ? TURN / 2 : 0);
    const laid: Rock[] = [];
    rocks.forEach(({ kind, size }, i) => {
      const offset = ((i + 0.5) * short) / rocks.length - short / 2;
      const x = wrap(ship.x + (wide ? long / 2 : offset), width);
      const y = wrap(ship.y + (wide ? offset : long / 2), height);
      const rock = addRock(field, kind, size, x, y, heading);
      if (rock) laid.push(rock);
    });
    const fairest =
      (long / 2 - FAIR_COURSE - HAIR) / ((FAIR_COURSE_MS / 1000) * field.pace);
    const speed = Math.min(fairest, ...laid.map(speedOf));
    flyFairly(field, laid, ship, Math.cos(heading), Math.sin(heading), speed);
  },
  // Spread about a middle half the long side from the ship, all flying one
  // way, along the short side if the way drawn isn't fair, which keeps them
  // all clear: no rock is spread nearer the ship along the long side than
  // fair.
  cluster: (field, rocks, ship) => {
    const { width, height } = field.torus;
    const wide = width >= height;
    const long = wide ? width : height;
    const middleX = ship.x + (wide ? long / 2 : 0);
    const middleY = ship.y + (wide ? 0 : long / 2);
    const spread = Math.min(
      ROCK_RADIUS.large,
      (long / 2 - FAIR_DISTANCE) / Math.sqrt(Math.max(1, rocks.length - 1)),
    );
    const heading = nextDraw(field) * TURN;
    const laid: Rock[] = [];
    rocks.forEach(({ kind, size }, i) => {
      const reach = spread * Math.sqrt(i);
      const x = wrap(middleX + Math.cos(i * GOLDEN_ANGLE) * reach, width);
      const y = wrap(middleY + Math.sin(i * GOLDEN_ANGLE) * reach, height);
      const rock = addRock(field, kind, size, x, y, heading);
      if (rock) laid.push(rock);
    });
    if (!laid.every((rock) => liesFairly(field, rock, ship))) {
      const aside = wide ? TURN / 4 : 0;
      for (const rock of laid) {
        const speed = speedOf(rock);
        rock.vx = Math.cos(aside) * speed;
        rock.vy = Math.sin(aside) * speed;
      }
    }
  },
};

/**
 * Returns places evenly spaced along an ellipse of two half-axes, as many as
 * asked, the first a share of the way round it: each as the angle `t` the
 * ellipse is drawn by, at (`halfAcross · cos t`, `halfDown · sin t`) from
 * its middle, which is the angle seen from the middle only on a circle.
 */
function evenlyAlong(
  halfAcross: number,
  halfDown: number,
  count: number,
  from: number,
): number[] {
  const lengths = [0];
  let whole = 0;
  for (let step = 1; step <= ELLIPSE_STEPS; step++) {
    const before = ((step - 1) * TURN) / ELLIPSE_STEPS;
    const after = (step * TURN) / ELLIPSE_STEPS;
    whole += Math.hypot(
      halfAcross * (Math.cos(after) - Math.cos(before)),
      halfDown * (Math.sin(after) - Math.sin(before)),
    );
    lengths.push(whole);
  }
  return Array.from({ length: count }, (_, i) => {
    const goal = ((from + i / count) % 1) * whole;
    const step = lengths.findIndex((length, at) => at > 0 && length >= goal);
    const start = lengths[step - 1] ?? 0;
    const span = (lengths[step] ?? start) - start;
    const share = span > 0 ? (goal - start) / span : 0;
    return ((step - 1 + share) * TURN) / ELLIPSE_STEPS;
  });
}

/**
 * Returns a place drawn on the field far enough from the ship. A field is
 * never smaller than 40 by 40, more than two thirds of which is far enough,
 * so a few draws find one.
 */
function placeOff(field: RockField, ship: Place): Place {
  const { torus } = field;
  for (;;) {
    const x = drawIn(field, { least: 0, most: torus.width });
    const y = drawIn(field, { least: 0, most: torus.height });
    if (distanceSquared(torus, ship.x, ship.y, x, y) >= FAIR_DISTANCE ** 2) {
      return { x, y };
    }
  }
}

/**
 * Turns a rock that doesn't lie fairly at right angles to the way from the
 * ship, the side its course leans to, where it comes no nearer the ship
 * than it starts, and slows it until it lies fairly, as a course long
 * enough to come round the wrap can still near it.
 */
function keepClear(field: RockField, rock: Rock, ship: Place): void {
  if (liesFairly(field, rock, ship)) return;
  const awayX = across(ship.x, rock.x, field.torus.width);
  const awayY = across(ship.y, rock.y, field.torus.height);
  const side = awayX * rock.vy - awayY * rock.vx >= 0 ? 1 : -1;
  const aside = side / Math.hypot(awayX, awayY);
  flyFairly(field, [rock], ship, -awayY * aside, awayX * aside, speedOf(rock));
}

/**
 * Flies rocks one way at a speed, halved until every one lies fairly by
 * the ship, or, halved {@link HALVINGS} times, all but still.
 *
 * A rock laid far enough off lies fairly all but still, unless the ship
 * draws it, so the halving ends for any other.
 */
function flyFairly(
  field: RockField,
  rocks: readonly Rock[],
  ship: Place,
  wayX: number,
  wayY: number,
  speed: number,
): void {
  let tried = speed;
  for (let halving = 0; halving <= HALVINGS; halving++) {
    for (const rock of rocks) {
      rock.vx = wayX * tried;
      rock.vy = wayY * tried;
    }
    if (rocks.every((rock) => liesFairly(field, rock, ship))) return;
    tried /= 2;
  }
}

/** Returns how fast a rock flies at a pace of 1. */
function speedOf(rock: Readonly<Rock>): number {
  return Math.hypot(rock.vx, rock.vy);
}

/**
 * Returns how far the nearest whole rock's middle will be from a place a time
 * ahead, or Infinity with none.
 */
function nearestRock(field: RockField, place: Place, ms: number): number {
  const time = (ms / 1000) * field.pace;
  let nearest = Infinity;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const x = rock.x + rock.vx * time;
    const y = rock.y + rock.vy * time;
    nearest = Math.min(
      nearest,
      distanceSquared(field.torus, place.x, place.y, x, y),
    );
  }
  return Math.sqrt(nearest);
}
