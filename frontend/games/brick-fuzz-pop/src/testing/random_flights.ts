// Seeded random flights, for the specs that hold fly() to what every flight
// keeps, the check that a flight's fuzzballs keep clear of the bricks they
// fly past, and the check that a flight dropped is the whole flight to the
// drop.

import { AIM_COUNT } from "@fz/brick-wall/rules/aims";
import { COLUMNS, RADIUS, SIDE_MARGIN } from "@fz/brick-wall/rules/field";
import { brickBox, columnOf, fieldRowOf } from "@fz/brick-wall/rules/grid";
import type { Box } from "@fz/core/sweep";
import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import { BRICK_KINDS, type BrickKinds } from "../rules/catalog/bricks";
import {
  type Flight,
  type FlightEvent,
  type Waypoint,
  positionAt,
} from "../rules/flight/events";
import type { FlightRules, FlightStart, Flown } from "../rules/flight/flight";
import type { TraitRules } from "../rules/flight/hooks";
import { shapeOf } from "../rules/grid";
import { RULES, flightRulesOf } from "../rules/round/round";
import {
  MOST_CHARGE,
  MOST_FRIENDS,
  TRIPLE_MATES,
  ZAP_DELAY,
} from "../rules/tuning";
import type { Wall } from "../rules/wall/wall";
import { randomField } from "./cast_reference";
import { eventsOf } from "./flights";
import { PRISM, STAND_INS, STAND_IN_RULES } from "./stand_ins";

/** Describes a flight drawn at random: how its fuzzballs leave, and the rules it is flown by. */
export interface RandomFlight {
  readonly start: FlightStart;
  readonly rules: FlightRules;
}

/**
 * The kinds random walls are drawn from, with the rules they are flown by:
 * the stand-ins' bumper and portal; the catalog's own, by the bricks' own
 * rules; and the stand-ins' prism.
 */
const KINDS: readonly (readonly [BrickKinds, TraitRules])[] = [
  [STAND_INS, STAND_IN_RULES],
  [BRICK_KINDS, TRAIT_RULES],
  [{ ...BRICK_KINDS, brick: PRISM }, STAND_IN_RULES],
];

/**
 * Returns a flight drawn from a source of numbers: a random field's wall,
 * its bricks of one to three hits and its portals twinned in pairs, from
 * the floor anywhere a fuzzball may wait, along any aim, with any charge,
 * a hot shot or a triple shot one time in seven each, and up to six
 * friends, flown by its kinds' rules.
 */
