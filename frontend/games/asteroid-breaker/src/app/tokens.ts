import { InjectionToken } from "@angular/core";
import { WAVES, type WaveEntry } from "../rules/waves";

/** Where new runs take their seeds from: `Math.random` but in specs. */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});

/** The waves a run is played through, in order: the game's but in specs. */
export const GAME_WAVES = new InjectionToken<readonly WaveEntry[]>(
  "GAME_WAVES",
  { providedIn: "root", factory: () => WAVES },
);
