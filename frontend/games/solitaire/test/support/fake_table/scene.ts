import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import {
  FAKE_TABLE_LAYOUT,
  buildFakeTableViewState,
  fakeTableGestures,
  fakeTableStackFromCard,
  resolveFakeTableDropTarget,
} from "./board";
import { FakeTableGame } from "./game";

/**
 * Builds the Phaser board scene that draws the fake game.
 *
 * Kept apart from `board.ts` because this is the only half that names Phaser:
 * the specs that exercise layout maths and view state run without a canvas, and
 * importing a scene into them would drag the whole renderer along.
 */
export function makeFakeTableBoardScene(
  game: FakeTableGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return new BoardScene({
    game,
    cardIds: game.cardIds,
    layout: FAKE_TABLE_LAYOUT,
    buildViewState: buildFakeTableViewState(game, presentation),
    resolveDropTarget: resolveFakeTableDropTarget(game),
    handleIntent: fakeTableGestures(game),
    stackFromCard: fakeTableStackFromCard(game),
    cardBackKey: () => presentation.cardBackKey(),
    cardDeckId: () => presentation.cardDeckId(),
    onBackgroundColor: presentation.onBackgroundColor,
    onCardDeck: presentation.onCardDeck,
    reportCardDeckStatus: (status) => presentation.reportCardDeckStatus(status),
    onReset: (listener) => {
      const handler = () => listener();
      game.on("game-reset", handler);
      return () => game.off("game-reset", handler);
    },
    onCardsRelocated: (listener) => game.onCardsRelocated(listener),
    onReady,
  });
}
