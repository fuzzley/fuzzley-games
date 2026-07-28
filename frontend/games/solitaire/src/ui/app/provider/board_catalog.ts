import { InjectionToken, inject } from "@angular/core";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { SolitaireGame } from "@/games/klondike/solitaire_game";
import { makeKlondikeBoardScene } from "@/games/klondike/solitaire";
import { FreeCellGame } from "@/games/freecell/freecell_game";
import { makeFreeCellBoardScene } from "@/games/freecell/freecell_board";
import { SpiderGame } from "@/games/spider/spider_game";
import { makeSpiderBoardScene } from "@/games/spider/spider_board";
import { PresentationSettingsService } from "../service/presentation_settings.service";
import { GAME_SESSION } from "./game_model.provider";

/**
 * Builds the board that draws a game.
 *
 * Kept apart from the game catalog because this is the only side that names
 * Phaser: everything that merely wants to know what is being played — the
 * header, the settings panel, their tests — can then stay clear of it.
 */
export function makeBoardScene(
  game: unknown,
  presentation: TablePresentation,
): BoardScene {
  if (game instanceof SolitaireGame) {
    return makeKlondikeBoardScene(game, presentation);
  }
  if (game instanceof FreeCellGame) {
    return makeFreeCellBoardScene(game, presentation);
  }
  if (game instanceof SpiderGame) {
    return makeSpiderBoardScene(game, presentation);
  }
  throw new Error("No board is registered for this game.");
}

/** The board scene drawing the running game. */
export const GAME_BOARD_SCENE = new InjectionToken<BoardScene>(
  "GAME_BOARD_SCENE",
  {
    providedIn: "root",
    factory: () =>
      makeBoardScene(
        inject(GAME_SESSION).game,
        inject(PresentationSettingsService),
      ),
  },
);
