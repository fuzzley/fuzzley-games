import { IntentHandler } from "@/engine/render/input/table_intents";
import {
  TableLayoutSpec,
  measureTable,
} from "@/engine/render/layout/table_layout";
import { BoardScene } from "@/engine/render/phaser/board_scene";
import { TablePresentation } from "@/engine/render/presentation";
import { Viewport } from "@/engine/render/view/table_view_state";
import { TableGame } from "@/engine/tableau/table_game";
import { stackFromCard } from "@/engine/tableau/view/grabbable_stack";
import {
  buildTableViewState,
  resolveDragTarget,
} from "@/engine/tableau/view/table_view_builder";

/** What a board needs of the game it draws, beyond the board itself. */
export interface TableBoardOptions {
  /** The game to draw. */
  readonly game: TableGame;
  /** Where its piles sit. */
  readonly layout: TableLayoutSpec;
  /** What a press or a drop means in it. */
  readonly handleIntent: IntentHandler;
  /** How the player has asked the table to look. */
  readonly presentation: TablePresentation;
  /** Optional callback fired when the board scene finishes initial sprite setup. */
  readonly onReady?: () => void;
}

/**
 * Builds the board scene that draws a table game.
 *
 * Every game's board was the same four functions closing over a different
 * layout, game and gesture map — measure the grid, build a frame, resolve a
 * drop, hand the lot to a {@link BoardScene}. A game supplies the three things
 * that actually differ and the engine does the rest.
 *
 * Takes any {@link TableGame} rather than a particular game class: a board
 * follows new deals and nothing else, and every table game announces those.
 */
export function makeTableBoardScene(options: TableBoardOptions): BoardScene {
  const { game, layout, handleIntent, presentation, onReady } = options;
  const measure = (viewport: Viewport) => measureTable(layout, viewport);

  return new BoardScene({
    game,
    // Read from the game rather than from a deck specification, so a variant
    // that deals a different set of cards gets sprites for the ones it has.
    cardIds: game.cardIds,
    layout,
    buildViewState: (interaction, viewport) =>
      buildTableViewState(game, interaction, measure(viewport), {
        cardBackKey: presentation.cardBackKey(),
      }),
    resolveDropTarget: (drag, viewport) =>
      resolveDragTarget(game, drag, measure(viewport)),
    handleIntent,
    stackFromCard: stackFromCard(game),
    cardBackKey: () => presentation.cardBackKey(),
    cardDeckId: () => presentation.cardDeckId(),
    onBackgroundColor: presentation.onBackgroundColor,
    onCardDeck: presentation.onCardDeck,
    onReset: (listener) => {
      const handler = () => listener();
      game.on("game-reset", handler);
      return () => game.off("game-reset", handler);
    },
    onCardsRelocated: (listener) => game.onCardsRelocated(listener),
    onReady,
  });
}
