import { InjectionToken } from "@angular/core";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";

/** The levels a run is played through, in order: the game's but in specs. */
export const GAME_LEVELS = new InjectionToken<readonly LevelEntry[]>(
  "GAME_LEVELS",
  { providedIn: "root", factory: () => LEVELS },
);

/** Plays a round from where it starts, as the rules' `playRound()` does. */
export type RoundPlayer = typeof playRound;

/**
 * Plays each round a shot is released into: the rules' `playRound()`, but
 * in specs, which play rounds made from `src/testing/flight_fixtures.ts`.
 */
export const PLAY_ROUND = new InjectionToken<RoundPlayer>("PLAY_ROUND", {
  providedIn: "root",
  factory: () => playRound,
});
