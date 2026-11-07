import type { PickupId } from "../rules/catalog/pickups";
import type { RockKindId, RockSize } from "../rules/catalog/rocks";
import type { Floating } from "../rules/rocks/drops";
import type { FieldEvent, FieldEventKind } from "../rules/field/events";
import { type Field, createField, stepField } from "../rules/field/field";
import type { Comet, Stray } from "../rules/hazards/hazards";
import { type Crew, type Pilot, createCrew } from "../rules/ship/pilots";
import { type Rock, addRock } from "../rules/rocks/rocks";
import { STILL, type Ship, createShip } from "../rules/ship/ship";
import { stepsIn } from "../rules/stepper";
import type { Torus } from "../rules/torus";
import {
  FIRST_SHIP_POINTS,
  PICKUP_LIFE_MS,
  STRAY_FIRST_MS,
  type Span,
} from "../rules/tuning";

/** How many units across each of a picture's characters stands for. */
export const CELL = 4;

/** The field a picture lays out unless it says otherwise, a desktop's. */
export const PICTURE_TORUS: Torus = { width: 72, height: 40 };

/** Says how a pictured field is played, where a spec cares. */
export interface PictureOptions {
  /** Its size, {@link PICTURE_TORUS} by default. */
  readonly torus?: Torus;
  readonly seed?: number;
  readonly pace?: number;
  /** The most rocks it holds at once, 48 by default. */
  readonly cap?: number;
  /** The kind every pictured rock is, stone by default. */
  readonly kind?: RockKindId;
  /** The kind of rock its wave names, stone by default. */
  readonly waveKind?: RockKindId;
  /** The chance a broken rock lets a pickup go, 0 by default. */
  readonly drops?: number;
  /** The pickups its rocks may let go, none by default, so none ever do. */
  readonly pool?: readonly PickupId[];
  /** How many pickups may float before chance lets no more go, 2 by default. */
  readonly pickupsAtOnce?: number;
  /** How many strays it sends, none by default. */
  readonly strays?: number;
  /** How far into the wave its first stray comes, {@link STRAY_FIRST_MS} by default, as on a field of 40 by 40. */
  readonly strayFirstMs?: number;
  /** The time between its comets, none by default. */
  readonly cometEvery?: Span | null;
  /** The crew it starts with, a run's first by default. */
  readonly crew?: Crew;
  /** The run's points as it starts, none by default. */
  readonly banked?: number;
  /** The score the run's next ship comes at, its first's by default. */
  readonly nextShipAt?: number;
}

/** The sizes a picture's letters stand for. */
const SIZES: Readonly<Record<string, RockSize>> = {
  B: "boulder",
  L: "large",
  M: "medium",
  S: "small",
};

/** The character a picture marks the ship with. */
const SHIP = "^";

/** The characters a picture leaves empty. */
const EMPTY = new Set([".", " "]);

/** A picture of one large rock in the field's corner, which keeps a wave from clearing. */
export const KEEPER: readonly string[] = ["L"];

/**
 * Returns a field from a picture of its rocks and ship, a row of characters
 * for each {@link CELL} units down, each character a cell that many units
 * across: B for a boulder, and L, M and S for a large, a medium and a small
 * rock of the options' kind, each standing still in its cell's middle;
 * ^ for the ship there, flying, its nose up; and . or a space for nothing.
 * With no ^, the field has no ship.
 *
 * @throws {Error} For a row too long, too many rows, more than one ship,
 *   more rocks than the cap or a character it doesn't know, so a spec plays
 *   the field it draws.
 * @throws {RangeError} For a rock of a kind that doesn't come in its size.
 */
export function fieldFrom(
  rows: readonly string[],
  options: PictureOptions = {},
): Field {
  const torus = options.torus ?? PICTURE_TORUS;
  if (rows.length * CELL > torus.height) {
    throw new Error(`Too many rows: ${String(rows.length)}.`);
  }
  const field = createField({
    torus,
    cap: options.cap ?? 48,
    seed: options.seed ?? 1,
    pace: options.pace ?? 1,
    waveKind: options.waveKind ?? "stone",
    drops: options.drops ?? 0,
    pool: options.pool ?? [],
    pickupsAtOnce: options.pickupsAtOnce ?? 2,
    strays: options.strays ?? 0,
    strayFirstMs: options.strayFirstMs ?? STRAY_FIRST_MS,
    cometEvery: options.cometEvery ?? null,
    crew: options.crew ?? createCrew(),
    banked: options.banked ?? 0,
    nextShipAt: options.nextShipAt ?? FIRST_SHIP_POINTS,
  });
  field.ship = null;
  rows.forEach((row, down) => {
    if (row.length * CELL > torus.width) {
      throw new Error(`A row too long: "${row}".`);
    }
    for (let across = 0; across < row.length; across++) {
      const character = row.charAt(across);
      const x = (across + 0.5) * CELL;
      const y = (down + 0.5) * CELL;
      if (character === SHIP) placeShip(field, x, y);
      else if (!EMPTY.has(character)) {
        const size = sizeOf(character);
        const kind = size === "boulder" ? "boulder" : (options.kind ?? "stone");
        placeRock(field, size, x, y, kind);
      }
    }
  });
  return field;
}

