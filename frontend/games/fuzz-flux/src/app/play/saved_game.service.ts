import { Injectable, inject } from "@angular/core";
import { keepSaved } from "@fz/ui/storage";
import {
  SAVED_GAME_VERSION,
  readSavedGame,
  savedGameOf,
} from "../../rules/run/saved_game";
import { GAME_LEVELS, GAME_RULES } from "../tokens";
import { GameService } from "./game.service";

/** Where the level in play is kept. Renaming it loses every player's. */
const SAVED_GAME_KEY = "fuzz-flux-game";

/**
 * Keeps the level in play as each move is made, and takes it up again when
 * the page loads, its moves replayed by the rules, so the board comes back
 * at rest after the last; a level that has ended is kept no more. Something
 * must inject it at startup for the level to be taken up.
 */
@Injectable({ providedIn: "root" })
export class SavedGameService {
  constructor() {
    const game = inject(GameService);
    const levels = inject(GAME_LEVELS);
    const rules = inject(GAME_RULES);
    keepSaved({
      key: SAVED_GAME_KEY,
      version: SAVED_GAME_VERSION,
      save: () => (game.ended() ? null : savedGameOf(game.inPlay())),
      restore: (saved) => {
        const inPlay = readSavedGame(saved, levels, rules);
        if (inPlay !== null) game.takeUp(inPlay);
      },
    });
  }
}
