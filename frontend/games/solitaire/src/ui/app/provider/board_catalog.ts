import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import { makeKlondikeBoardScene } from "@/games/klondike/klondike";
import { FreeCellGame } from "@/games/freecell/freecell_game";
import { makeFreeCellBoardScene } from "@/games/freecell/freecell_board";
import { SpiderGame } from "@/games/spider/spider_game";
import { makeSpiderBoardScene } from "@/games/spider/spider_board";
import { YukonGame } from "@/games/yukon/yukon_game";
import { makeYukonBoardScene } from "@/games/yukon/yukon_board";

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
  if (game instanceof KlondikeGame) {
    return makeKlondikeBoardScene(game, presentation);
  }
  if (game instanceof FreeCellGame) {
    return makeFreeCellBoardScene(game, presentation);
  }
  if (game instanceof SpiderGame) {
    return makeSpiderBoardScene(game, presentation);
  }
  // One board for all three of the Yukon family: the variants differ in what a
  // column accepts, which the zones already declare, and in nothing drawn.
  if (game instanceof YukonGame) {
    return makeYukonBoardScene(game, presentation);
  }
  throw new Error("No board is registered for this game.");
}
