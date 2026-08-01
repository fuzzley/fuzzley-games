import { describe, it, expect } from "vitest";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { FreeCellGame } from "@/games/freecell/freecell_game";
import { FreeCellVariant } from "@/games/freecell/freecell_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A fixed randomness sequence, so every deal in this file is the same deal.
 * `sequenceRandom` yields zero once it runs out, which keeps the rest of the
 * shuffle deterministic too.
 */
const SHUFFLE_SEQUENCE = [0.17, 0.83, 0.42, 0.06, 0.91, 0.55, 0.28, 0.74];

/** A dealt game playing by the given rule set. */
function dealtGame(variant: FreeCellVariant): FreeCellGame {
  const game = new FreeCellGame(
    undefined,
    sequenceRandom(SHUFFLE_SEQUENCE),
    variant,
  );
  game.startNewGame();
  return game;
}

/**
 * Cards used only to occupy space. None of them appears in any run a test
 * builds, so blocking the board can never disturb the position under test.
 */
const FILLER = [
  "card-diamonds-2",
  "card-diamonds-3",
  "card-diamonds-4",
  "card-diamonds-5",
  "card-diamonds-6",
  "card-diamonds-7",
  "card-diamonds-8",
  "card-diamonds-9",
  "card-diamonds-10",
  "card-diamonds-jack",
  "card-diamonds-queen",
];

/**
 * Fills every column and cell that is still empty and was not asked for, so the
 * only staging capacity left is the capacity a test named. Without this an
 * emptied board has six empty columns and an allowance in the dozens, which
 * hides every case the supermove limit is about.
 */
function blockBoard(
  game: FreeCellGame,
  options: { keepColumnsEmpty?: number[]; freeCells?: number },
): void {
  const keepEmpty = new Set(options.keepColumnsEmpty ?? []);
  const freeCells = options.freeCells ?? 0;
  let next = 0;
  game.tableaus.forEach((tableau, index) => {
    if (keepEmpty.has(index) || !tableau.isEmpty) return;
    relocate(game, FILLER[next++], tableau);
  });
  game.cells.forEach((cell, index) => {
    if (index < freeCells || !cell.isEmpty) return;
    relocate(game, FILLER[next++], cell);
  });
}

/** Clears the board and lays the 8 and 7 of spades on column 0, the 9 on column 1. */
function runOfTwo(game: FreeCellGame): PlayingCard {
  emptyBoard(game);
  const eight = relocate(game, "card-spades-8", game.tableaus[0]);
  relocate(game, "card-spades-7", game.tableaus[0]);
  relocate(game, "card-spades-9", game.tableaus[1]);
  return eight;
}

/** As {@link runOfTwo}, one card longer: 9-8-7 of spades onto a waiting ten. */
function runOfThree(game: FreeCellGame): PlayingCard {
  emptyBoard(game);
  const nine = relocate(game, "card-spades-9", game.tableaus[0]);
  relocate(game, "card-spades-8", game.tableaus[0]);
  relocate(game, "card-spades-7", game.tableaus[0]);
  relocate(game, "card-spades-10", game.tableaus[1]);
  return nine;
}

/** The card ids in each column, in order, for comparing one deal against another. */
function columnIds(game: FreeCellGame): string[][] {
  return game.tableaus.map((tableau) =>
    tableau.getCards().map((card) => card.id),
  );
}

