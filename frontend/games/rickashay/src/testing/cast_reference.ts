// cast() done the plain way, for a spec to hold it to: every face of a
// field tried, its bounds' and each brick's as facesOf() builds them afresh
// from what stands in its cells, and those met within AT_ONCE of the
// soonest kept, each once, as faceOrder() lists them. It holds the cells
// cast() walks and the faces castField(), clearBrick() and openHatches()
// keep for each cell, not the faces' geometry, which faces.spec.ts holds.
// With it, the seeded random fields and shots the property specs cast, and
// the rounds' starts they play from: drawn, every level's openings, and a
// copy of one whose wall fly() has never flown at.

import { AIMS } from "@fz/brick-wall/rules/aims";
import {
  AT_ONCE,
  COLUMNS,
  DEPTHS,
  LEAST_DEPTH,
  MOST_DEPTH,
  RADIUS,
  SIDE_MARGIN,
} from "@fz/brick-wall/rules/field";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import type { Wall } from "../rules/catalog/kinds";
import type { Contacts } from "../rules/flight/cast";
import type { RoundStart } from "../rules/flight/events";
import { type Face, MISSED, meetsAt } from "../rules/flight/faces";
import {
  type LegendCharacter,
  NO_BRICK,
  PORTAL_MARKS,
  WALL_LEGEND,
} from "../rules/levels/legend";
import { LEVELS, parseLevel } from "../rules/levels/levels";
import { levelStart } from "../rules/run/run";

/** Describes a face a cast met, and how far it flew to meet it, as plain values a spec compares. */
export interface Met {
  readonly face: Face;
  readonly distance: number;
}

/** Describes what a cast met, as plain values a spec compares. */
export interface Cast {
  /** How far it flew to meet the soonest. */
  readonly distance: number;
  /** Where its middle was then, across. */
  readonly x: number;
  /** Where its middle was then, up. */
  readonly y: number;
  /** Each face met within `AT_ONCE` of the soonest, as `faceOrder()` lists them. */
  readonly met: readonly Met[];
}

/** Returns what `cast()` wrote into a record, as plain values. */
export function castOf(contacts: Readonly<Contacts>): Cast {
  return {
    distance: contacts.distance,
    x: contacts.x,
    y: contacts.y,
    met: contacts.met
      .slice(0, contacts.count)
      .map(({ face, distance }) => ({ face, distance })),
  };
}

/**
 * Returns what a fuzzball's middle meets first, flying from a place along
 * a heading a unit long, trying every one of a field's faces, as listed by
 * `facesOf()`, and the portals' eyes among them only where `eyes` is true.
 */
export function castByScan(
  faces: readonly Face[],
  x: number,
  y: number,
  dx: number,
  dy: number,
  eyes: boolean,
): Cast {
  const tried = faces
    .filter((face) => eyes || face.kind !== "eye")
    .map((face) => ({ face, distance: meetsAt(face, x, y, dx, dy) }));
  const distance = Math.min(...tried.map((met) => met.distance));
  return {
    distance,
    x: x + dx * distance,
    y: y + dy * distance,
    met: tried.filter(
      (met) => met.distance !== MISSED && met.distance <= distance + AT_ONCE,
    ),
  };
}

/** Describes a field drawn for a spec: a wall and the field's depth. */
export interface RandomField {
  readonly wall: Wall;
  readonly depth: number;
}

/** The characters a random wall's cells are filled with, but the portals': a brick of every other kind. */
const FILLINGS = [
  "o",
  "2",
  "4",
  "#",
  "L",
  "J",
  "F",
  "7",
  "=",
  "S",
  "G",
  "v",
  "U",
  "M",
  "x",
] as const satisfies readonly LegendCharacter[];

/**
 * Returns a field drawn from a source of numbers: 11 to 22 deep, holding a
 * wall of up to 8 rows, some waiting over the ceiling, filled to a share
 * drawn too with bricks of every kind; a row of hatches one time in four,
 * and each pair of portals half the time, its twins in two cells drawn
 * from those no other portal holds.
 */