export function randomFlight(random: () => number): RandomFlight {
  const [kinds, traits] = KINDS[whole(random, 0, KINDS.length - 1)] ?? [
    BRICK_KINDS,
    TRAIT_RULES,
  ];
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
  return { start, rules: { ...flightRulesOf(RULES), kinds, traits } };
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
 * fuzzball's drop home, yawned or dropped, which passes through what lies
 * under it.
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
      (event) =>
        (event.kind === "yawn" || event.kind === "drop") && event.ball === ball,
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

/**
 * Returns where a flight dropped at a moment strays from the whole flight of
 * the same start, a sentence for each.
 *
 * Up to the moment, it is the whole flight, event for event. Then each
 * fuzzball in the air drops where it was then, and nothing follows but each
 * fuzzball's landing, straight down from its drop or as the whole flight
 * lands one already on its way home, the zaps the whole flight set off by
 * then, as it lands them, and what they break and free after the moment,
 * the zaps those breaks set off among it. It counts no more fuzzballs
 * capped than the whole flight, and its wall has lost the bricks its own
 * events break and no others, each keeping at least the hits the whole
 * flight leaves it, as a drop only takes away.
 */
export function dropProblemsOf(
  whole: Flown,
  dropped: Flown,
  at: number,
): string[] {
  const problems: string[] = [];
  const kept = whole.flight.events.filter((event) => event.at <= at);
  const { events } = dropped.flight;
  for (const [index, event] of kept.entries()) {
    if (JSON.stringify(events[index]) !== JSON.stringify(event)) {
      problems.push(
        `The whole flight's event ${index}, a ${event.kind} at ${event.at}, isn't the dropped flight's.`,
      );
    }
  }
  const pending = zapsSetOffBy(whole, at);
  const homing = homingAfter(kept);
  const drops = new Map<number, Waypoint>();
  // The moment each brick broken after the drop's moment sets off its zap.
  const setOff = new Map<number, number>();
  for (const [offset, event] of events.slice(kept.length).entries()) {
    const named = `The dropped flight's event ${kept.length + offset}, a ${event.kind} at ${event.at},`;
    switch (event.kind) {
      case "drop": {
        drops.set(event.ball, event);
        const track = whole.flight.tracks[event.ball];
        const was = track === undefined ? null : positionAt(track, at);
        if (
          event.at !== at ||
          was === null ||
          Math.abs(was.x - event.x) > NEAR ||
          Math.abs(was.y - event.y) > NEAR
        ) {
          problems.push(`${named} isn't where its fuzzball was at ${at}.`);
        }
        break;
      }
      case "land": {
        const drop = drops.get(event.ball);
        const down =
          drop !== undefined
            ? { at: drop.at + drop.y - RADIUS, x: drop.x }
            : homing.has(event.ball)
              ? eventsOf(whole, "land").find(({ ball }) => ball === event.ball)
              : undefined;
        if (
          down === undefined ||
          Math.abs(down.at - event.at) > NEAR ||
          Math.abs(down.x - event.x) > NEAR
        ) {
          problems.push(
            `${named} isn't where and when its fuzzball comes down.`,
          );
        }
        break;
      }
      case "zap": {
        const index = pending.findIndex(
          (zap) =>
            zap.at === event.at &&
            zap.cell === event.cell &&
            zap.pattern === event.pattern,
        );
        if (index >= 0) {
          pending.splice(index, 1);
        } else if (setOff.get(event.cell) !== event.at) {
          problems.push(
            `${named} is neither a zap the whole flight set off by ${at} nor one a brick broken after it set off.`,
          );
        }
        break;
      }
      case "break":
        if (event.by === "fuzzball" || event.at <= at) {
          problems.push(`${named} isn't a zap's or a blast's after ${at}.`);
        }
        setOff.set(event.cell, event.at + ZAP_DELAY);
        break;
      case "free":
        if (event.at <= at) {
          problems.push(`${named} isn't after ${at}.`);
        }
        break;
      default:
        problems.push(`${named} comes after the drop.`);
        break;
    }
  }
  for (const zap of pending) {
    problems.push(
      `The whole flight's zap from cell ${zap.cell} at ${zap.at}, set off by ${at}, isn't the dropped flight's.`,
    );
  }
  const inAir = inTheAir(kept);
  const dropping = [...drops.keys()];
  if (dropping.join() !== inAir.join()) {
    problems.push(
      `Fuzzballs [${dropping.join()}] drop, where [${inAir.join()}] were in the air at ${at}.`,
    );
  }
  if (dropped.flight.capped > whole.flight.capped) {
    problems.push(
      `It counts ${dropped.flight.capped} capped, more than the whole flight's ${whole.flight.capped}.`,
    );
  }
  return [...problems, ...droppedWallProblemsOf(whole, dropped)];
}

/** Returns a whole flight's zaps that land after a moment, set off by the bricks it breaks by then. */
function zapsSetOffBy(whole: Flown, at: number) {
  const broken = new Set(
    eventsOf(whole, "break")
      .filter((event) => event.at <= at)
      .map(({ cell }) => cell),
  );
  return eventsOf(whole, "zap").filter(
    (zap) => zap.at > at && broken.has(zap.cell),
  );
}

/**
 * Returns where a dropped flight's wall strays from its events and the whole
 * flight's wall: a brick kept that it breaks, lost that it doesn't, or the
 * wall never had, or with fewer hits than the whole flight leaves it.
 */
function droppedWallProblemsOf(whole: Flown, dropped: Flown): string[] {
  const problems: string[] = [];
  const brokenInWhole = new Set(
    eventsOf(whole, "break").map(({ cell }) => cell),
  );
  const brokenInDropped = new Set(
    eventsOf(dropped, "break").map(({ cell }) => cell),
  );
  for (const [cell, brick] of dropped.wall.bricks.entries()) {
    const wholeBrick = whole.wall.bricks[cell] ?? null;
    const broken = brokenInDropped.has(cell);
    const atStart = wholeBrick !== null || brokenInWhole.has(cell);
    if (brick === null) {
      if (atStart && !broken) {
        problems.push(
          `Cell ${cell} has lost a brick the dropped flight doesn't break.`,
        );
      }
    } else if (broken) {
      problems.push(`Cell ${cell} keeps a brick the dropped flight breaks.`);
    } else if (!atStart) {
      problems.push(`Cell ${cell} has a brick the wall never had.`);
    } else if (wholeBrick !== null && brick.hits < wholeBrick.hits) {
      problems.push(
        `Cell ${cell} keeps ${brick.hits} hits, fewer than the whole flight's ${wholeBrick.hits}.`,
      );
    }
  }
  return problems;
}

/** Returns the fuzzballs on their way home after a flight's events: those that yawned and haven't landed. */
function homingAfter(events: readonly FlightEvent[]): Set<number> {
  const homing = new Set<number>();
  for (const event of events) {
    if (event.kind === "yawn") {
      homing.add(event.ball);
    } else if (event.kind === "land") {
      homing.delete(event.ball);
    }
  }
  return homing;
}

/** Returns the fuzzballs in the air after a flight's events, by ball: those launched, and neither landed nor yawned. */
function inTheAir(events: readonly FlightEvent[]): number[] {
  const air = new Set<number>();
  for (const event of events) {
    if (event.kind === "launch") {
      air.add(event.ball);
    } else if (event.kind === "land" || event.kind === "yawn") {
      air.delete(event.ball);
    }
  }
  return [...air].sort((a, b) => a - b);
}
