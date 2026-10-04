import { IntentHandler } from "@/engine/render/input/table_intents";
import {
  BoardLayouts,
  chooseTableLayout,
} from "@/engine/render/layout/board_layouts";
import { formFactorOf } from "@/engine/render/layout/form_factor";
import { measureTable } from "@/engine/render/layout/table_layout";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { Insets, Viewport } from "@/engine/render/view/table_view_state";
import { TableGame } from "@/engine/tableau/table_game";
import { stackFromCard } from "@/engine/tableau/view/grabbable_stack";
import { pileBackgrounds } from "@/engine/tableau/view/pile_backgrounds";
import {
  buildTableViewState,
  resolveDragTarget,
} from "@/engine/tableau/view/table_view_builder";

/** Gives a board what it needs of the game it draws. */
export interface TableBoardOptions {
  /** The game to draw. */
  readonly game: TableGame;
  /** The grids its piles may sit on, one of which each frame is drawn on. */
  readonly layouts: BoardLayouts;
  /** What a press or a drop means in it. */
  readonly handleIntent: IntentHandler;
  /** How the player has asked the table to look. */
  readonly presentation: TablePresentation;
  /** Called once the scene has made its sprites and drawn its first frame. */
  readonly onReady?: () => void;
  /**
   * Returns how far in from each edge of the canvas whatever the shell lays
   * over it reaches, in CSS pixels; none when omitted.
   */
  readonly insets?: () => Insets;
}

/** Builds the board scene that draws a table game. */
export function makeTableBoardScene(options: TableBoardOptions): BoardScene {
  const { game, layouts, handleIntent, presentation, onReady, insets } =
    options;
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
    onReset: (listener) => game.on("game-reset", () => listener()),
    onCardsRelocated: (listener) => game.onCardsRelocated(listener),
    onReady,
    insets,
  });
}
