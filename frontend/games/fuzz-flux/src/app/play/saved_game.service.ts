import { Injectable, inject } from "@angular/core";
import { keepSaved } from "@fz/ui/storage";
import {
  SAVED_GAME_VERSION,
  readSavedGame,
  savedGameOf,
} from "../../rules/run/saved_game";
import { DebugService } from "../debug/debug.service";
import { GAME_LEVELS, GAME_RULES } from "../tokens";
import { GameService } from "./game.service";

/** Where the level in play is kept. Renaming it loses every player's. */
const SAVED_GAME_KEY = "fuzz-flux-game";

/**
 * Keeps the level in play as each move is made, and takes it up again when
 * the page loads, its moves replayed by the rules, so the board comes back
 * at rest after the last; a level that has ended is kept no more, and one
 * played off the record comes back off it. Something must inject it at
 * startup for the level to be taken up.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  constructor() {
    const game = inject(GameService);
    const levels = inject(GAME_LEVELS);
    const rules = inject(GAME_RULES);
    const debug = inject(DebugService);
    keepSaved({
      key: SAVED_GAME_KEY,
      version: SAVED_GAME_VERSION,
      save: () => {
        if (game.ended()) return null;
        const saved = savedGameOf(game.inPlay());
        return debug.offRecord() ? { ...saved, offRecord: true } : saved;
      },
      restore: (saved) => {
        const inPlay = readSavedGame(saved, levels, rules);
        if (inPlay !== null) game.takeUp(inPlay, saved["offRecord"] === true);
      },
    });
  }
}
