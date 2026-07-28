import { BoardScene } from "@/engine/render/phaser/board_scene";
import { deckCardIds } from "@/engine/core/card/deck";
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
import { SPIDER_LAYOUT } from "./spider_layout";
import { SPIDER_TWO_DECKS } from "./spider_deal";
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
 * The card list is 104 long rather than 52, which is the only line here that
 * differs in kind from the other two games.
 */
export function makeSpiderBoardScene(
  game: SpiderGame,
  presentation: TablePresentation,
): BoardScene {
  return new BoardScene({
    game,
    cardIds: deckCardIds(SPIDER_TWO_DECKS).map(playingCardInstanceId),
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
