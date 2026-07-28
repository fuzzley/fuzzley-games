import { describe, it, expect, beforeEach } from "vitest";
import { SolitaireGame } from "@/games/klondike/solitaire_game";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { emptyBoard, relocate } from "@test/support/game_scenarios";

describe("SolitaireGame undo", () => {
  let game: SolitaireGame;

  beforeEach(() => {
    game = new SolitaireGame();
    game.settings.setDrawCount(3);
    game.startNewGame();
  });

  /** The ids in a pile, bottom-first, paired with their face-up state. */
  function snapshot(pileId: string): { id: string; faceUp: boolean }[] {
    return game
      .getPileById(pileId)!
      .getCards()
      .map((card) => ({ id: card.id, faceUp: card.faceUp }));
  }

  describe("with no history", () => {
    it("reports nothing to undo on a fresh deal", () => {
      expect(game.canUndo).toBe(false);
    });

    it("does nothing when asked to undo", () => {
      expect(game.undo()).toBe(false);
    });
  });

  describe("a stock draw", () => {
    it("returns the drawn cards to the stock in their original order", () => {
      const before = snapshot(game.stock.id);

      game.drawCardsFromStock();
      game.undo();

      expect(snapshot(game.stock.id)).toEqual(before);
    });

    it("empties the waste again", () => {
      game.drawCardsFromStock();

      game.undo();

      expect(game.waste.isEmpty).toBe(true);
    });

    it("turns the drawn cards back face down", () => {
      game.drawCardsFromStock();

      game.undo();

      expect(game.stock.getCards().every((card) => !card.faceUp)).toBe(true);
    });

    it("takes the move back off the counter", () => {
      game.drawCardsFromStock();

      game.undo();

      expect(game.state.moves).toBe(0);
    });
  });

  describe("a waste recycle", () => {
    beforeEach(() => {
      // Drain the stock into the waste so the next draw recycles.
      while (!game.stock.isEmpty) {
        game.drawCardsFromStock();
      }
    });

    it("returns every card to the waste in its original order", () => {
      const before = snapshot(game.waste.id);

      game.drawCardsFromStock();
      game.undo();

      expect(snapshot(game.waste.id)).toEqual(before);
    });

    it("empties the stock again", () => {
      game.drawCardsFromStock();

      game.undo();

      expect(game.stock.isEmpty).toBe(true);
    });

    /**
     * Recycles the waste back into the stock, then drains it into the waste
     * again, leaving the board as this suite's beforeEach found it.
     */
    function recycleAndDrain(): void {
      game.drawCardsFromStock(); // stock is empty, so this recycles
      while (!game.stock.isEmpty) {
        game.drawCardsFromStock();
      }
    }

    /** The Draw 3 penalty, charged from the fourth recycle onward. */
    const DRAW_THREE_PENALTY = 20;

    it("restores the score the recycle penalty took", () => {
      game.state.score = 500;
      for (let i = 0; i < 3; i++) recycleAndDrain(); // the free recycles
      const scoreBefore = game.state.score;
      game.drawCardsFromStock(); // the fourth recycle, the first that costs
      const afterPenalty = game.state.score;

      game.undo();

      expect([afterPenalty, game.state.score]).toEqual([
        scoreBefore - DRAW_THREE_PENALTY,
        scoreBefore,
      ]);
    });

    it("charges a redone recycle the same penalty as the undone one", () => {
      game.state.score = 500;
      for (let i = 0; i < 3; i++) recycleAndDrain();
      game.drawCardsFromStock(); // the fourth recycle
      const afterFourth = game.state.score;

      game.undo();
      game.drawCardsFromStock();

      // Undo rolled the recycle count back, so this is the fourth again.
      expect(game.state.score).toBe(afterFourth);
    });
  });

  describe("a tableau move", () => {
    it("puts the moved stack back where it came from", () => {
      emptyBoard(game);
      const king = relocate(game, "card-spades-king", game.tableaus[0]);
      const queen = relocate(game, "card-hearts-queen", game.tableaus[1]);
      const before = snapshot(game.tableaus[1].id);

      expect(game.moveCardToPile(queen.id, game.tableaus[0].id)).toBe(true);
      game.undo();

      expect(snapshot(game.tableaus[1].id)).toEqual(before);
      expect(game.tableaus[0].getCards()).toEqual([king]);
    });

    it("takes back a whole multi-card stack", () => {
      emptyBoard(game);
      relocate(game, "card-spades-king", game.tableaus[0]);
      const queen = relocate(game, "card-hearts-queen", game.tableaus[1]);
      const jack = relocate(game, "card-spades-jack", game.tableaus[1]);

      game.moveCardToPile(queen.id, game.tableaus[0].id);
      game.undo();

      expect(game.tableaus[1].getCards()).toEqual([queen, jack]);
    });

    it("turns a card the move exposed back face down", () => {
      emptyBoard(game);
      const hidden = relocate(game, "card-clubs-4", game.tableaus[1], false);
      const queen = relocate(game, "card-hearts-queen", game.tableaus[1]);
      relocate(game, "card-spades-king", game.tableaus[0]);

      game.moveCardToPile(queen.id, game.tableaus[0].id);
      expect(hidden.faceUp).toBe(true); // the move flipped it

      game.undo();

      expect(hidden.faceUp).toBe(false);
    });

    it("takes back the flip bonus along with the move score", () => {
      emptyBoard(game);
      relocate(game, "card-clubs-4", game.tableaus[1], false);
      const queen = relocate(game, "card-hearts-queen", game.tableaus[1]);
      relocate(game, "card-spades-king", game.tableaus[0]);
      const scoreBefore = game.state.score;

      game.moveCardToPile(queen.id, game.tableaus[0].id);
      game.undo();

      expect(game.state.score).toBe(scoreBefore);
    });
  });

  describe("a foundation move", () => {
    it("restores the score it awarded", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-hearts-ace", game.tableaus[0]);
      const scoreBefore = game.state.score;

      game.moveCardToPile(ace.id, game.foundations[0].id);
      game.undo();

      expect(game.state.score).toBe(scoreBefore);
    });

    it("leaves the foundation empty again", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-hearts-ace", game.tableaus[0]);

      game.moveCardToPile(ace.id, game.foundations[0].id);
      game.undo();

      expect(game.foundations[0].isEmpty).toBe(true);
    });

    it("does not drive the score below zero when taking back a penalty", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-hearts-ace", game.foundations[0]);
      relocate(game, "card-spades-king", game.tableaus[0]);
      game.state.score = 0;

      // Pulling a card off a foundation costs 15, which clamps at zero.
      game.moveCardToPile(ace.id, game.tableaus[1].id);
      game.undo();

      expect(game.state.score).toBe(0);
    });
  });

  describe("across several actions", () => {
    it("unwinds them one at a time, most recent first", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-hearts-ace", game.tableaus[0]);
      const two = relocate(game, "card-hearts-2", game.tableaus[1]);
      game.moveCardToPile(ace.id, game.foundations[0].id);
      game.moveCardToPile(two.id, game.foundations[0].id);

      game.undo();

      expect(game.foundations[0].getCards()).toEqual([ace]);
      expect(game.tableaus[1].getCards()).toEqual([two]);
    });

    it("runs out once every action has been taken back", () => {
      game.drawCardsFromStock();
      game.drawCardsFromStock();

      game.undo();
      game.undo();

      expect(game.canUndo).toBe(false);
    });

    it("publishes the remaining depth as actions are applied and undone", () => {
      game.drawCardsFromStock();
      game.drawCardsFromStock();
      const afterTwo = game.state.undoDepth;

      game.undo();

      expect([afterTwo, game.state.undoDepth]).toEqual([2, 1]);
    });
  });

  describe("a new deal", () => {
    it("leaves nothing to undo", () => {
      game.drawCardsFromStock();

      game.startNewGame();

      expect(game.canUndo).toBe(false);
    });

    it("publishes a depth of zero", () => {
      game.drawCardsFromStock();

      game.restartGame();

      expect(game.state.undoDepth).toBe(0);
    });
  });

  describe("interaction rules after an undo", () => {
    it("makes a returned card draggable again", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-hearts-ace", game.tableaus[0]);
      game.moveCardToPile(ace.id, game.foundations[0].id);

      game.undo();

      expect(game.isCardDraggable(ace)).toBe(true);
    });

    it("keeps a re-hidden card unplayable", () => {
      emptyBoard(game);
      const hidden = relocate(game, "card-clubs-4", game.tableaus[1], false);
      const queen = relocate(game, "card-hearts-queen", game.tableaus[1]);
      relocate(game, "card-spades-king", game.tableaus[0]);
      game.moveCardToPile(queen.id, game.tableaus[0].id);

      game.undo();

      expect(game.isCardInteractable(hidden)).toBe(false);
    });
  });

  describe("a deck-order guarantee", () => {
    it("returns the board to an identical state after undoing everything", () => {
      const pileIds = [
        game.stock.id,
        game.waste.id,
        ...game.foundations.map((pile) => pile.id),
        ...game.tableaus.map((pile) => pile.id),
      ];
      const before = pileIds.map((pileId) => snapshot(pileId));

      game.drawCardsFromStock();
      game.drawCardsFromStock();
      game.drawCardsFromStock();
      game.undo();
      game.undo();
      game.undo();

      expect(pileIds.map((pileId) => snapshot(pileId))).toEqual(before);
    });
  });

  describe("the almost-win board", () => {
    it("takes back the winning move", () => {
      game.settings.debug.setAlmostWin(true);
      game.startNewGame();
      const king = game.tableaus[0].topCard!;
      expect(king.rank).toBe(Rank.KING);
      expect(king.suit).toBe(Suit.SPADE);

      game.moveCardToPile(king.id, game.foundations[0].id);
      game.undo();

      expect(game.tableaus[0].topCard).toBe(king);
    });
  });
});
