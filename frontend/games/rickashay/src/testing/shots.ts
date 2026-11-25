// The shots the rules' specs fly at a wall drawn as a picture, on a field
// 11 deep, and what they read of a flight: its events of a kind, an event
// without its moment, and a number as near as the flight's arithmetic
// finds it.

import {
  AIMS_PER_DEGREE,
  type Aim,
  FIRST_AIM_DEGREES,
} from "@fz/brick-wall/rules/aims";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import { expect } from "vitest";
import { TRAIT_RULES } from "../rules/bricks/trait_rules";
import type {
  Flight,
  FlightEvent,
  FlightEventKind,
  RoundStart,
} from "../rules/flight/events";
import { type FlightStop, type Flown, fly } from "../rules/flight/flight";
import type { TraitRules } from "../rules/flight/hooks";
import { WALL_LEGEND } from "../rules/levels/legend";
import { FLIGHT_RULES, type FlightRules } from "../rules/tuning";

/** How many rows deep the field a shot here flies in is. */
export const SHOT_DEPTH = 11;

/** Says where a round starts at a wall drawn as a picture. */
export interface PictureStart {
  /** The field row the picture's lowest row stands in: 5 unless given. */
  readonly lowestRow?: number;
  /** Where the fuzzball waits: the floor's middle unless given. */
  readonly x?: number;
  readonly hot?: boolean;
}

/** Describes a shot at a wall drawn as a picture. */
export interface PictureShot extends PictureStart {
  /** The wall, a row of the picture to a row of the field: none unless given. */
  readonly picture?: readonly string[];
  /** The aim's angle, in degrees counter-clockwise from the floor on the right: 45° unless given. */
  readonly degrees?: number;
  /** The rules it flies by: the game's unless given. */
  readonly rules?: FlightRules;
  /** The bricks' trait rules: the game's unless given. */
  readonly traits?: TraitRules;
  /** Where it stops short, as a guide's flight does: at its landing unless given. */
  readonly stop?: FlightStop;
}

/** Returns the aim at an angle, in degrees counter-clockwise from the floor on the right. */
export function aimAt(degrees: number): Aim {
  return (degrees - FIRST_AIM_DEGREES) * AIMS_PER_DEGREE;
}

/** Returns where a round starts at a wall drawn as a picture, on a field 11 deep. */
export function startAt(
  picture: readonly string[],
  { lowestRow = 5, x = 4.5, hot = false }: PictureStart = {},
): RoundStart {
  const wall = wallFrom(picture, WALL_LEGEND, { lowestRow });
  return { wall, depth: SHOT_DEPTH, x, hot };
}

/** Returns the flight of a shot at a wall drawn as a picture, on a field 11 deep. */
export function flyAt({
  picture = [],
  degrees = 45,
  rules = FLIGHT_RULES,
  traits = TRAIT_RULES,
  stop,
  ...start
}: PictureShot): Flown {
  return fly(
    startAt(picture, start),
    { aim: aimAt(degrees) },
    rules,
    traits,
    stop,
  );
}

/** Returns a flight's events of a kind. */
export function eventsOf<K extends FlightEventKind>(
  { events }: Pick<Flight, "events">,
  kind: K,
): Extract<FlightEvent, { readonly kind: K }>[] {
  return events.filter(
    (event): event is Extract<FlightEvent, { readonly kind: K }> =>
      event.kind === kind,
  );
}

/** Returns an event without its moment, which the flight's arithmetic and a fixture's may round apart. */
export function timeless({ at: _, ...event }: FlightEvent): object {
  return event;
}

/** Returns a number matched as near as the flight's arithmetic finds it. */
export function near(value: number): number {
  return expect.closeTo(value, 9) as number;
}
