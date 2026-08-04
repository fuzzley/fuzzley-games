import { describe, it, expect, beforeEach } from "vitest";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { MAX_REDEALS, MontanaGame } from "@/games/montana/montana_game";
import { montanaGestures } from "@/games/montana/montana_gestures";
import { COLUMN_COUNT } from "@/games/montana/montana_rules";
import { REDEAL_PILE_ID } from "@/games/montana/montana_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("montanaGestures", () => {
  let game: MontanaGame;
  let handle: IntentHandler;

  beforeEach(() => {
    game = new MontanaGame();
    game.startNewGame();
    handle = montanaGestures(game);
  });

  const cell = (row: number, column: number) =>
    game.cells[row * COLUMN_COUNT + column];

  /*
   * The redeal marker is this game's only press, and the only way a player
   * reaches the redeal at all — there is no stock to click and no button in the
   * shell for it.
   */
  describe("activate-pile", () => {
    it("redeals when the marker is pressed", () => {
      handle({ kind: "activate-pile", pileId: REDEAL_PILE_ID });

      expect(game.redealsRemaining).toBe(MAX_REDEALS - 1);
    });

    it("does nothing for any other pile's slot", () => {
      handle({ kind: "activate-pile", pileId: cell(0, 0).id });

      expect(game.redealsRemaining).toBe(MAX_REDEALS);
    });

    it("stops redealing once they are spent", () => {
      for (let used = 0; used < MAX_REDEALS + 1; used++) {
        handle({ kind: "activate-pile", pileId: REDEAL_PILE_ID });
      }

      expect(game.redealsRemaining).toBe(0);
    });
  });

  describe("activate", () => {
    it("does nothing, since a single press has no meaning here", () => {
      const card = game.cells.find((pile) => !pile.isEmpty)!.topCard!;

      handle({ kind: "activate", cardId: card.id });

      expect(game.state.moves).toBe(0);
    });
  });

  describe("activate-secondary", () => {
    it("sends a card to the gap that wants it", () => {
      emptyBoard(game);
      relocate(game, "card-spades-5", cell(0, 0));
      const six = relocate(game, "card-spades-6", cell(2, 7));

      handle({ kind: "activate-secondary", cardId: six.id });

      expect(game.getPileContainingCard(six.id)?.id).toBe(cell(0, 1).id);
    });

    it("leaves a card where it is when no gap will take it", () => {
      emptyBoard(game);
      relocate(game, "card-spades-king", cell(0, 0));
      const three = relocate(game, "card-hearts-3", cell(2, 7));

      handle({ kind: "activate-secondary", cardId: three.id });

      expect(game.getPileContainingCard(three.id)?.id).toBe(cell(2, 7).id);
    });
  });

  describe("drop", () => {
    it("moves the card into a gap that accepts it", () => {
      emptyBoard(game);
      relocate(game, "card-spades-5", cell(0, 0));
      const six = relocate(game, "card-spades-6", cell(2, 7));

      handle({
        kind: "drop",
        cardIds: [six.id],
        targetPileId: cell(0, 1).id,
      });

      expect(game.getPileContainingCard(six.id)?.id).toBe(cell(0, 1).id);
    });

    it("leaves the card where it is when released over no pile", () => {
      const card = game.cells.find((pile) => !pile.isEmpty)!.topCard!;
      const before = game.getPileContainingCard(card.id)?.id;

      handle({ kind: "drop", cardIds: [card.id], targetPileId: null });

      expect(game.getPileContainingCard(card.id)?.id).toBe(before);
    });

    it("refuses a drop the rules reject", () => {
      emptyBoard(game);
      relocate(game, "card-spades-5", cell(0, 0));
      const seven = relocate(game, "card-spades-7", cell(2, 7));

      handle({
        kind: "drop",
        cardIds: [seven.id],
        targetPileId: cell(0, 1).id,
      });

      expect(game.getPileContainingCard(seven.id)?.id).toBe(cell(2, 7).id);
    });
  });
});
