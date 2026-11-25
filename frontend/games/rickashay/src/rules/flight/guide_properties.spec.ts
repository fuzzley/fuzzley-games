import { AIM_COUNT } from "@fz/brick-wall/rules/aims";
import { type Waypoint, positionAt } from "@fz/brick-wall/rules/track";
import { createRandom } from "@fz/core/random";
import {
  randomField,
  randomStart,
  unflown,
} from "../../testing/cast_reference";
import { near } from "../../testing/shots";
import { STAND_INS } from "../../testing/stand_ins";
import { playRound } from "../round/round";
import type { Shot } from "../shot";
import { FLIGHT_RULES } from "../tuning";
import type { FlightEvent, RoundStart } from "./events";
import { type Guide, guideOf } from "./guide";

/** The seeds of the property specs' sources of numbers, one a batch. */
const SEEDS = [20261123, 20261124];

/** Describes a guide a property spec casts: where its round starts, its shot and how many turns it follows. */
interface Cast {
  readonly start: RoundStart;
  readonly shot: Shot;
  readonly turns: number;
}

/** Returns the guides of a seed's batch: 200 random walls of every kind, each aimed at from a random place, plain or hot, at a random aim, to the first, the third or the fifth turn. */
function guidesOf(seed: number): Cast[] {
  const random = createRandom(seed);
  return Array.from({ length: 200 }, () => ({
    start: randomStart(randomField(random), random),
    shot: { aim: Math.floor(random() * AIM_COUNT) },
    turns: [1, 3, 5][Math.floor(random() * 3)] ?? 3,
  }));
}

/** Describes what a guide shows: its events, where it ends, and the place it ends at. */
interface Shown {
  readonly events: readonly FlightEvent[];
  readonly length: number;
  readonly end: Waypoint | undefined;
}

/** Returns what a guide shows. */
function shownBy({ events, length, track }: Guide): Shown {
  return { events, length, end: track.waypoints.at(-1) };
}

/**
 * Returns what a guide should show of its round, played by the stand-in
 * trait rules: the round's own events, to the guide's length past the turn
 * it follows or to the landing, whichever comes first, and the place the
 * round's track passes then.
 */
function shownByRound({ start, shot, turns }: Cast): Shown {
  const { flight } = playRound(start, shot, FLIGHT_RULES, STAND_INS);
  const turn = flight.events.filter(({ kind }) => kind === "turn")[turns - 1];
  const length = Math.min(
    (turn?.at ?? Number.POSITIVE_INFINITY) + FLIGHT_RULES.guidePast,
    flight.length,
  );
  const there = positionAt(flight.track, length);
  return {
    events: flight.events.filter(({ at }) => at <= length),
    length: near(length),
    end: { at: near(length), x: near(there?.x ?? 0), y: near(there?.y ?? 0) },
  };
}

/** Returns a guide cast by the stand-in trait rules. */
function guideBy({ start, shot, turns }: Cast): Guide {
  return guideOf(start, shot, FLIGHT_RULES, turns, STAND_INS);
}

describe("guideOf(), over random walls", () => {
  it.each(SEEDS)(
    "leaves the start, the shot and the rules it is handed as they were, batch %i",
    (seed) => {
      const guides = guidesOf(seed);
      const handed = structuredClone(guides);
      const rules = structuredClone(FLIGHT_RULES);

      for (const { start, shot, turns } of guides) {
        guideOf(start, shot, rules, turns, STAND_INS);
      }

      expect([guides, rules]).toStrictEqual([handed, FLIGHT_RULES]);
    },
  );

  it.each(SEEDS)(
    "casts the same guide for the same start and aim, at a wall flown before or never, batch %i",
    (seed) => {
      const guides = guidesOf(seed);
      const first = guides.map(guideBy);

      const again = guides.map(guideBy);
      const fresh = guides.map((cast) =>
        guideBy({ ...cast, start: unflown(cast.start) }),
      );

      expect([again, fresh]).toStrictEqual([first, first]);
    },
  );

  it.each(SEEDS)(
    "is its round's own flight, to the guide's length past the turn it follows or to the landing, batch %i",
    (seed) => {
      const guides = guidesOf(seed);

      const cast = guides.map((guide) => shownBy(guideBy(guide)));

      expect(cast).toEqual(guides.map(shownByRound));
    },
  );
});
