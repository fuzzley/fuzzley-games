// Seeded random flights, for the specs that hold fly() to what every flight
// keeps, and the check that a flight's fuzzballs keep clear of the bricks
// they fly past.

import type { Box } from "@fz/core/sweep";
import { BRICK_KINDS, type BrickKinds } from "../rules/catalog/bricks";
import type { Flight } from "../rules/flight/events";
import type { FlightRules, FlightStart } from "../rules/flight/flight";
import { brickBox, columnOf, fieldRowOf, shapeOf } from "../rules/grid";
import {
  AIM_COUNT,
  BORED,
  COLUMNS,
  MOST_CHARGE,
  MOST_FRIENDS,
  RADIUS,
  SIDE_MARGIN,
  TRIPLE_MATES,
} from "../rules/tuning";
import type { Wall } from "../rules/wall/wall";
import { randomField } from "./cast_reference";
import { CAGE, PRISM, STAND_INS, STAND_IN_RULES, WOOL } from "./stand_ins";

/** Describes a flight drawn at random: how its fuzzballs leave, and the rules it is flown by. */
export interface RandomFlight {
  readonly start: FlightStart;
  readonly rules: FlightRules;
}

/**
 * The kinds random walls are drawn from: the stand-ins' bumper and portal,
 * the catalog's zappers, and the stand-ins' prism, wool and cage.
 */
const KINDS: readonly BrickKinds[] = [
  STAND_INS,
  BRICK_KINDS,
  { ...BRICK_KINDS, brick: PRISM, rowZapper: WOOL, columnZapper: CAGE },
];

/**
 * Returns a flight drawn from a source of numbers: a random field's wall,
 * its bricks of one to three hits and its portals twinned in pairs, from
 * the floor anywhere a fuzzball may wait, along any aim, with any charge,
 * a hot shot or a triple shot one time in seven each, and up to six
 * friends, flown by the stand-ins' rules.
 */
export function randomFlight(random: () => number): RandomFlight {
  const kinds = KINDS[whole(random, 0, KINDS.length - 1)] ?? BRICK_KINDS;
  const { wall, depth } = randomField(random, kinds);
  const boon = random() * 7;
  const start: FlightStart = {
    wall: twinned(withHits(wall, random), kinds),
    depth,
    x: SIDE_MARGIN + random() * (COLUMNS - 2 * SIDE_MARGIN),
    aim: whole(random, 0, AIM_COUNT - 1),
    charge: whole(random, 0, MOST_CHARGE),
    hot: boon < 1,
    mates: boon >= 1 && boon < 2 ? TRIPLE_MATES : 0,
    friends: whole(random, 0, MOST_FRIENDS),
  };
  return { start, rules: { bored: BORED, kinds, traits: STAND_IN_RULES } };
}

/** Returns a wall whose bricks each have one to three hits, drawn from a source. */
function withHits(wall: Wall, random: () => number): Wall {
  return {
    ...wall,
    bricks: wall.bricks.map((brick) => {
      const hits = whole(random, 1, 3);
      return brick === null ? null : { ...brick, hits, full: hits };
    }),
  };
}

/** Returns a wall whose portals are twinned in pairs, in the order of their cells, an odd one out with no twin. */
function twinned(wall: Wall, kinds: BrickKinds): Wall {
  const portals = wall.bricks.flatMap((brick, cell) =>
    brick !== null && shapeOf(kinds[brick.kind]) === "open" ? [cell] : [],
  );
  return {
    ...wall,
    bricks: wall.bricks.map((brick, cell) => {
      const index = portals.indexOf(cell);
      const twin = portals[index % 2 === 0 ? index + 1 : index - 1];
      return brick === null || index < 0
        ? brick
        : { ...brick, twin: twin ?? null };
    }),
  };
}

/** Returns a whole number from `least` to `most`, drawn from a source. */
function whole(random: () => number, least: number, most: number): number {
  return least + Math.floor(random() * (most - least + 1));
}

/** How much nearer than its radius a fuzzball may seem to come, for rounding. */
const NEAR = 1e-9;

/**
 * Returns where a flight's fuzzballs come nearer a brick than they may, a
 * sentence for each: none for a flight that keeps clear.
 *
 * It checks each leg of each track against the bricks in play the flight
 * left standing, which stood all through it: no nearer a box than a
 * fuzzball's radius, nor a disc's middle than its reach. It leaves out a
 * fuzzball's drop home, which passes through what lies under it.
 */
