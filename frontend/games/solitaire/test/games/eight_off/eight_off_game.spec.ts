import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { EightOffGame } from "@/games/eight_off/eight_off_game";
import {
  CELL_COUNT,
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  EightOffRole,
} from "@/games/eight_off/eight_off_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A fixed shuffle. The particular values mean nothing; what matters is that the
 * deal is the same on every run, so a failure here is a failure of the game and
 * not of a lucky arrangement of cards.
 */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

/** A four-card deck, so a win is four moves rather than fifty-two. */
const ACES_ONLY = ALL_PLAYING_CARD_IDS.filter((card) => card.rank === Rank.ACE);

/** The ids of the cards in {@link ACES_ONLY}. */
const ACE_IDS = [
  "card-spades-ace",
  "card-hearts-ace",
  "card-diamonds-ace",
  "card-clubs-ace",
];

/**
 * Cards used only to occupy a pile. Diamonds and clubs throughout, because
 * every position below is built from spades and hearts, so a blocker can never
 * be mistaken for part of one — and being off-suit, it can never accept a card
 * a test is trying to move either.
 */
const FILLER_IDS = [
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
  "card-diamonds-king",
  "card-clubs-2",
  "card-clubs-3",
  "card-clubs-4",
  "card-clubs-5",
  "card-clubs-6",
  "card-clubs-7",
  "card-clubs-8",
];

/**
 * Reduces the board to exactly the slack a test asks for: `freeCells` cells and
 * `emptyColumns` columns left empty, with every other empty pile blocked.
 *
 * Called after a test has built its position, so it only ever fills what the
 * test left over. Without it a cleared board has eight free cells and six spare
 * columns, the supermove limit is nine, and no run small enough to construct
 * would ever be refused.
 */
function leaveSlack(
  game: EightOffGame,
  options: { freeCells: number; emptyColumns: number },
): void {
  let next = 0;
  game.tableaus
    .filter((tableau) => tableau.isEmpty)
    .slice(options.emptyColumns)
    .forEach((tableau) => relocate(game, FILLER_IDS[next++], tableau));
  game.cells
    .filter((cell) => cell.isEmpty)
    .slice(options.freeCells)
    .forEach((cell) => relocate(game, FILLER_IDS[next++], cell));
}

/**
 * A four-card same-suit run on column 0 with the nine it wants to land on
 * waiting on column 1. Returns the bottom card of the run.
 */
function runOfFour(game: EightOffGame): PlayingCard {
  emptyBoard(game);
  const eight = relocate(game, "card-spades-8", game.tableaus[0]);
  relocate(game, "card-spades-7", game.tableaus[0]);
  relocate(game, "card-spades-6", game.tableaus[0]);
  relocate(game, "card-spades-5", game.tableaus[0]);
  relocate(game, "card-spades-9", game.tableaus[1]);
  return eight;
}

