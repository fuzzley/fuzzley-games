import {
  TableMetrics,
  measureTable,
} from "@/engine/render/layout/table_layout";
import {
  DragInteraction,
  PileGeometry,
  TableInteractionState,
  TableViewState,
  Viewport,
} from "@/engine/render/view/table_view_state";
import {
  buildTableViewState,
  resolveDragTarget,
} from "@/engine/tableau/view/table_view_builder";
import { TablePresentation } from "@/engine/render/presentation";
import { KLONDIKE_LAYOUT } from "./klondike_layout";
import { KlondikeGame } from "./klondike_game";

/** Measures the Klondike board for the given viewport. */
export function measureKlondikeBoard(viewport: Viewport): TableMetrics {
  return measureTable(KLONDIKE_LAYOUT, viewport);
}

/**
 * Draws a Klondike board for one frame.
 *
 * All this adds to the generic builder is which grid the board uses and which
 * card back the player picked; everything else the view needs is declared by
 * the zones.
 */
export function buildKlondikeViewState(
  game: KlondikeGame,
  presentation: TablePresentation,
): (interaction: TableInteractionState, viewport: Viewport) => TableViewState {
  return (interaction, viewport) =>
    buildTableViewState(game, interaction, measureKlondikeBoard(viewport), {
      cardBackKey: presentation.cardBackKey(),
    });
}

/**
 * Resolves the pile a drag would land on, for the Klondike board.
 *
 * The same answer the view builder previews with, so the border can never
 * promise a pile the drop then disagrees with.
 */
export function resolveKlondikeDropTarget(
  game: KlondikeGame,
): (drag: DragInteraction, viewport: Viewport) => PileGeometry | null {
  return (drag, viewport) =>
    resolveDragTarget(game, drag, measureKlondikeBoard(viewport));
}
