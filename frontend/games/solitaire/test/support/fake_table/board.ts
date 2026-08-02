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
import { stackFromCard } from "@/engine/tableau/view/grabbable_stack";
import {
  buildTableViewState,
  resolveDragTarget,
} from "@/engine/tableau/view/table_view_builder";
import { FakeTableGame, DEFAULT_DRAW_COUNT } from "./game";
import { FakeRole, TABLEAU_COUNT, fakeZoneSpecs } from "./zones";

/*
 * Deliberately free of Phaser, and of anything that imports it.
 *
 * The layout maths, the view state and the drop resolver are all renderer
 * agnostic, and the specs that exercise them run without a canvas and without a
 * Phaser mock. Importing `BoardScene` here would drag the whole engine into
 * every one of them, which is how this file first broke them. The scene lives
 * next door in `scene.ts` for exactly that reason.
 */

/**
 * The grid the fake board lies on.
 *
 * Seven columns and two rows, with the slots taken from the zone specs rather
 * than restated, so a pile cannot be declared in one place and positioned in
 * another. The design height reserves room below the grid for a column fanned
 * deeper than its row.
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
    buildTableViewState(game, interaction, measureFakeTable(viewport), {
      cardBackKey: presentation.cardBackKey(),
    });
}

/** Resolves the pile a drag would land on, for the fake board. */
export function resolveFakeTableDropTarget(
  game: FakeTableGame,
): (drag: DragInteraction, viewport: Viewport) => PileGeometry | null {
  return (drag, viewport) =>
    resolveDragTarget(game, drag, measureFakeTable(viewport));
}

/**
 * What a press or a drop means on the fake board.
 *
 * Pressing the top of the stock draws; pressing the empty stock recycles;
 * double-pressing a card in a column or the waste sends it wherever it will go.
 * Enough shape for the input tests to have something to assert against.
 */
export function fakeTableGestures(game: FakeTableGame): IntentHandler {
  return (intent) => {
    switch (intent.kind) {
      case "activate": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (!pile) {
          throw new Error(`Card ${intent.cardId} is not in a pile`);
        }
        if (
          pile.role === FakeRole.STOCK &&
          pile.topCard?.id === intent.cardId
        ) {
          game.drawCardsFromStock();
        }
        return;
      }

      case "activate-secondary": {
        const pile = game.getPileContainingCard(intent.cardId);
        if (pile?.role === FakeRole.TABLEAU || pile?.role === FakeRole.WASTE) {
          game.autoMoveCard(intent.cardId);
        }
        return;
      }

      case "activate-pile": {
        if (intent.pileId === game.stock.id && game.stock.isEmpty) {
          game.drawCardsFromStock();
        }
        return;
      }

      case "drop": {
        const [primaryCardId] = intent.cardIds;
        if (intent.targetPileId && primaryCardId) {
          game.moveCardToPile(primaryCardId, intent.targetPileId);
        }
        return;
      }
    }
  };
}

/** The cards a drag of the given card picks up. */
export function fakeTableStackFromCard(
  game: FakeTableGame,
): (cardId: string) => readonly string[] {
  return stackFromCard(game);
}
