import { InjectionToken, type Type } from "@angular/core";
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

/** Loads a component a chunk of its own holds, as `onDemand()` takes one. */
export type ComponentLoad = () => Promise<Type<unknown>>;

/**
 * Loads How to play, its chunk fetched as it first opens: but in specs,
 * which load it slowly or fail to.
 */
export const LOAD_HELP = new InjectionToken<ComponentLoad>("LOAD_HELP", {
  providedIn: "root",
  factory: () => () =>
    import("./help/help.component").then((chunk) => chunk.HelpComponent),
});

/**
 * Loads the debug menu, its chunk fetched only where it is offered: but in
 * specs, which load it slowly or fail to.
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
