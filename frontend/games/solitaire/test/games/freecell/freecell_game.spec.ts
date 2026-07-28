import { describe, it, expect, beforeEach } from "vitest";
import { FreeCellGame } from "@/games/freecell/freecell_game";
import {
  CELL_COUNT,
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  FreeCellRole,
} from "@/games/freecell/freecell_zones";
import { PlayingCard } from "@/engine/core/card/playing_card";

/** Empties the whole board so a test can build an exact position. */
function clearBoard(game: FreeCellGame): void {
  for (const pile of game.piles) {
    pile.clear();
  }
}

/** Moves a card out of wherever it is and onto `pile`. */
function place(
  game: FreeCellGame,
  cardId: string,
  pile: { addCard(card: PlayingCard): void },
): PlayingCard {
  const card = game.getCardById(cardId)!;
  game.getPileContainingCard(cardId)?.removeCard(card);
  card.faceUp = true;
  pile.addCard(card);
  return card;
}

describe("FreeCellGame", () => {
  let game: FreeCellGame;

  beforeEach(() => {
    game = new FreeCellGame();
    game.startNewGame();
  });

  describe("the board", () => {
    it("has four cells, four foundations and eight columns", () => {
      expect([
        game.cells.length,
        game.foundations.length,
        game.tableaus.length,
      ]).toEqual([CELL_COUNT, FOUNDATION_COUNT, TABLEAU_COUNT]);
    });

    it("has no stock, which is most of the point of building it", () => {
      expect(game.pilesOfRole("stock")).toEqual([]);
    });

    it("has no waste either", () => {
      expect(game.pilesOfRole("waste")).toEqual([]);
    });
  });

  describe("the deal", () => {
    it("puts every card on the board", () => {
      const dealt = game.tableaus.reduce((total, t) => total + t.size, 0);

      expect(dealt).toBe(52);
    });

    it("gives the first four columns seven cards and the rest six", () => {
      expect(game.tableaus.map((t) => t.size)).toEqual([
        7, 7, 7, 7, 6, 6, 6, 6,
      ]);
    });

    it("deals every card face up, so nothing is ever turned over", () => {
      const allFaceUp = game.tableaus.every((t) =>
        t.getCards().every((card) => card.faceUp),
      );

      expect(allFaceUp).toBe(true);
    });

    it("starts with empty cells", () => {
      expect(game.cells.every((cell) => cell.isEmpty)).toBe(true);
    });

    it("replays the same deal on a restart", () => {
      const before = game.tableaus.map((t) => t.getCards().map((c) => c.id));

      game.restartGame();

      expect(game.tableaus.map((t) => t.getCards().map((c) => c.id))).toEqual(
        before,
      );
    });
  });

  describe("free cells", () => {
    it("accepts any card into an empty cell", () => {
      clearBoard(game);
      const card = place(game, "card-hearts-7", game.tableaus[0]);

      expect(game.moveCardToPile(card.id, game.cells[0].id)).toBe(true);
    });

    it("refuses a second card, because a cell holds exactly one", () => {
      clearBoard(game);
      place(game, "card-hearts-7", game.cells[0]);
      const other = place(game, "card-spades-3", game.tableaus[0]);

      expect(game.moveCardToPile(other.id, game.cells[0].id)).toBe(false);
    });

    it("refuses a stack of two even into an empty cell", () => {
      clearBoard(game);
      const king = place(game, "card-spades-king", game.tableaus[0]);
      place(game, "card-hearts-queen", game.tableaus[0]);

      expect(game.moveCardToPile(king.id, game.cells[0].id)).toBe(false);
    });

    it("gives the card back once it leaves", () => {
      clearBoard(game);
      const card = place(game, "card-hearts-7", game.cells[0]);

      game.moveCardToPile(card.id, game.tableaus[0].id);

      expect(game.cells[0].isEmpty).toBe(true);
    });
  });

  describe("columns", () => {
    it("accepts any card onto an empty column, unlike Klondike", () => {
      clearBoard(game);
      const two = place(game, "card-spades-2", game.cells[0]);

      expect(game.moveCardToPile(two.id, game.tableaus[0].id)).toBe(true);
    });

    it("builds down in alternating colors", () => {
      clearBoard(game);
      place(game, "card-spades-8", game.tableaus[0]);
      const redSeven = place(game, "card-hearts-7", game.tableaus[1]);

      expect(game.moveCardToPile(redSeven.id, game.tableaus[0].id)).toBe(true);
    });

    it("refuses a same-color card", () => {
      clearBoard(game);
      place(game, "card-spades-8", game.tableaus[0]);
      const blackSeven = place(game, "card-clubs-7", game.tableaus[1]);

      expect(game.moveCardToPile(blackSeven.id, game.tableaus[0].id)).toBe(
        false,
      );
    });
  });

  describe("lifting a run", () => {
    it("lifts a properly ordered run", () => {
      clearBoard(game);
      const eight = place(game, "card-spades-8", game.tableaus[0]);
      place(game, "card-hearts-7", game.tableaus[0]);
      place(game, "card-clubs-6", game.tableaus[0]);
      place(game, "card-diamonds-9", game.tableaus[1]);

      expect(game.moveCardToPile(eight.id, game.tableaus[1].id)).toBe(true);
    });

    it("refuses a card buried under a broken run", () => {
      clearBoard(game);
      const eight = place(game, "card-spades-8", game.tableaus[0]);
      // A two on an eight is not a run, so the eight cannot be lifted at all.
      place(game, "card-hearts-2", game.tableaus[0]);
      place(game, "card-diamonds-9", game.tableaus[1]);

      expect(game.moveCardToPile(eight.id, game.tableaus[1].id)).toBe(false);
    });

    it("still lifts the top card of a broken column", () => {
      clearBoard(game);
      place(game, "card-spades-8", game.tableaus[0]);
      const two = place(game, "card-hearts-2", game.tableaus[0]);

      expect(game.moveCardToPile(two.id, game.cells[0].id)).toBe(true);
    });
  });

  describe("the supermove limit", () => {
    /**
     * Blocks every column and cell not named, so the only free capacity is what
     * a test asks for. Without this a cleared board has six empty columns and
     * the limit is 64, which hides every interesting case.
     */
    function block(options: {
      keepColumnsEmpty?: number[];
      freeCells?: number;
    }): void {
      const keepEmpty = new Set(options.keepColumnsEmpty ?? []);
      const freeCells = options.freeCells ?? 0;
      const filler = [
        "card-diamonds-2",
        "card-diamonds-3",
        "card-diamonds-4",
        "card-diamonds-5",
        "card-diamonds-6",
        "card-diamonds-7",
        "card-diamonds-8",
        "card-diamonds-10",
        "card-diamonds-jack",
        "card-diamonds-queen",
        "card-diamonds-king",
        "card-clubs-10",
      ];
      let next = 0;
      game.tableaus.forEach((tableau, index) => {
        if (keepEmpty.has(index) || !tableau.isEmpty) return;
        place(game, filler[next++], tableau);
      });
      game.cells.forEach((cell, index) => {
        if (index < freeCells || !cell.isEmpty) return;
        place(game, filler[next++], cell);
      });
    }

    /** A three-card run on column 0 with a nine waiting on column 1. */
    function runOfThree(): PlayingCard {
      clearBoard(game);
      const eight = place(game, "card-spades-8", game.tableaus[0]);
      place(game, "card-hearts-7", game.tableaus[0]);
      place(game, "card-clubs-6", game.tableaus[0]);
      place(game, "card-diamonds-9", game.tableaus[1]);
      return eight;
    }

    it("allows a run of three with every cell free", () => {
      const eight = runOfThree();
      block({ freeCells: 4 });

      expect(game.canMoveCardToPile(eight.id, game.tableaus[1].id)).toBe(true);
    });

    it("refuses the same run once the cells are full", () => {
      const eight = runOfThree();
      block({ freeCells: 0 });

      expect(game.canMoveCardToPile(eight.id, game.tableaus[1].id)).toBe(false);
    });

    it("allows a run of two with one cell free", () => {
      clearBoard(game);
      const seven = place(game, "card-hearts-7", game.tableaus[0]);
      place(game, "card-clubs-6", game.tableaus[0]);
      place(game, "card-spades-8", game.tableaus[1]);
      block({ freeCells: 1 });

      expect(game.canMoveCardToPile(seven.id, game.tableaus[1].id)).toBe(true);
    });

    it("doubles the allowance for an empty column", () => {
      const eight = runOfThree();
      // No free cells, but one empty column: (0+1) x 2^1 = 2, short of three.
      block({ freeCells: 0, keepColumnsEmpty: [2] });

      expect(game.canMoveCardToPile(eight.id, game.tableaus[1].id)).toBe(false);
    });

    it("allows a run of two using one empty column and no free cells", () => {
      clearBoard(game);
      const seven = place(game, "card-hearts-7", game.tableaus[0]);
      place(game, "card-clubs-6", game.tableaus[0]);
      place(game, "card-spades-8", game.tableaus[1]);
      block({ freeCells: 0, keepColumnsEmpty: [2] });

      expect(game.canMoveCardToPile(seven.id, game.tableaus[1].id)).toBe(true);
    });

    it("does not let an empty destination column count towards its own capacity", () => {
      clearBoard(game);
      const seven = place(game, "card-hearts-7", game.tableaus[0]);
      place(game, "card-clubs-6", game.tableaus[0]);
      // Moving into column 1, which is the only empty one. Naively
      // (0+1) x 2^1 = 2 would allow the pair; the destination cannot stage part
      // of the run it is receiving, so the real limit is one.
      block({ freeCells: 0, keepColumnsEmpty: [1] });

      expect(game.canMoveCardToPile(seven.id, game.tableaus[1].id)).toBe(false);
    });
  });

  describe("moves and undo", () => {
    it("counts a move", () => {
      clearBoard(game);
      const card = place(game, "card-hearts-7", game.tableaus[0]);

      game.moveCardToPile(card.id, game.cells[0].id);

      expect(game.state.moves).toBe(1);
    });

    it("keeps the score at zero, because FreeCell does not score", () => {
      clearBoard(game);
      const ace = place(game, "card-spades-ace", game.tableaus[0]);

      game.moveCardToPile(ace.id, game.foundations[0].id);

      expect(game.state.score).toBe(0);
    });

    it("takes a move back", () => {
      clearBoard(game);
      const card = place(game, "card-hearts-7", game.tableaus[0]);
      game.moveCardToPile(card.id, game.cells[0].id);

      game.undo();

      expect(game.getPileContainingCard(card.id)?.id).toBe(game.tableaus[0].id);
    });

    it("takes back a whole run together", () => {
      clearBoard(game);
      const eight = place(game, "card-spades-8", game.tableaus[0]);
      const seven = place(game, "card-hearts-7", game.tableaus[0]);
      place(game, "card-diamonds-9", game.tableaus[1]);
      game.moveCardToPile(eight.id, game.tableaus[1].id);

      game.undo();

      expect(game.tableaus[0].getCards()).toEqual([eight, seven]);
    });
  });

  describe("auto-move", () => {
    it("prefers a foundation", () => {
      clearBoard(game);
      const ace = place(game, "card-spades-ace", game.tableaus[0]);

      game.autoMoveCard(ace.id);

      expect(game.getPileContainingCard(ace.id)?.role).toBe(
        FreeCellRole.FOUNDATION,
      );
    });

    it("falls back to a cell when nothing else will take the card", () => {
      clearBoard(game);
      // A two with no Ace on a foundation to build on, and every column both
      // occupied and unable to accept it.
      const two = place(game, "card-hearts-2", game.tableaus[0]);
      const blockers = [
        "card-hearts-4",
        "card-hearts-5",
        "card-hearts-6",
        "card-hearts-7",
        "card-hearts-8",
        "card-hearts-9",
        "card-hearts-10",
      ];
      game.tableaus.slice(1).forEach((tableau, index) => {
        place(game, blockers[index], tableau);
      });

      game.autoMoveCard(two.id);

      expect(game.getPileContainingCard(two.id)?.role).toBe(FreeCellRole.CELL);
    });
  });

  describe("winning", () => {
    it("announces the win when the last card reaches a foundation", () => {
      let won = false;
      game.on("game-won", () => {
        won = true;
      });
      game.almostWin = true;
      game.startNewGame();
      for (const tableau of game.tableaus) {
        const king = tableau.topCard;
        if (king) game.autoMoveCard(king.id);
      }

      expect(won).toBe(true);
    });

    it("does not announce a win part way through", () => {
      let won = false;
      game.on("game-won", () => {
        won = true;
      });
      clearBoard(game);
      const ace = place(game, "card-spades-ace", game.tableaus[0]);

      game.moveCardToPile(ace.id, game.foundations[0].id);

      expect(won).toBe(false);
    });
  });
});
