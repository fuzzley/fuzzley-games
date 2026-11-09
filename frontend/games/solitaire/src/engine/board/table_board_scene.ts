import type { IntentHandler } from "@/engine/render/input/table_intents";
import {
  type BoardLayouts,
  chooseTableLayout,
} from "@/engine/render/layout/board_layouts";
import { formFactorOf } from "@/engine/render/layout/form_factor";
import { measureTable } from "@/engine/render/layout/table_metrics";
import {
  BoardScene,
  type BoardSceneOptions,
} from "@/engine/render/phaser/scene/board_scene";
import type { TablePresentation } from "@/engine/render/view/presentation";
import type { Viewport } from "@/engine/render/layout/viewport";
import type { TableGame } from "@/engine/tableau/game/table_game";
import { stackFromCard, resolveDragTarget } from "@/engine/tableau/view/drag";
import { pileBackgrounds } from "@/engine/tableau/view/pile_backgrounds";
import { buildTableViewState } from "@/engine/tableau/view/table_view_builder";

/**
 * Gives a board what it needs of the game it draws, and the hooks the shell
 * hands its scene.
 */
export interface TableBoardOptions extends Pick<
  BoardSceneOptions,
  "onReady" | "insets"
> {
  /** The game to draw. */
  readonly game: TableGame;
  /** The grids its piles may sit on, one of which each frame is drawn on. */
  readonly layouts: BoardLayouts;
  /** What a press or a drop means in it. */
  readonly handleIntent: IntentHandler;
  /** How the player has asked the table to look. */
  readonly presentation: TablePresentation;
}

/** Builds the board scene that draws a table game. */
export function makeTableBoardScene(options: TableBoardOptions): BoardScene {
  const { game, layouts, handleIntent, presentation, ...hooks } = options;
  // Chosen afresh each frame, so turning the phone or changing the arrangement
  // moves the cards to their new places the way any move does.
  const measure = (viewport: Viewport) =>
    measureTable(
      chooseTableLayout(
        layouts,
        formFactorOf(viewport),
        presentation.boardArrangement(),
      ),
      viewport,
    );

  return new BoardScene({
    // Read from the game rather than from a deck specification, so a variant
    // that deals a different set of cards gets sprites for the ones it has.
    cardIds: game.cardIds,
    backgrounds: pileBackgrounds(game),
    layout: layouts.roomy,
    measure,
    buildViewState: (interaction, viewport) =>
      buildTableViewState(
        game,
        interaction,
        measure(viewport),
        presentation.cardBackKey(),
      ),
    resolveDropTarget: (drag, viewport) =>
      resolveDragTarget(game, drag, measure(viewport)),
    handleIntent,
    stackFromCard: stackFromCard(game),
    presentation,
    onReset: (listener) =>
      game.on("game-reset", () => {
        listener();
      }),
    onCardsRelocated: (listener) => game.onCardsRelocated(listener),
    ...hooks,
  });
}
