import { InjectionToken } from "@angular/core";
import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { LEVELS, type LevelEntry } from "../rules/levels/levels";
import type { PlayRules } from "../rules/run/saved_game";

/** The levels a player plays, in order: the game's own, or a spec's. */
export const GAME_LEVELS = new InjectionToken<readonly LevelEntry[]>(
  "GAME_LEVELS",
  { providedIn: "root", factory: () => LEVELS },
);

/** The rules each move is played by, each element's and the wind's: the game's own, or a spec's. */
export const GAME_RULES = new InjectionToken<PlayRules>("GAME_RULES", {
  providedIn: "root",
  factory: () => ({ elements: ELEMENT_RULES, wind: WIND_RULE }),
});
