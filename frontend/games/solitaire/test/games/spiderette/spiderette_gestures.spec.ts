import { describe, it, expect, beforeEach } from "vitest";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { SpideretteGame } from "@/games/spiderette/spiderette_game";
import { spideretteGestures } from "@/games/spiderette/spiderette_gestures";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("spideretteGestures", () => {
  let game: SpideretteGame;
  let handle: IntentHandler;

  beforeEach(() => {
    game = new SpideretteGame();
    game.startNewGame();
    handle = spideretteGestures(game);
  });

  describe("activate", () => {
    it("deals a row when the stock is pressed", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate", cardId: top.id });

      expect(game.stock.size).toBe(17);
    });

    it("does nothing when a column card is pressed", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "activate", cardId: card.id });

      expect(game.state.moves).toBe(0);
    });

    it("does nothing for a card that is in no pile", () => {
      const card = game.tableaus[0].topCard!;
      game.tableaus[0].removeCard(card);

      handle({ kind: "activate", cardId: card.id });

      expect(game.state.moves).toBe(0);
    });
  });

  describe("activate-pile", () => {
    it("does nothing, since an empty stock has nothing left to deal", () => {
      handle({ kind: "activate-pile", pileId: game.stock.id });

      expect(game.state.moves).toBe(0);
    });
  });

  describe("activate-secondary", () => {
    it("auto-moves a column card that has somewhere to go", () => {
      emptyBoard(game);
      const nine = relocate(game, "card-spades-9", game.tableaus[0]);
      relocate(game, "card-hearts-10", game.tableaus[1]);

      handle({ kind: "activate-secondary", cardId: nine.id });

      expect(game.getPileContainingCard(nine.id)?.id).toBe(game.tableaus[1].id);
    });

    it("never auto-moves a stock card", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate-secondary", cardId: top.id });

      expect(game.getPileContainingCard(top.id)?.id).toBe(game.stock.id);
    });
  });

  describe("drop", () => {
    it("moves the run onto a column that accepts it", () => {
      emptyBoard(game);
      const nine = relocate(game, "card-spades-9", game.tableaus[0]);
      relocate(game, "card-hearts-10", game.tableaus[1]);

      handle({
        kind: "drop",
        cardIds: [nine.id],
        targetPileId: game.tableaus[1].id,
      });

      expect(game.getPileContainingCard(nine.id)?.id).toBe(game.tableaus[1].id);
    });

    it("leaves the run where it is when released over no pile", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "drop", cardIds: [card.id], targetPileId: null });

      expect(game.getPileContainingCard(card.id)?.id).toBe(game.tableaus[0].id);
    });
  });
});