/**
 * Lays a rock on a field standing still at a place, a stone unless it says,
 * and returns it.
 *
 * @throws {Error} If no slot is free, so a spec plays the field it lays.
 */
export function placeRock(
  field: Field,
  size: RockSize,
  x: number,
  y: number,
  kind: RockKindId = "stone",
): Rock {
  const rock = addRock(field, kind, size, x, y, 0);
  if (!rock) throw new Error("No slot was free for the rock.");
  rock.vx = 0;
  rock.vy = 0;
  return rock;
}

/** Returns the field's ship, failing the spec if it has none. */
export function shipOf(field: Field): Ship {
  if (!field.ship) throw new Error("The field has no ship.");
  return field.ship;
}

/** Returns the field's whole rocks, in their slots' order. */
export function wholeRocks(field: Field): Rock[] {
  return field.rocks.filter((rock) => rock.live);
}

/**
 * Floats a pickup on a field at a place, standing still and new, and
 * returns it, failing the spec if no record is free.
 */
export function placePickup(
  field: Field,
  id: PickupId,
  x: number,
  y: number,
): Floating {
  const floating = field.pickups.find((each) => !each.live);
  if (!floating) throw new Error("No record was free for the pickup.");
  floating.live = true;
  floating.id = id;
  floating.x = x;
  floating.y = y;
  floating.vx = 0;
  floating.vy = 0;
  floating.lastX = x;
  floating.lastY = y;
  floating.lifeSteps = stepsIn(PICKUP_LIFE_MS);
  return floating;
}

/** Has a field's ship catch a pickup: it is floated onto the ship, and the field stepped. */
export function catchOn(field: Field, id: PickupId): void {
  const ship = shipOf(field);
  placePickup(field, id, ship.x, ship.y);
  stepField(field);
}

/**
 * Sends a stray across a field from a place, heading a way on a straight
 * line, a pilot in a color, and returns it.
 */
export function placeStray(
  field: Field,
  x: number,
  y: number,
  heading = 0,
  pilot: Pilot = 5,
): Stray {
  const stray = field.strays.adrift;
  stray.live = true;
  stray.pilot = pilot;
  stray.x = x;
  stray.y = y;
  stray.heading = heading;
  stray.turn = 0;
  stray.lastX = x;
  stray.lastY = y;
  return stray;
}

/**
 * Sends a comet across a field from a place, heading a way, crossing from
 * the step under way, and returns it, failing the spec if no record is
 * free.
 */
export function placeComet(
  field: Field,
  x: number,
  y: number,
  heading = 0,
): Comet {
  const comet = field.comets.slots.find((each) => !each.live);
  if (!comet) throw new Error("No record was free for the comet.");
  comet.live = true;
  comet.x = x;
  comet.y = y;
  comet.heading = heading;
  comet.lastX = x;
  comet.lastY = y;
  comet.warnSteps = 0;
  comet.smashedAt.fill(-1);
  comet.smashes = 0;
  return comet;
}

/** Returns the field's floating pickups, in their records' order. */
export function floatingPickups(field: Field): Floating[] {
  return field.pickups.filter((floating) => floating.live);
}

/** Steps a field a number of times. */
export function stepTimes(field: Field, steps: number): void {
  for (let i = 0; i < steps; i++) stepField(field);
}

/** Returns the kinds of every event the field's log still holds, oldest first. */
export function eventsOf(field: Pick<Field, "events">): FieldEventKind[] {
  const kinds: FieldEventKind[] = [];
  field.events.forEachSince(0, (event) => kinds.push(event.kind));
  return kinds;
}

/** Returns copies of the events a field's log still holds, oldest first. */
export function loggedOn(field: Pick<Field, "events">): FieldEvent[] {
  const events: FieldEvent[] = [];
  field.events.forEachSince(0, (event) => events.push({ ...event }));
  return events;
}

/** Puts a flying ship on a field at a place, its nose up. */
function placeShip(field: Field, x: number, y: number): void {
  if (field.ship) throw new Error("A picture holds one ship at most.");
  field.ship = createShip(x, y, STILL);
  field.ship.waiting = false;
}

/** Returns the size of rock a picture's character stands for. */
function sizeOf(character: string): RockSize {
  const size = SIZES[character];
  if (!size) throw new Error(`No rock is drawn "${character}".`);
  return size;
}
