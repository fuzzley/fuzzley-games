import { IntentHandler } from "@/engine/render/input/table_intents";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { PlayableGame } from "@/engine/tableau/playable_game";
import { makeTableBoardScene } from "@/games/common/board_scene_factory";
import { stocklessGestures } from "@/games/common/table_gestures";

import { easthavenGestures } from "@/games/easthaven/easthaven_gestures";
import { fortyThievesGestures } from "@/games/forty_thieves/forty_thieves_gestures";
import { klondikeGestures } from "@/games/klondike/klondike_gestures";
import { montanaGestures } from "@/games/montana/montana_gestures";
import { scorpionGestures } from "@/games/scorpion/scorpion_gestures";
import { spiderGestures } from "@/games/spider/spider_gestures";
import { spideretteGestures } from "@/games/spiderette/spiderette_gestures";
import { acesUpGestures } from "@/games/aces_up/aces_up_gestures";
import { golfGestures } from "@/games/golf/golf_gestures";
import { calculationGestures } from "@/games/calculation/calculation_gestures";
import { bristolGestures } from "@/games/bristol/bristol_gestures";
import { monteCarloGestures } from "@/games/monte_carlo/monte_carlo_gestures";
import { laBelleLucieGestures } from "@/games/la_belle_lucie/la_belle_lucie_gestures";
import { canfieldGestures } from "@/games/canfield/canfield_gestures";
import { GameId, GameOf, catalogEntry } from "./game_catalog";

/** Says what a press or a drop means in a particular game. */
type GestureMap<Id extends GameId> = (game: GameOf<Id>) => IntentHandler;

/**
 * What each game does with a press or a drop, typed so that a game without a
 * gesture map, or with the wrong one, does not compile.
 */
const GESTURES: { [Id in GameId]: GestureMap<Id> } = {
  klondike: klondikeGestures,
  freecell: stocklessGestures,
  spider: spiderGestures,
  yukon: stocklessGestures,
  bakers: stocklessGestures,
  challengefreecell: stocklessGestures,
  eightoff: stocklessGestures,
  scorpion: scorpionGestures,
  simplesimon: stocklessGestures,
  mrsmop: stocklessGestures,
  bakersdozen: stocklessGestures,
  seahaven: stocklessGestures,
  spiderette: spideretteGestures,
  easthaven: easthavenGestures,
  fortythieves: fortyThievesGestures,
  maria: fortyThievesGestures,
  limited: fortyThievesGestures,
  lucas: fortyThievesGestures,
  doubleklondike: klondikeGestures,
  montana: montanaGestures,
  bluemoon: montanaGestures,
  bisley: stocklessGestures,
  acesup: acesUpGestures,
  golf: golfGestures,
  calculation: calculationGestures,
  flowergarden: stocklessGestures,
  bristol: bristolGestures,
  nestor: stocklessGestures,
  montecarlo: monteCarloGestures,
  labellelucie: laBelleLucieGestures,
  trefoil: laBelleLucieGestures,
  canfield: canfieldGestures,
};

/**
 * Builds the board that draws a dealt game, on the grid its catalog entry
 * declares.
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
  const tableGame = game as GameOf<GameId>;
  const gestures = GESTURES[gameId] as GestureMap<GameId>;
  return makeTableBoardScene({
    game: tableGame,
    layout: catalogEntry(gameId).layout,
    handleIntent: gestures(tableGame),
    presentation,
    onReady,
  });
}
