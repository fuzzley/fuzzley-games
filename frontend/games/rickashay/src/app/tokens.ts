import { InjectionToken } from "@angular/core";
import type { Round, RoundStart } from "../rules/flight/events";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import type { Marks } from "../rules/run/stars";
import type { Shot } from "../rules/shot";
import type { FlightRules } from "../rules/tuning";
import warmUpMarks from "./play/warm_up_marks.json";

/** The levels a run is played through, in order: the game's but in specs. */
export const GAME_LEVELS = new InjectionToken<readonly LevelEntry[]>(
  "GAME_LEVELS",
  { providedIn: "root", factory: () => LEVELS },
);

/**
 * Each level's par and rally mark on each depth, which the run's par, the
 * stars, the records and the "Rickashay!" call read.
 *
 * Until the scripts that certify the levels write each set's marks, the
 * game plays on `play/warm_up_marks.json`, a copy of the specs' fixture of
 * Warm-up's, every par one `parFrom()` writes.
 */
export const GAME_MARKS = new InjectionToken<Marks>("GAME_MARKS", {
  providedIn: "root",
  factory: () => warmUpMarks,
});

/** Plays a round of a shot from where it starts, on the rules given, as the rules' `playRound()` does. */
export type RoundPlayer = (
  start: RoundStart,
  shot: Shot,
  rules: FlightRules,
) => Round;

/**
 * Plays each round a shot is released into: the rules' `playRound()`, but
 * in specs, which play rounds made from `src/testing/flight_fixtures.ts`.
 */
export const PLAY_ROUND = new InjectionToken<RoundPlayer>("PLAY_ROUND", {
  providedIn: "root",
  factory: () => playRound,
});
