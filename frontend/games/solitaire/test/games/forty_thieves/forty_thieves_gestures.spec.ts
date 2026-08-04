import { describe, it, expect, beforeEach } from "vitest";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { FortyThievesGame } from "@/games/forty_thieves/forty_thieves_game";
import { fortyThievesGestures } from "@/games/forty_thieves/forty_thieves_gestures";
import { FortyThievesVariant } from "@/games/forty_thieves/forty_thieves_rules";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("fortyThievesGestures", () => {
  let game: FortyThievesGame;
  let handle: IntentHandler;

  beforeEach(() => {
    game = new FortyThievesGame();
    game.startNewGame();
    handle = fortyThievesGestures(game);
  });

  describe("activate", () => {
    it("draws one card when the top of the stock is pressed", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate", cardId: top.id });

      expect(game.waste.size).toBe(1);
    });

    it("does not draw when a buried stock card is pressed", () => {
      const buried = game.stock.getCards()[0];

      handle({ kind: "activate", cardId: buried.id });

      expect(game.waste.size).toBe(0);
    });

    it("does nothing when a column card is pressed", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "activate", cardId: card.id });

      expect(game.state.moves).toBe(0);
    });

    it("throws for a card that is in no pile, which should never happen", () => {
      const card = game.tableaus[0].topCard!;
      game.tableaus[0].removeCard(card);

      expect(() => handle({ kind: "activate", cardId: card.id })).toThrow(
        "is not in a pile",
      );
    });
  });

  /*
   * The gesture-level half of the family's defining rule. Klondike's map
   * recycles the waste here; there is nothing to recycle into, so an empty
   * stock's slot must stay inert.
   */
  describe("activate-pile", () => {
    it("does not recycle the waste when the empty stock slot is pressed", () => {
      emptyBoard(game);
      relocate(game, "card-spades-ace", game.waste);

      handle({ kind: "activate-pile", pileId: game.stock.id });

      expect(game.stock.isEmpty).toBe(true);
    });

    it("leaves the waste untouched by that press", () => {
      emptyBoard(game);
      relocate(game, "card-spades-ace", game.waste);

      handle({ kind: "activate-pile", pileId: game.stock.id });

      expect(game.waste.size).toBe(1);
    });

    it("does nothing for any other pile's slot", () => {
      handle({ kind: "activate-pile", pileId: game.tableaus[0].id });

      expect(game.state.moves).toBe(0);
    });
  });

  describe("activate-secondary", () => {
    it("auto-moves a column card that has somewhere to go", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      handle({ kind: "activate-secondary", cardId: ace.id });

      expect(game.getPileContainingCard(ace.id)?.role).toBe("foundation");
    });

    it("auto-moves the waste card", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-hearts-ace", game.waste);

      handle({ kind: "activate-secondary", cardId: ace.id });

      expect(game.getPileContainingCard(ace.id)?.role).toBe("foundation");
    });

    it("never auto-moves a stock card", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate-secondary", cardId: top.id });

      expect(game.getPileContainingCard(top.id)?.id).toBe(game.stock.id);
    });

    it("leaves the card where it is when it has nowhere to go", () => {
      emptyBoard(game);
      const two = relocate(game, "card-spades-2", game.tableaus[0]);

      handle({ kind: "activate-secondary", cardId: two.id });

      expect(game.getPileContainingCard(two.id)?.id).toBe(game.tableaus[0].id);
    });
  });

  describe("drop", () => {
    it("moves the card onto a pile that accepts it", () => {
      emptyBoard(game);
      const nine = relocate(game, "card-spades-9", game.tableaus[0]);
      relocate(game, "card-spades-10", game.tableaus[1]);

      handle({
        kind: "drop",
        cardIds: [nine.id],
        targetPileId: game.tableaus[1].id,
      });

      expect(game.getPileContainingCard(nine.id)?.id).toBe(game.tableaus[1].id);
    });

    it("leaves the card where it is when released over no pile", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "drop", cardIds: [card.id], targetPileId: null });

      expect(game.getPileContainingCard(card.id)?.id).toBe(game.tableaus[0].id);
    });

    it("leaves the card where it is when the rules refuse the drop", () => {
      emptyBoard(game);
      const two = relocate(game, "card-spades-2", game.tableaus[0]);
      relocate(game, "card-hearts-10", game.tableaus[1]);

      handle({
        kind: "drop",
        cardIds: [two.id],
        targetPileId: game.tableaus[1].id,
      });

      expect(game.getPileContainingCard(two.id)?.id).toBe(game.tableaus[0].id);
    });
  });

  describe("under Josephine", () => {
    it("drops a whole same-suit run the variant allows", () => {
      const josephine = new FortyThievesGame(
        undefined,
        undefined,
        FortyThievesVariant.JOSEPHINE,
      );
      josephine.startNewGame();
      emptyBoard(josephine);
      const nine = relocate(josephine, "card-spades-9", josephine.tableaus[0]);
      relocate(josephine, "card-spades-8", josephine.tableaus[0]);
      relocate(josephine, "card-spades-10", josephine.tableaus[1]);

      fortyThievesGestures(josephine)({
        kind: "drop",
        cardIds: [nine.id],
        targetPileId: josephine.tableaus[1].id,
      });

      expect(josephine.getPileContainingCard(nine.id)?.id).toBe(
        josephine.tableaus[1].id,
      );
    });
  });
});