export function randomField(random: () => number): RandomField {
  const depth = whole(random, LEAST_DEPTH, MOST_DEPTH);
  const rows = whole(random, 1, 8);
  const fill = random();
  const cells = Array.from({ length: rows * COLUMNS }, (): string =>
    random() < fill
      ? FILLINGS[whole(random, 0, FILLINGS.length - 1)]!
      : NO_BRICK,
  );
  if (random() < 0.25) {
    const row = whole(random, 0, rows - 1);
    cells.fill("=", row * COLUMNS, (row + 1) * COLUMNS);
  }
  const free = cells.map((_, cell) => cell);
  for (const mark of PORTAL_MARKS) {
    if (random() < 0.5) {
      for (let twins = 0; twins < 2; twins++) {
        const [cell] = free.splice(whole(random, 0, free.length - 1), 1);
        cells[cell!] = mark;
      }
    }
  }
  const picture = Array.from({ length: rows }, (_, row) =>
    cells.slice((rows - 1 - row) * COLUMNS, (rows - row) * COLUMNS).join(""),
  );
  const lowestRow = whole(random, 1, depth);
  return { wall: wallFrom(picture, WALL_LEGEND, { lowestRow }), depth };
}

/** Describes a shot to cast, drawn for a spec: a fuzzball's place and heading, and whether it meets the portals' eyes. */
export interface RandomShot {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly eyes: boolean;
}

/** The headings along the field's axes: up, down, right and left. */
const AXES = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

/**
 * Returns a shot drawn from a source of numbers: a fuzzball anywhere its
 * middle may be in a field, on a quarter of a unit one time in three, so
 * it often starts on a face, a seam or a corner; heading along an axis one
 * time in four, else along an aim, turned down, back or across its 45° half
 * the time each; and meeting the portals' eyes three times in four.
 */
export function randomShot(
  { depth }: RandomField,
  random: () => number,
): RandomShot {
  const onQuarters = random() < 1 / 3;
  const x = onQuarters
    ? whole(random, 1, 4 * COLUMNS - 1) / 4
    : RADIUS + random() * (COLUMNS - 2 * RADIUS);
  const y = onQuarters
    ? whole(random, 1, 4 * depth - 1) / 4
    : RADIUS + random() * (depth - 2 * RADIUS);
  const [dx, dy] =
    random() < 0.25
      ? AXES[whole(random, 0, AXES.length - 1)]!
      : headingOf(whole(random, 0, AIMS.length - 1), random);
  return { x, y, dx, dy, eyes: random() < 0.75 };
}

/**
 * Returns where a round starts in a field drawn for a spec, from a source
 * of numbers: the fuzzball waiting anywhere on the floor no nearer a side
 * wall than `SIDE_MARGIN`, and the shot hot half the time.
 */
export function randomStart(
  { wall, depth }: RandomField,
  random: () => number,
): RoundStart {
  const x = SIDE_MARGIN + random() * (COLUMNS - 2 * SIDE_MARGIN);
  return { wall, depth, x, hot: random() < 0.5 };
}

/** Returns where every level's first round starts, at every depth, the levels' order first and then the depths'. */
export function levelOpenings(): RoundStart[] {
  return LEVELS.flatMap(({ data }) => {
    const level = parseLevel(data);
    return DEPTHS.map((depth) => levelStart(level, depth));
  });
}

/** Returns a copy of a round's start, whole, so its wall is one fly() has never flown at. */
export function unflown(start: RoundStart): RoundStart {
  return structuredClone(start);
}

/** Returns one of an aim's eight headings, drawn from a source of numbers: its own, or turned down, back or across its 45° half the time each. */
export function headingOf(
  aim: number,
  random: () => number,
): readonly [number, number] {
  const [aimX, aimY] = AIMS[aim]!;
  const [x, y] = random() < 0.5 ? [aimX, aimY] : [aimY, aimX];
  return [random() < 0.5 ? x : -x, random() < 0.5 ? y : -y];
}

/** Returns a whole number from `least` to `most`, drawn from a source. */
function whole(random: () => number, least: number, most: number): number {
  return least + Math.floor(random() * (most - least + 1));
}
