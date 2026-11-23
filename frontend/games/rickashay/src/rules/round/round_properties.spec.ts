import { AIM_COUNT } from "@fz/brick-wall/rules/aims";
import { createRandom } from "@fz/core/random";
import {
  levelOpenings,
  randomField,
  randomStart,
  unflown,
} from "../../testing/cast_reference";
import { STAND_INS } from "../../testing/stand_ins";
import type { RoundStart } from "../flight/events";
import { guideOf } from "../flight/guide";
import type { Shot } from "../shot";
import { FLIGHT_RULES } from "../tuning";
import { playRound } from "./round";

/** The seeds of the property specs' sources of numbers, one a batch. */
const SEEDS = [20261123, 20261124];

/** Describes a round a property spec plays: where it starts and its shot. */
interface Played {
  readonly start: RoundStart;
  readonly shot: Shot;
}

/** How many aims apart the guides are that a property spec casts at a wall before its round. */
const GUIDED_AIM_STEP = 41;

/** The turn those guides run past: the fifth, the farthest the player's setting asks for. */
const GUIDE_TURNS = 5;

/**
 * Returns the rounds of a seed's batch: 100 random walls of every kind,
 * each shot at from a random place, plain or hot, and every level's
 * opening at every depth, each at an aim drawn from the seed.
 */
function roundsOf(seed: number): Played[] {
  const random = createRandom(seed);
  const aim = (): Shot => ({ aim: Math.floor(random() * AIM_COUNT) });
  const drawn = Array.from({ length: 100 }, () => ({
    start: randomStart(randomField(random), random),
    shot: aim(),
  }));
  const openings = levelOpenings().map((start) => ({ start, shot: aim() }));
  return [...drawn, ...openings];
}

describe("playRound(), over random walls and every level's openings", () => {
  it.each(SEEDS)(
    "leaves the start, the shot and the rules it is handed as they were, batch %i",
    (seed) => {
      const rounds = roundsOf(seed);
      const handed = structuredClone(rounds);
      const rules = structuredClone(FLIGHT_RULES);

      for (const { start, shot } of rounds) {
        playRound(start, shot, rules, STAND_INS);
      }

      expect([rounds, rules]).toStrictEqual([handed, FLIGHT_RULES]);
    },
  );

  it.each(SEEDS)(
    "plays the same round for the same start and aim, at a wall flown before or never, batch %i",
    (seed) => {
      const rounds = roundsOf(seed);
      const first = rounds.map(({ start, shot }) =>
        playRound(start, shot, FLIGHT_RULES, STAND_INS),
      );

      const again = rounds.map(({ start, shot }) =>
        playRound(start, shot, FLIGHT_RULES, STAND_INS),
      );
      const fresh = rounds.map(({ start, shot }) =>
        playRound(unflown(start), shot, FLIGHT_RULES, STAND_INS),
      );

      expect([again, fresh]).toStrictEqual([first, first]);
    },
  );

  it.each(SEEDS)(
    "plays the same round after guides to the fifth turn at every 41st aim of its wall as at a wall never flown, batch %i",
    (seed) => {
      const rounds = roundsOf(seed);
      for (const { start } of rounds) {
        for (let aim = 0; aim < AIM_COUNT; aim += GUIDED_AIM_STEP) {
          guideOf(start, { aim }, FLIGHT_RULES, GUIDE_TURNS, STAND_INS);
        }
      }

      const played = rounds.map(({ start, shot }) =>
        playRound(start, shot, FLIGHT_RULES, STAND_INS),
      );

      expect(played).toStrictEqual(
        rounds.map(({ start, shot }) =>
          playRound(unflown(start), shot, FLIGHT_RULES, STAND_INS),
        ),
      );
    },
  );
});