describe("EightOffGame", () => {
  let game: EightOffGame;

  beforeEach(() => {
    game = new EightOffGame(
      ALL_PLAYING_CARD_IDS,
      sequenceRandom(SHUFFLE_VALUES),
    );
    game.startNewGame();
  });

  describe("the board", () => {
    it("has eight cells, four foundations and eight columns", () => {
      expect([
        game.cells.length,
        game.foundations.length,
        game.tableaus.length,
      ]).toEqual([CELL_COUNT, FOUNDATION_COUNT, TABLEAU_COUNT]);
    });

    it("has no stock, because the whole deck is dealt at the start", () => {
      expect(game.pilesOfRole("stock")).toEqual([]);
    });
  });

  describe("the deal", () => {
    it("gives every column six cards", () => {
      expect(game.tableaus.map((tableau) => tableau.size)).toEqual([
        6, 6, 6, 6, 6, 6, 6, 6,
      ]);
    });

    it("puts the four left over into the first four cells", () => {
      expect(game.cells.map((cell) => cell.size)).toEqual([
        1, 1, 1, 1, 0, 0, 0, 0,
      ]);
    });

    it("puts all fifty-two distinct cards on the board", () => {
      const dealt = new Set(
        game.piles.flatMap((pile) => pile.getCards().map((card) => card.id)),
      );

      expect(dealt.size).toBe(52);
    });

    it("deals every card face up, so nothing is ever turned over", () => {
      const allFaceUp = game.piles.every((pile) =>
        pile.getCards().every((card) => card.faceUp),
      );

      expect(allFaceUp).toBe(true);
    });

    it("replays the same deal on a restart", () => {
      const before = game.piles.map((pile) =>
        pile.getCards().map((card) => card.id),
      );

      game.restartGame();

      expect(
        game.piles.map((pile) => pile.getCards().map((card) => card.id)),
      ).toEqual(before);
    });
  });

  describe("building a column", () => {
    it("accepts the next card down in the same suit", () => {
      emptyBoard(game);
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-spades-7", game.cells[0]);

      expect(game.moveCardToPile(seven.id, game.tableaus[0].id)).toBe(true);
    });

    it("refuses the next card down in another suit, unlike FreeCell", () => {
      emptyBoard(game);
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-hearts-7", game.cells[0]);

      expect(game.moveCardToPile(seven.id, game.tableaus[0].id)).toBe(false);
    });

    it("refuses a non-King onto an empty column", () => {
      emptyBoard(game);
      const queen = relocate(game, "card-spades-queen", game.cells[0]);

      expect(game.moveCardToPile(queen.id, game.tableaus[0].id)).toBe(false);
    });

    it("accepts a King onto an empty column", () => {
      emptyBoard(game);
      const king = relocate(game, "card-spades-king", game.cells[0]);

      expect(game.moveCardToPile(king.id, game.tableaus[0].id)).toBe(true);
    });
  });

  describe("lifting a run", () => {
    it("lifts a card under an unbroken same-suit run", () => {
      emptyBoard(game);
      const eight = relocate(game, "card-spades-8", game.tableaus[0]);
      relocate(game, "card-spades-7", game.tableaus[0]);

      expect(game.isCardDraggable(eight)).toBe(true);
    });

    it("refuses a card under a broken run", () => {
      emptyBoard(game);
      const eight = relocate(game, "card-spades-8", game.tableaus[0]);
      relocate(game, "card-hearts-2", game.tableaus[0]);

      expect(game.isCardDraggable(eight)).toBe(false);
    });

    it("refuses a card under a run that only alternates colour", () => {
      emptyBoard(game);
      const eight = relocate(game, "card-spades-8", game.tableaus[0]);
      relocate(game, "card-hearts-7", game.tableaus[0]);

      expect(game.isCardDraggable(eight)).toBe(false);
    });

    it("still lifts the top card of a broken column", () => {
      emptyBoard(game);
      relocate(game, "card-spades-8", game.tableaus[0]);
      const two = relocate(game, "card-hearts-2", game.tableaus[0]);

      expect(game.isCardDraggable(two)).toBe(true);
    });
  });

  describe("the supermove limit", () => {
    it("moves a run of one more than the free cells", () => {
      emptyBoard(game);
      const eight = relocate(game, "card-spades-8", game.tableaus[0]);
      relocate(game, "card-spades-7", game.tableaus[0]);
      relocate(game, "card-spades-6", game.tableaus[0]);
      relocate(game, "card-spades-9", game.tableaus[1]);
      leaveSlack(game, { freeCells: 2, emptyColumns: 0 });

      expect(game.canMoveCardToPile(eight.id, game.tableaus[1].id)).toBe(true);
    });

    it("refuses a run of two more than the free cells", () => {
      const eight = runOfFour(game);
      leaveSlack(game, { freeCells: 2, emptyColumns: 0 });

      expect(game.canMoveCardToPile(eight.id, game.tableaus[1].id)).toBe(false);
    });

    it("does not raise the limit for an available empty column", () => {
      const eight = runOfFour(game);
      // FreeCell would double the allowance to six here and let the run go. An
      // Eight Off column takes only a King, and the four cards being moved are
      // a Five to an Eight, so the empty column can stage none of them.
      leaveSlack(game, { freeCells: 2, emptyColumns: 1 });

      expect(game.canMoveCardToPile(eight.id, game.tableaus[1].id)).toBe(false);
    });

    it("moves a single card with no free cells at all", () => {
      emptyBoard(game);
      const seven = relocate(game, "card-spades-7", game.tableaus[0]);
      relocate(game, "card-spades-8", game.tableaus[1]);
      leaveSlack(game, { freeCells: 0, emptyColumns: 0 });

      expect(game.canMoveCardToPile(seven.id, game.tableaus[1].id)).toBe(true);
    });
  });

  describe("free cells", () => {
    it("accepts any card into an empty cell", () => {
      emptyBoard(game);
      const card = relocate(game, "card-hearts-7", game.tableaus[0]);

      expect(game.moveCardToPile(card.id, game.cells[0].id)).toBe(true);
    });

    it("refuses a second card, because a cell holds exactly one", () => {
      emptyBoard(game);
      relocate(game, "card-hearts-7", game.cells[0]);
      const other = relocate(game, "card-spades-3", game.tableaus[0]);

      expect(game.moveCardToPile(other.id, game.cells[0].id)).toBe(false);
    });

    it("refuses a run of two even into an empty cell", () => {
      emptyBoard(game);
      const eight = relocate(game, "card-spades-8", game.tableaus[0]);
      relocate(game, "card-spades-7", game.tableaus[0]);

      expect(game.moveCardToPile(eight.id, game.cells[0].id)).toBe(false);
    });
  });

  describe("auto-move", () => {
    it("prefers a foundation", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      game.autoMoveCard(ace.id);

      expect(game.getPileContainingCard(ace.id)?.role).toBe(
        EightOffRole.FOUNDATION,
      );
    });

    it("falls back to a cell, which is what a player is avoiding", () => {
      emptyBoard(game);
      // No blockers needed, unlike the same test in FreeCell: a Two has no Ace
      // beneath it on any foundation, and every empty column is Kings-only.
      const two = relocate(game, "card-hearts-2", game.tableaus[0]);

      game.autoMoveCard(two.id);

      expect(game.getPileContainingCard(two.id)?.role).toBe(EightOffRole.CELL);
    });
  });

  describe("scoring", () => {
    it("keeps the score at zero, because Eight Off does not score", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      game.moveCardToPile(ace.id, game.foundations[0].id);

      expect(game.state.score).toBe(0);
    });
  });

  describe("winning", () => {
    it("announces the win when the last card reaches a foundation", () => {
      const acesGame = new EightOffGame(
        ACES_ONLY,
        sequenceRandom(SHUFFLE_VALUES),
      );
      let won = false;
      acesGame.on("game-won", () => {
        won = true;
      });
      acesGame.startNewGame();

      ACE_IDS.forEach((aceId) => acesGame.autoMoveCard(aceId));

      expect(won).toBe(true);
    });

    it("does not announce a win part way through", () => {
      let won = false;
      game.on("game-won", () => {
        won = true;
      });
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      game.moveCardToPile(ace.id, game.foundations[0].id);

      expect(won).toBe(false);
    });
  });
});