describe("Baker's Game", () => {
  describe("building a column", () => {
    it("accepts a card one lower in the same suit", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      emptyBoard(game);
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-spades-7", game.tableaus[1]);

      const moved = game.moveCardToPile(seven.id, game.tableaus[0].id);

      expect(moved).toBe(true);
    });

    it("refuses a card one lower in the other colour", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      emptyBoard(game);
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-hearts-7", game.tableaus[1]);

      const moved = game.moveCardToPile(seven.id, game.tableaus[0].id);

      expect(moved).toBe(false);
    });

    it("refuses a card one lower in the same colour but another suit", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      emptyBoard(game);
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-clubs-7", game.tableaus[1]);

      const moved = game.moveCardToPile(seven.id, game.tableaus[0].id);

      expect(moved).toBe(false);
    });

    it("differs from FreeCell, which takes that other-colour card", () => {
      const game = dealtGame(FreeCellVariant.FREECELL);
      emptyBoard(game);
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-hearts-7", game.tableaus[1]);

      const moved = game.moveCardToPile(seven.id, game.tableaus[0].id);

      expect(moved).toBe(true);
    });
  });

  describe("lifting a run", () => {
    it("lifts an unbroken same-suit run", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      const eight = runOfTwo(game);

      const moved = game.moveCardToPile(eight.id, game.tableaus[1].id);

      expect(moved).toBe(true);
    });

    it("refuses a card buried under a run broken by suit", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      emptyBoard(game);
      const eight = relocate(game, "card-spades-8", game.tableaus[0]);
      // A FreeCell run, not a Baker's one. The eight would land on the nine
      // quite happily, so what refuses the move is the grab rule alone.
      relocate(game, "card-hearts-7", game.tableaus[0]);
      relocate(game, "card-spades-9", game.tableaus[1]);

      const moved = game.moveCardToPile(eight.id, game.tableaus[1].id);

      expect(moved).toBe(false);
    });

    it("still lifts the top card of a column a broken run sits on", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      emptyBoard(game);
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-hearts-7", game.tableaus[0]);

      const moved = game.moveCardToPile(seven.id, game.cells[0].id);

      expect(moved).toBe(true);
    });
  });

  describe("empty columns, Any Card", () => {
    it("lets a card that is not a King start a column", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      emptyBoard(game);
      const two = relocate(game, "card-spades-2", game.cells[0]);

      const moved = game.moveCardToPile(two.id, game.tableaus[0].id);

      expect(moved).toBe(true);
    });
  });

  describe("empty columns, Kings Only", () => {
    it("refuses a card that is not a King", () => {
      const game = dealtGame(FreeCellVariant.BAKERS_KINGS_ONLY);
      emptyBoard(game);
      const two = relocate(game, "card-spades-2", game.cells[0]);

      const moved = game.moveCardToPile(two.id, game.tableaus[0].id);

      expect(moved).toBe(false);
    });

    it("accepts a King", () => {
      const game = dealtGame(FreeCellVariant.BAKERS_KINGS_ONLY);
      emptyBoard(game);
      const king = relocate(game, "card-spades-king", game.cells[0]);

      const moved = game.moveCardToPile(king.id, game.tableaus[0].id);

      expect(moved).toBe(true);
    });
  });

  describe("the supermove limit, Any Card", () => {
    it("allows only one card with no free cell and no empty column", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      const eight = runOfTwo(game);
      blockBoard(game, { freeCells: 0 });

      const allowed = game.canMoveCardToPile(eight.id, game.tableaus[1].id);

      expect(allowed).toBe(false);
    });

    it("doubles the allowance for an empty column", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      const eight = runOfTwo(game);
      // (0 + 1) x 2^1 = 2, exactly the pair being moved.
      blockBoard(game, { freeCells: 0, keepColumnsEmpty: [2] });

      const allowed = game.canMoveCardToPile(eight.id, game.tableaus[1].id);

      expect(allowed).toBe(true);
    });

    it("allows a run of three with one free cell and one empty column", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);
      const nine = runOfThree(game);
      // (1 + 1) x 2^1 = 4. The same position is refused under Kings Only.
      blockBoard(game, { freeCells: 1, keepColumnsEmpty: [2] });

      const allowed = game.canMoveCardToPile(nine.id, game.tableaus[1].id);

      expect(allowed).toBe(true);
    });
  });

  describe("the supermove limit, Kings Only", () => {
    it("refuses a run of three with one free cell and an empty column", () => {
      const game = dealtGame(FreeCellVariant.BAKERS_KINGS_ONLY);
      const nine = runOfThree(game);
      // An empty column stages nothing when only a King may enter one, so the
      // allowance is 1 + 1 = 2 rather than FreeCell's 4.
      blockBoard(game, { freeCells: 1, keepColumnsEmpty: [2] });

      const allowed = game.canMoveCardToPile(nine.id, game.tableaus[1].id);

      expect(allowed).toBe(false);
    });

    it("allows a run of two with the same one free cell", () => {
      const game = dealtGame(FreeCellVariant.BAKERS_KINGS_ONLY);
      const eight = runOfTwo(game);
      blockBoard(game, { freeCells: 1, keepColumnsEmpty: [2] });

      const allowed = game.canMoveCardToPile(eight.id, game.tableaus[1].id);

      expect(allowed).toBe(true);
    });

    it("refuses a run of two once that free cell is taken", () => {
      const game = dealtGame(FreeCellVariant.BAKERS_KINGS_ONLY);
      const eight = runOfTwo(game);
      blockBoard(game, { freeCells: 0, keepColumnsEmpty: [2] });

      const allowed = game.canMoveCardToPile(eight.id, game.tableaus[1].id);

      expect(allowed).toBe(false);
    });
  });

  describe("the deal", () => {
    it("gives the first four columns seven cards and the rest six", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);

      expect(game.tableaus.map((tableau) => tableau.size)).toEqual([
        7, 7, 7, 7, 6, 6, 6, 6,
      ]);
    });

    it("deals fifty-two distinct cards", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);

      const dealt = new Set(columnIds(game).flat());

      expect(dealt.size).toBe(52);
    });

    it("deals every card face up", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);

      const allFaceUp = game.tableaus.every((tableau) =>
        tableau.getCards().every((card) => card.faceUp),
      );

      expect(allFaceUp).toBe(true);
    });

    it("is the same deal FreeCell makes from the same shuffle", () => {
      const bakers = dealtGame(FreeCellVariant.BAKERS);
      const freecell = dealtGame(FreeCellVariant.FREECELL);

      expect(columnIds(bakers)).toEqual(columnIds(freecell));
    });

    it("starts with empty cells, as FreeCell does", () => {
      const game = dealtGame(FreeCellVariant.BAKERS);

      expect(game.cells.every((cell) => cell.isEmpty)).toBe(true);
    });
  });
});
