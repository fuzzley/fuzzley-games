import { InjectionToken } from "@angular/core";
import type { ComponentLoad } from "@fz/ui/on_demand";
import type { Round, RoundStart } from "../rules/flight/events";
import { LEVEL_MARKS } from "../rules/levels/level_marks";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import type { Marks } from "../rules/run/stars";
import type { Shot } from "../rules/shot";
import type { FlightRules } from "../rules/tuning";

/** The levels a run is played through, in order: the game's but in specs. */
export const GAME_LEVELS = new InjectionToken<readonly LevelEntry[]>(
  "GAME_LEVELS",
  { providedIn: "root", factory: () => LEVELS },
);

/** Each level's par and rally mark on each depth, which the run's par, the stars, the records and the "Rickashay!" call read: the game's, but in specs. */
export const GAME_MARKS = new InjectionToken<Marks>("GAME_MARKS", {
  providedIn: "root",
  factory: () => LEVEL_MARKS,
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

/**
 * Loads the debug menu, its chunk fetched as the settings drawer is first
 * drawn where the menu is offered: but in specs, which load it slowly or
 * fail to.
 */
export const LOAD_DEBUG_MENU = new InjectionToken<ComponentLoad>(
  "LOAD_DEBUG_MENU",
  {
    providedIn: "root",
    factory: () => () =>
      import("./debug/debug_menu.component").then(
        (chunk) => chunk.DebugMenuComponent,
      ),
  },
);

/**
 * Loads How to play, its chunk fetched as it first opens: but in specs,
 * which load it slowly or fail to.
 */
export const LOAD_HELP = new InjectionToken<ComponentLoad>("LOAD_HELP", {
  providedIn: "root",
  factory: () => () =>
    import("./help/help.component").then((chunk) => chunk.HelpComponent),
});
