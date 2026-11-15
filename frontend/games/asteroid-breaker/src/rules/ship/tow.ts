// The line in tow behind the ship: a link for each of the crew in tow, made
// once, the first tied behind the ship and each pulled straight toward the
// one ahead to its length every step, so the line swings as the ship turns
// and finds the short way across the field's edges. Nothing hits a bubble
// in tow; only the ship is hit.

import { type Moving, type Place, type Torus, across, wrap } from "../torus";
import { MOST_CREW, TOW_HOOK, TOW_LINK } from "../tuning";
import { type Crew, type Pilot, joinTow } from "./pilots";
import type { Ship } from "./ship";

/**
 * Says how the crew ride in tow, a value the field holds, as it holds its
 * flight, so it can change in play: how many at most, no more than the
 * links the line is made with.
 */
export interface Towing {
  /** The most that ride in tow; a stray caught past it goes straight home. */
  readonly mostInTow: number;
}

/** How the crew ride in tow, as `tuning.ts` has it. */
export const TUNED_TOWING: Readonly<Towing> = { mostInTow: MOST_CREW - 1 };

/**
 * Describes what of the field a pilot joining the line in tow changes: the
 * line, the crew it joins, and how many may ride.
 */
export interface LineField extends TowField {
  crew: Crew;
  readonly towing: Readonly<Towing>;
}

/** Describes where one of the crew rides in tow, stepped in place. */
export interface TowLink extends Moving {
  /** Where it was a step ago, for the scene to draw between, across the wrap as a ship's is. */
  lastX: number;
  lastY: number;
}

/**
 * Describes what of the field the line in tow follows: the links, the crew
 * whose `tow` says how many ride, in the links' order, the ship they follow,
 * and the field they wrap on.
 */
export interface TowField {
  /** A link for each of the most that ride in tow, the first nearest the ship. */
  readonly tow: readonly TowLink[];
  readonly crew: Crew;
  readonly ship: Readonly<Ship> | null;
  readonly torus: Torus;
}

/** Returns the links of a field's line in tow, one for each of the most that ride, none laid yet. */
export function createTow(): TowLink[] {
  return Array.from({ length: MOST_CREW - 1 }, () => ({
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
  }));
}

/**
 * Lays the line in tow straight out behind the ship, each link where it was
 * a step ago too, as a ship comes; with no ship, it is left as it is.
 */
export function layTow(field: TowField): void {
  const { ship } = field;
  if (!ship) return;
  const backX = -Math.cos(ship.angle);
  const backY = -Math.sin(ship.angle);
  for (let link = 0; link < field.crew.tow.length; link++) {
    const along = TOW_HOOK + (link + 1) * TOW_LINK;
    place(field, link, ship.x + backX * along, ship.y + backY * along);
  }
}

/**
 * Lays one who joins the line's end a link's length behind the one ahead of
 * it, the way the line runs there, or, where it runs no way, the way the
 * ship's tail points, where it was a step ago too; with no ship, it is left
 * as it is.
 */
export function trailLink(field: TowField, link: number): void {
  const { ship, torus } = field;
  if (!ship) return;
  const ahead = aheadOf(field, ship, link);
  const before = link === 0 ? ship : aheadOf(field, ship, link - 1);
  const wayX = across(before.x, ahead.x, torus.width);
  const wayY = across(before.y, ahead.y, torus.height);
  const way = Math.hypot(wayX, wayY);
  const backX = way > 0 ? wayX / way : -Math.cos(ship.angle);
  const backY = way > 0 ? wayY / way : -Math.sin(ship.angle);
  place(field, link, ahead.x + backX * TOW_LINK, ahead.y + backY * TOW_LINK);
}

/**
 * Returns whether the line in tow has room for one more: fewer ride than
 * the field's towing lets, and than the links it was made with.
 */
export function hasRoomInTow(
  field: Pick<LineField, "tow" | "crew" | "towing">,
): boolean {
  const most = Math.min(field.towing.mostInTow, field.tow.length);
  return field.crew.tow.length < most;
}

/**
 * Has a pilot join the line in tow's end, laid a link behind the last, as a
 * stray caught or one knocked loose caught again does.
 *
 * @throws {RangeError} For a line with no room, as {@link hasRoomInTow} says.
 */
export function joinLine(field: LineField, pilot: Pilot): void {
  if (!hasRoomInTow(field)) {
    throw new RangeError("The line in tow has no room for another.");
  }
  field.crew = joinTow(field.crew, pilot);
  trailLink(field, field.crew.tow.length - 1);
}

/**
 * Follows the ship a step with the line in tow: each link of the crew in
 * tow pulled straight toward the one ahead, the first toward the hook
 * behind the ship, to a link's length the shortest way across the wrap;
 * with no ship, the line holds where it is.
 */
export function stepTow(field: TowField): void {
  const { ship, torus } = field;
  if (!ship) {
    settleTow(field);
    return;
  }
  // The hook's place is kept in two numbers, as a step makes nothing.
  let aheadX = wrap(ship.x - Math.cos(ship.angle) * TOW_HOOK, torus.width);
  let aheadY = wrap(ship.y - Math.sin(ship.angle) * TOW_HOOK, torus.height);
  for (let link = 0; link < field.crew.tow.length; link++) {
    const at = linkOf(field, link);
    at.lastX = at.x;
    at.lastY = at.y;
    const wayX = across(aheadX, at.x, torus.width);
    const wayY = across(aheadY, at.y, torus.height);
    const way = Math.hypot(wayX, wayY);
    // A link on the one ahead has no way to be pulled out along, so it holds.
    if (way > 0) {
      at.x = wrap(aheadX + (wayX / way) * TOW_LINK, torus.width);
      at.y = wrap(aheadY + (wayY / way) * TOW_LINK, torus.height);
    }
    aheadX = at.x;
    aheadY = at.y;
  }
}

/**
 * Sets where each link of the line in tow was a step ago to where it is, so
 * a line that holds is drawn standing still, as a cleared field is.
 */
export function settleTow(field: Pick<TowField, "tow" | "crew">): void {
  for (let link = 0; link < field.crew.tow.length; link++) {
    const at = linkOf(field, link);
    at.lastX = at.x;
    at.lastY = at.y;
  }
}

/** Returns where the line in tow is tied behind a ship, at its tail. */
function hookOf(ship: Readonly<Ship>, torus: Torus): Place {
  return {
    x: wrap(ship.x - Math.cos(ship.angle) * TOW_HOOK, torus.width),
    y: wrap(ship.y - Math.sin(ship.angle) * TOW_HOOK, torus.height),
  };
}

/** Returns what a link of the line in tow follows: the one ahead, or, for the first, the hook. */
function aheadOf(
  field: Pick<TowField, "tow" | "torus">,
  ship: Readonly<Ship>,
  link: number,
): Place {
  return link === 0 ? hookOf(ship, field.torus) : linkOf(field, link - 1);
}

/** Puts a link of the line in tow at a place, wrapped onto the field, where it was a step ago too. */
function place(field: TowField, link: number, x: number, y: number): void {
  const at = linkOf(field, link);
  at.x = wrap(x, field.torus.width);
  at.y = wrap(y, field.torus.height);
  at.lastX = at.x;
  at.lastY = at.y;
}

/**
 * Returns a link of the line in tow by its place in it.
 *
 * @throws {RangeError} For a place past the links the field made.
 */
function linkOf(field: Pick<TowField, "tow">, link: number): TowLink {
  const at = field.tow[link];
  if (!at) throw new RangeError(`The line in tow has no link ${String(link)}.`);
  return at;
}