export function clearanceProblemsOf(
  flight: Flight,
  wall: Wall,
  depth: number,
  kinds: BrickKinds,
): string[] {
  const boxes: Box[] = [];
  const discs: [number, number, number][] = [];
  wall.bricks.forEach((brick, cell) => {
    const column = columnOf(cell);
    const row = fieldRowOf(wall, cell);
    if (brick === null || row < 0 || row >= depth) {
      return;
    }
    const kind = kinds[brick.kind];
    const shape = shapeOf(kind);
    if (shape === "box") {
      boxes.push(
        brickBox(column, row, { left: 0, top: 0, right: 0, bottom: 0 }),
      );
    } else if (shape === "round") {
      const kick = kind.traits.find((trait) => trait.kind === "kicks");
      const radius = kick?.kind === "kicks" ? kick.radius : 0;
      discs.push([column + 0.5, row + 0.5, RADIUS + radius]);
    }
  });
  const problems: string[] = [];
  for (const { ball, waypoints } of flight.tracks) {
    const yawned = flight.events.find(
      (event) => event.kind === "yawn" && event.ball === ball,
    )?.at;
    for (const [index, to] of waypoints.entries()) {
      const from = waypoints[index - 1];
      if (from === undefined || from.at === to.at || from.at === yawned) {
        continue;
      }
      const clearance = Math.min(
        ...boxes
          .filter((box) => isNear(from, to, box))
          .map((box) => boxDistance(from, to, box) - RADIUS),
        ...discs
          .filter(([x, y]) =>
            isNear(from, to, { left: x, top: y, right: x, bottom: y }),
          )
          .map(([x, y, reach]) => pointDistance(x, y, from, to) - reach),
      );
      if (clearance < -NEAR) {
        problems.push(
          `Fuzzball ${ball}'s leg to ${to.at} comes ${-clearance} too near a brick.`,
        );
      }
    }
  }
  return problems;
}

/** A place: x across, y up. */
interface Place {
  readonly x: number;
  readonly y: number;
}

/** Returns whether a box lies within a unit of the square around a segment, as any a fuzzball may come too near does. */
function isNear(a: Place, b: Place, box: Box): boolean {
  return (
    box.left <= Math.max(a.x, b.x) + 1 &&
    box.right >= Math.min(a.x, b.x) - 1 &&
    box.top <= Math.max(a.y, b.y) + 1 &&
    box.bottom >= Math.min(a.y, b.y) - 1
  );
}

/** Returns how far a segment comes from a box: 0 where it touches or crosses it. */
function boxDistance(a: Place, b: Place, box: Box): number {
  if (crosses(a, b, box)) {
    return 0;
  }
  return Math.min(
    pointToBox(a, box),
    pointToBox(b, box),
    pointDistance(box.left, box.top, a, b),
    pointDistance(box.right, box.top, a, b),
    pointDistance(box.left, box.bottom, a, b),
    pointDistance(box.right, box.bottom, a, b),
  );
}

/** Returns whether a segment touches or crosses a box, clipping it to the box's sides. */
function crosses(a: Place, b: Place, box: Box): boolean {
  let enter = 0;
  let leave = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const sides: [number, number][] = [
    [-dx, a.x - box.left],
    [dx, box.right - a.x],
    [-dy, a.y - box.top],
    [dy, box.bottom - a.y],
  ];
  for (const [toward, room] of sides) {
    if (toward === 0) {
      if (room < 0) {
        return false;
      }
    } else {
      const t = room / toward;
      if (toward < 0) {
        enter = Math.max(enter, t);
      } else {
        leave = Math.min(leave, t);
      }
    }
  }
  return enter <= leave;
}

/** Returns how far a place lies from a box: 0 inside it. */
function pointToBox(p: Place, box: Box): number {
  const across = Math.max(box.left - p.x, 0, p.x - box.right);
  const up = Math.max(box.top - p.y, 0, p.y - box.bottom);
  return Math.hypot(across, up);
}

/** Returns how far a point lies from a segment. */
function pointDistance(x: number, y: number, a: Place, b: Place): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t =
    length === 0
      ? 0
      : Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / length));
  return Math.hypot(a.x + dx * t - x, a.y + dy * t - y);
}
