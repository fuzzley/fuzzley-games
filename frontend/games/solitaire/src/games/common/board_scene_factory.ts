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
import { pileBackgrounds } from "@/engine/tableau/view/pile_backgrounds";
import {
  buildTableViewState,
  resolveDragTarget,
} from "@/engine/tableau/view/table_view_builder";

/** Gives a board what it needs of the game it draws. */
export interface TableBoardOptions {
  /** The game to draw. */
  readonly game: TableGame;
  /** Where its piles sit. */
  readonly layout: TableLayoutSpec;
  /** What a press or a drop means in it. */
  readonly handleIntent: IntentHandler;
  /** How the player has asked the table to look. */
  readonly presentation: TablePresentation;
  /** Called once the scene has made its sprites and drawn its first frame. */
  readonly onReady?: () => void;
}

/** Builds the board scene that draws a table game. */
export function makeTableBoardScene(options: TableBoardOptions): BoardScene {
  const { game, layout, handleIntent, presentation, onReady } = options;
  const measure = (viewport: Viewport) => measureTable(layout, viewport);

  return new BoardScene({
    // Read from the game rather than from a deck specification, so a variant
    // that deals a different set of cards gets sprites for the ones it has.
    cardIds: game.cardIds,
    backgrounds: pileBackgrounds(game),
    layout,
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
    cardBackKey: () => presentation.cardBackKey(),
    cardDeckId: () => presentation.cardDeckId(),
    onBackgroundColor: presentation.onBackgroundColor,
    onCardDeck: presentation.onCardDeck,
    reportCardDeckStatus: (status) => presentation.reportCardDeckStatus(status),
    onReset: (listener) => {
      const handler = () => listener();
      game.on("game-reset", handler);
      return () => game.off("game-reset", handler);
    },
    onCardsRelocated: (listener) => game.onCardsRelocated(listener),
    onReady,
  });
}
