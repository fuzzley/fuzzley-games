import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { pileBackgrounds } from "@/engine/tableau/view/pile_backgrounds";
import {
  FAKE_TABLE_LAYOUT,
  buildFakeTableViewState,
  fakeTableGestures,
  fakeTableStackFromCard,
  resolveFakeTableDropTarget,
} from "./board";
import { FakeTableGame } from "./game";

/** Builds the Phaser board scene that draws the fake game. */
export function makeFakeTableBoardScene(
  game: FakeTableGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return new BoardScene({
    cardIds: game.cardIds,
    backgrounds: pileBackgrounds(game),
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
    onReset: (listener) => game.on("game-reset", () => listener()),
    onCardsRelocated: (listener) => game.onCardsRelocated(listener),
    onReady,
  });
}
