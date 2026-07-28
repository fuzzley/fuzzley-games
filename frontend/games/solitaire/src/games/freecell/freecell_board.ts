import { BoardScene } from "@/engine/render/phaser/board_scene";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { playingCardInstanceId } from "@/engine/core/card/playing_card";
import { TablePresentation } from "@/engine/render/presentation";
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
import { FREECELL_LAYOUT } from "./freecell_layout";
import { FreeCellGame } from "./freecell_game";
import { freeCellGestures, freeCellStackFromCard } from "./freecell_gestures";

/** Measures the FreeCell board for the given viewport. */
export function measureFreeCellBoard(viewport: Viewport): TableMetrics {
  return measureTable(FREECELL_LAYOUT, viewport);
}

/** Draws a FreeCell board for one frame. */
export function buildFreeCellViewState(
  game: FreeCellGame,
  presentation: TablePresentation,
): (interaction: TableInteractionState, viewport: Viewport) => TableViewState {
  return (interaction, viewport) =>
    buildTableViewState(game, interaction, measureFreeCellBoard(viewport), {
      cardBackKey: presentation.cardBackKey(),
    });
}

/** Resolves the pile a drag would land on, for the FreeCell board. */
export function resolveFreeCellDropTarget(
  game: FreeCellGame,
): (drag: DragInteraction, viewport: Viewport) => PileGeometry | null {
  return (drag, viewport) =>
    resolveDragTarget(game, drag, measureFreeCellBoard(viewport));
}

/**
 * Builds the FreeCell board scene.
 *
 * The same shape as Klondike's, which is the point: a game supplies its cards,
 * its grid, its gestures and its look, and the engine does the rest.
 */
export function makeFreeCellBoardScene(
  game: FreeCellGame,
  presentation: TablePresentation,
): BoardScene {
  return new BoardScene({
    game,
    cardIds: ALL_PLAYING_CARD_IDS.map(playingCardInstanceId),
    layout: FREECELL_LAYOUT,
    buildViewState: buildFreeCellViewState(game, presentation),
    resolveDropTarget: resolveFreeCellDropTarget(game),
    handleIntent: freeCellGestures(game),
    stackFromCard: freeCellStackFromCard(game),
    cardBackKey: () => presentation.cardBackKey(),
    onBackgroundColor: presentation.onBackgroundColor,
    onReset: (listener) => {
      const handler = () => listener();
      game.on("game-reset", handler);
      return () => game.off("game-reset", handler);
    },
  });
}
