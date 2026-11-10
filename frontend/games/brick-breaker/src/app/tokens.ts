import { InjectionToken } from "@angular/core";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";

/** The levels a run is played through, in order: the game's but in specs. */
export const GAME_LEVELS = new InjectionToken<readonly LevelEntry[]>(
  "GAME_LEVELS",
  { providedIn: "root", factory: () => LEVELS },
);
