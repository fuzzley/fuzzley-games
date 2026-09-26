import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { PlayableGame } from "@/engine/tableau/playable_game";
import { makeKlondikeBoardScene } from "@/games/klondike/klondike_board";
import { makeFreeCellBoardScene } from "@/games/freecell/freecell_board";
import { makeSpiderBoardScene } from "@/games/spider/spider_board";
import { makeYukonBoardScene } from "@/games/yukon/yukon_board";
import { makeEightOffBoardScene } from "@/games/eight_off/eight_off_board";
import { makeScorpionBoardScene } from "@/games/scorpion/scorpion_board";
import { makeSimpleSimonBoardScene } from "@/games/simple_simon/simple_simon_board";
import { makeBakersDozenBoardScene } from "@/games/bakers_dozen/bakers_dozen_board";
import { makeSeahavenBoardScene } from "@/games/seahaven/seahaven_board";
import { makeSpideretteBoardScene } from "@/games/spiderette/spiderette_board";
import { makeDoubleKlondikeBoardScene } from "@/games/double_klondike/double_klondike_board";
import { makeMontanaBoardScene } from "@/games/montana/montana_board";
import { makeEasthavenBoardScene } from "@/games/easthaven/easthaven_board";
import { makeFortyThievesBoardScene } from "@/games/forty_thieves/forty_thieves_board";
import { GameId, GameOf } from "./game_catalog";

/** Builds the Phaser board that draws a particular game. */
type BoardFactory<Id extends GameId> = (
  game: GameOf<Id>,
  presentation: TablePresentation,
  onReady?: () => void,
) => BoardScene;

/**
 * The board that draws each game, typed so that a game without a board, or
 * with the wrong one, does not compile.
 */
const BOARD_FACTORIES: { [Id in GameId]: BoardFactory<Id> } = {
  klondike: makeKlondikeBoardScene,
  freecell: makeFreeCellBoardScene,
  spider: makeSpiderBoardScene,
  yukon: makeYukonBoardScene,
  // Baker's Game is played by FreeCell's class, so it uses FreeCell's board.
  bakers: makeFreeCellBoardScene,
  eightoff: makeEightOffBoardScene,
  scorpion: makeScorpionBoardScene,
  simplesimon: makeSimpleSimonBoardScene,
  bakersdozen: makeBakersDozenBoardScene,
  seahaven: makeSeahavenBoardScene,
  spiderette: makeSpideretteBoardScene,
  easthaven: makeEasthavenBoardScene,
  // Maria and Limited are played by the Forty Thieves class, whose board
  // factory reads the grid off the game.
  fortythieves: makeFortyThievesBoardScene,
  maria: makeFortyThievesBoardScene,
  limited: makeFortyThievesBoardScene,
  doubleklondike: makeDoubleKlondikeBoardScene,
  montana: makeMontanaBoardScene,
};

/**
 * Builds the board that draws a dealt game.
 *
 * @param game The dealt game, which must be the one `gameId` deals; the cast
 *   below trusts that, because the catalog holds sessions under an erased type.
 * @param onReady Called once the board has finished building itself.
 */
export function makeBoardScene(
  gameId: GameId,
  game: PlayableGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  const factory = BOARD_FACTORIES[gameId] as BoardFactory<GameId>;
  return factory(game as GameOf<GameId>, presentation, onReady);
}
