import { describe, it, expect, beforeEach } from "vitest";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { EasthavenGame } from "@/games/easthaven/easthaven_game";
import { easthavenGestures } from "@/games/easthaven/easthaven_gestures";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("easthavenGestures", () => {
  let game: EasthavenGame;
  let handle: IntentHandler;

  beforeEach(() => {
    game = new EasthavenGame();
    game.startNewGame();
    handle = easthavenGestures(game);
  });

  describe("activate", () => {
    it("deals a row when the stock is pressed", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate", cardId: top.id });

      expect(game.stock.size).toBe(24);
    });

    /*
     * The gesture-level half of Easthaven's hardest rule: a press on the stock
     * is simply refused while a column stands empty, rather than dealing into
     * the space.
     */
    it("refuses to deal while a column is empty", () => {
      game.tableaus[0].clear();
      const top = game.stock.topCard!;

      handle({ kind: "activate", cardId: top.id });

      expect(game.stock.size).toBe(31);
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
    it("sends a column card to a foundation", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      handle({ kind: "activate-secondary", cardId: ace.id });

      expect(game.getPileContainingCard(ace.id)?.role).toBe("foundation");
    });

    it("never auto-moves a stock card", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate-secondary", cardId: top.id });

      expect(game.getPileContainingCard(top.id)?.id).toBe(game.stock.id);
    });

    it("leaves a foundation card where it is", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.foundations[0]);

      handle({ kind: "activate-secondary", cardId: ace.id });

      expect(game.getPileContainingCard(ace.id)?.id).toBe(
        game.foundations[0].id,
      );
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

      expect(game.getPileContainingCard(nine.id)?.id).toBe(
        game.tableaus[1].id,
      );
    });

    it("leaves the run where it is when released over no pile", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "drop", cardIds: [card.id], targetPileId: null });

      expect(game.getPileContainingCard(card.id)?.id).toBe(
        game.tableaus[0].id,
      );
    });
  });
});
