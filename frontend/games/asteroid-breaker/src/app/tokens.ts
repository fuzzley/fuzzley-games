import { InjectionToken } from "@angular/core";
import { type Tuning, createTuning } from "@fz/game-ui/debug_menu";
import { WAVES, type WaveEntry } from "../rules/waves/waves";
import { type Feel, TUNED } from "../view/debug_tuning";

/** The waves a run is played through, in order: the game's but in specs. */
export const GAME_WAVES = new InjectionToken<readonly WaveEntry[]>(
  "GAME_WAVES",
  { providedIn: "root", factory: () => WAVES },
);

/**
 * The numbers that set the feel as the debug menu tunes them, which the
 * field in play and every one after take: `tuning.ts`'s until it tunes
 * them.
 */
export const TUNING = new InjectionToken<Tuning<Feel>>("TUNING", {
  providedIn: "root",
  factory: () => createTuning(TUNED),
});
