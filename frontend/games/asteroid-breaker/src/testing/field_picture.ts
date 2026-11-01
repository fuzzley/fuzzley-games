import type { RockKindId, RockSize } from "../rules/catalog/rocks";
import type { FieldEventKind } from "../rules/events";
import { type Field, createField, stepField } from "../rules/field";
import { type Rock, addRock } from "../rules/rocks";
import { STILL, type Ship, createShip } from "../rules/ship";
import type { Torus } from "../rules/torus";

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
        layStill(field, size, x, y, kind);
      }
    }
  });
  return field;
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

/** Steps a field a number of times. */
export function stepTimes(field: Field, steps: number): void {
  for (let i = 0; i < steps; i++) stepField(field);
}

/** Returns the kinds of every event the field's log still holds, oldest first. */
export function eventsOf(field: Field): FieldEventKind[] {
  const kinds: FieldEventKind[] = [];
  field.events.forEachSince(0, (event) => kinds.push(event.kind));
  return kinds;
}

/** Puts a flying ship on a field at a place, its nose up. */
function placeShip(field: Field, x: number, y: number): void {
  if (field.ship) throw new Error("A picture holds one ship at most.");
  field.ship = createShip(x, y, STILL);
  field.ship.waiting = false;
}

/** Lays a rock standing still at a place, failing the spec if no slot is free. */
function layStill(
  field: Field,
  size: RockSize,
  x: number,
  y: number,
  kind: RockKindId,
): void {
  const rock = addRock(field, kind, size, x, y, 0);
  if (!rock) throw new Error("The picture holds more rocks than the cap.");
  rock.vx = 0;
  rock.vy = 0;
}

/** Returns the size of rock a picture's character stands for. */
function sizeOf(character: string): RockSize {
  const size = SIZES[character];
  if (!size) throw new Error(`No rock is drawn "${character}".`);
  return size;
}
