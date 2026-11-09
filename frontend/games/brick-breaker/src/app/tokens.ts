import { InjectionToken } from "@angular/core";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";

/**
 * Whether the settings offer the debug menu: in a development build, as the
 * game's own dev server runs it, never in a production one.
 */
export const DEBUG_MENU = new InjectionToken<boolean>("DEBUG_MENU", {
  providedIn: "root",
  factory: () => import.meta.env.DEV,
});

/** The levels a run is played through, in order: the game's but in specs. */
export const GAME_LEVELS = new InjectionToken<readonly LevelEntry[]>(
  "GAME_LEVELS",
  { providedIn: "root", factory: () => LEVELS },
);
