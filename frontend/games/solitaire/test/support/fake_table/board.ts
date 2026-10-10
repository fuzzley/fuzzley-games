import {
  TableMetrics,
  measureTable,
  tableLayout,
} from "@/engine/render/layout/table_layout";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { TablePresentation } from "@/engine/render/presentation";
import {
  DragInteraction,
  PileGeometry,
  TableInteractionState,
  TableViewState,
  Viewport,
} from "@/engine/render/view/table_view_state";
import { drawOnStockTop } from "@/engine/tableau/gestures/press_handlers";
import { tableGestures } from "@/engine/tableau/gestures/table_gestures";
import { stackFromCard, resolveDragTarget } from "@/engine/tableau/view/drag";
import { buildTableViewState } from "@/engine/tableau/view/table_view_builder";
import { FakeTableGame, DEFAULT_DRAW_COUNT } from "./game";
import { FakeRole, TABLEAU_COUNT, fakeZoneSpecs } from "./zones";

/*
 * Deliberately free of Phaser, so the specs using it run without a canvas; the
 * scene lives in `scene.ts`.
 */

/**
 * The grid the fake board lies on: seven columns by two rows, with room below
 * for a fanned column.
 */
export const FAKE_TABLE_LAYOUT = tableLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  slots: fakeZoneSpecs(DEFAULT_DRAW_COUNT).map((zone) => zone.slot),
  designHeightPx: 950,
});

/** Measures the fake board for the given viewport. */
export function measureFakeTable(viewport: Viewport): TableMetrics {
  return measureTable(FAKE_TABLE_LAYOUT, viewport);
}

/** Draws the fake board for one frame. */
export function buildFakeTableViewState(
  game: FakeTableGame,
  presentation: TablePresentation,
): (interaction: TableInteractionState, viewport: Viewport) => TableViewState {
  return (interaction, viewport) =>
    buildTableViewState(
      game,
      interaction,
      measureFakeTable(viewport),
      presentation.cardBackKey(),
    );
}

/** Resolves the pile a drag would land on, for the fake board. */
export function resolveFakeTableDropTarget(
  game: FakeTableGame,
): (drag: DragInteraction, viewport: Viewport) => PileGeometry | null {
  return (drag, viewport) =>
    resolveDragTarget(game, drag, measureFakeTable(viewport));
}

/**
 * Returns what a press or a drop means on the fake board, where pressing the
 * stock draws and pressing it empty recycles.
 */
export function fakeTableGestures(game: FakeTableGame): IntentHandler {
  return tableGestures(game, {
    onCardPress: drawOnStockTop(FakeRole.STOCK, () =>
      game.drawCardsFromStock(),
    ),
    onPilePress: (pileId) => {
      if (pileId === game.stock.id && game.stock.isEmpty) {
        game.drawCardsFromStock();
      }
    },
    autoMoveFrom: [FakeRole.TABLEAU, FakeRole.WASTE],
  });
}

/** Returns the cards a drag of the given card picks up. */
export function fakeTableStackFromCard(
  game: FakeTableGame,
): (cardId: string) => readonly string[] {
  return stackFromCard(game);
}
