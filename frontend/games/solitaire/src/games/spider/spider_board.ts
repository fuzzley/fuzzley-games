import { BoardScene } from "@/engine/render/phaser/board_scene";
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
import { SPIDER_LAYOUT } from "./spider_layout";
import { SpiderGame } from "./spider_game";
import { spiderGestures, spiderStackFromCard } from "./spider_gestures";

/** Measures the Spider board for the given viewport. */
export function measureSpiderBoard(viewport: Viewport): TableMetrics {
  return measureTable(SPIDER_LAYOUT, viewport);
}

/** Draws a Spider board for one frame. */
export function buildSpiderViewState(
  game: SpiderGame,
  presentation: TablePresentation,
): (interaction: TableInteractionState, viewport: Viewport) => TableViewState {
  return (interaction, viewport) =>
    buildTableViewState(game, interaction, measureSpiderBoard(viewport), {
      cardBackKey: presentation.cardBackKey(),
    });
}

/** Resolves the pile a drag would land on, for the Spider board. */
export function resolveSpiderDropTarget(
  game: SpiderGame,
): (drag: DragInteraction, viewport: Viewport) => PileGeometry | null {
  return (drag, viewport) =>
    resolveDragTarget(game, drag, measureSpiderBoard(viewport));
}

/**
 * Builds the Spider board scene.
 *
 * Identical in shape to the other two: the card list comes from the game, so a
 * one-suit Spider makes sprites for its eight copies of each spade rather than
 * for a deck the board assumed it was playing with.
 */
export function makeSpiderBoardScene(
  game: SpiderGame,
  presentation: TablePresentation,
): BoardScene {
  return new BoardScene({
    game,
    cardIds: game.cardIds,
    layout: SPIDER_LAYOUT,
    buildViewState: buildSpiderViewState(game, presentation),
    resolveDropTarget: resolveSpiderDropTarget(game),
    handleIntent: spiderGestures(game),
    stackFromCard: spiderStackFromCard(game),
    cardBackKey: () => presentation.cardBackKey(),
    onBackgroundColor: presentation.onBackgroundColor,
    onReset: (listener) => {
      const handler = () => listener();
      game.on("game-reset", handler);
      return () => game.off("game-reset", handler);
    },
  });
}
