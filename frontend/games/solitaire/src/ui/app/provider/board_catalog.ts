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
 * The board that draws each game.
 *
 * Kept apart from the game catalog because this is the only side that names
 * Phaser: everything that merely wants to know what is being played — the
 * header, the settings panel, their tests — can then stay clear of it.
 *
 * The mapped type is what ties the two halves together. Every id in the
 * catalog must appear here, with a factory taking exactly the game that id
 * deals, so adding a game without a board is a compile error rather than the
 * runtime `throw` that used to sit at the bottom of an `instanceof` chain —
 * and a board wired to the wrong game no longer type-checks at all.
 */
const BOARD_FACTORIES: { [Id in GameId]: BoardFactory<Id> } = {
  klondike: makeKlondikeBoardScene,
  freecell: makeFreeCellBoardScene,
  spider: makeSpiderBoardScene,
  // One board for all three of the Yukon family: the variants differ in what a
  // column accepts, which the zones already declare, and in nothing drawn.
  yukon: makeYukonBoardScene,
  // Baker's Game is FreeCell's class under different column rules, so it is
  // also FreeCell's board.
  bakers: makeFreeCellBoardScene,
  eightoff: makeEightOffBoardScene,
  scorpion: makeScorpionBoardScene,
  simplesimon: makeSimpleSimonBoardScene,
  bakersdozen: makeBakersDozenBoardScene,
  seahaven: makeSeahavenBoardScene,
  // One board for both Spiderette variants: they differ in the opening deal,
  // which the game has laid out before a board ever draws it.
  spiderette: makeSpideretteBoardScene,
  easthaven: makeEasthavenBoardScene,
  // One board for all three of the Forty Thieves family: the variants differ in
  // what a column accepts and what may be lifted, which the zones declare.
  fortythieves: makeFortyThievesBoardScene,
};

/**
 * Builds the board that draws a dealt game.
 *
 * The id and the game are narrowed together by the cast below. That is not a
 * new assumption: a catalog entry declares its id and the game it deals in one
 * place, and the table above is checked against that declaration — so the only
 * way to reach here with a mismatched pair is to have taken them from
 * different entries. What is lost by this point is the *proof*, not the fact:
 * {@link GameCatalogService} holds a dealt session under the erased
 * `PlayableGame`, because everything else that reads it — the header, the
 * settings panel — has no business knowing which game it has.
 *
 * @param gameId The id of the game being drawn.
 * @param game The dealt game itself, which must be the one that id deals.
 * @param presentation The player's table settings, which the board follows.
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
