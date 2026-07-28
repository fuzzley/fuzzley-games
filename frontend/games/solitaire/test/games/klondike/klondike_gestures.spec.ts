import { describe, it, expect, beforeEach } from "vitest";
import { KlondikeGame } from "@/games/klondike/klondike_game";
import {
  klondikeGestures,
  klondikeStackFromCard,
} from "@/games/klondike/klondike_gestures";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("klondikeGestures", () => {
  let game: KlondikeGame;
  let handle: IntentHandler;

  beforeEach(() => {
    game = new KlondikeGame();
    game.startNewGame();
    handle = klondikeGestures(game);
  });

  describe("activate", () => {
    it("draws when the top of the stock is pressed", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate", cardId: top.id });

      expect(game.waste.size).toBe(3);
    });

    it("does not draw when a buried stock card is pressed", () => {
      const buried = game.stock.getCards()[0];

      handle({ kind: "activate", cardId: buried.id });

      expect(game.waste.size).toBe(0);
    });

    it("does nothing when a tableau card is pressed", () => {
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

  describe("activate-secondary", () => {
    it("auto-moves a tableau card that has somewhere to go", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      handle({ kind: "activate-secondary", cardId: ace.id });

      expect(game.getPileContainingCard(ace.id)?.role).toBe("foundation");
    });

    it("auto-moves a waste card", () => {
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

  describe("activate-pile", () => {
    it("recycles the waste when the empty stock slot is pressed", () => {
      emptyBoard(game);
      relocate(game, "card-spades-ace", game.waste);

      handle({ kind: "activate-pile", pileId: game.stock.id });

      expect(game.stock.size).toBe(1);
    });

    it("does nothing when the stock still has cards", () => {
      const before = game.stock.size;

      handle({ kind: "activate-pile", pileId: game.stock.id });

      expect(game.stock.size).toBe(before);
    });

    it("does nothing for any other pile's slot", () => {
      handle({ kind: "activate-pile", pileId: game.tableaus[0].id });

      expect(game.state.moves).toBe(0);
    });
  });

  describe("drop", () => {
    it("moves the stack onto a pile that accepts it", () => {
      emptyBoard(game);
      const king = relocate(game, "card-spades-king", game.tableaus[0]);

      handle({
        kind: "drop",
        cardIds: [king.id],
        targetPileId: game.tableaus[1].id,
      });

      expect(game.getPileContainingCard(king.id)?.id).toBe(game.tableaus[1].id);
    });

    it("leaves the stack where it is when released over no pile", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "drop", cardIds: [card.id], targetPileId: null });

      expect(game.getPileContainingCard(card.id)?.id).toBe(game.tableaus[0].id);
    });

    it("leaves the stack where it is when the rules refuse the drop", () => {
      emptyBoard(game);
      const two = relocate(game, "card-spades-2", game.tableaus[0]);

      handle({
        kind: "drop",
        cardIds: [two.id],
        targetPileId: game.tableaus[1].id,
      });

      expect(game.getPileContainingCard(two.id)?.id).toBe(game.tableaus[0].id);
    });
  });
});

describe("klondikeStackFromCard", () => {
  let game: KlondikeGame;

  beforeEach(() => {
    game = new KlondikeGame();
    game.startNewGame();
  });

  it("takes the card and everything resting on it", () => {
    emptyBoard(game);
    const king = relocate(game, "card-spades-king", game.tableaus[0]);
    const queen = relocate(game, "card-hearts-queen", game.tableaus[0]);

    expect(klondikeStackFromCard(game)(king.id)).toEqual([king.id, queen.id]);
  });

  it("takes just the top card when nothing rests on it", () => {
    const top = game.tableaus[0].topCard!;

    expect(klondikeStackFromCard(game)(top.id)).toEqual([top.id]);
  });

  it("takes nothing for a card that is in no pile", () => {
    const card = game.tableaus[0].topCard!;
    game.tableaus[0].removeCard(card);

    expect(klondikeStackFromCard(game)(card.id)).toEqual([]);
  });
});
