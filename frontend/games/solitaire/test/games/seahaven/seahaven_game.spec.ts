import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { SeahavenGame } from "@/games/seahaven/seahaven_game";
import { CARDS_PER_COLUMN } from "@/games/seahaven/seahaven_deal";
import {
  CELL_COUNT,
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
} from "@/games/seahaven/seahaven_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A fixed shuffle, so the deal is the same on every run and a failure here is a
 * failure of the game rather than of a lucky arrangement of cards.
 */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

/**
 * Cards used only to occupy a pile. Diamonds and clubs throughout, because every
 * position below is built from spades, so a blocker can never be mistaken for
 * part of a run — and being off-suit it can never accept a card a test is trying
 * to move either.
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
  "card-clubs-2",
  "card-clubs-3",
  "card-clubs-4",
  "card-clubs-5",
  "card-clubs-6",
];

/**
 * Reduces the board to exactly the slack a test asks for: `freeCells` cells and
 * `emptyColumns` columns left empty, with every other empty pile blocked.
 *
 * Called after a test has built its position, so it only ever fills what the
 * test left over. Without it a cleared board has four free cells and eight spare
 * columns, and no run small enough to construct would ever be refused.
 *
 * Empty columns are a parameter even though Seahaven's limit ignores them —
 * being able to leave one standing is exactly what lets a test show that it is
 * ignored.
 */
function leaveSlack(
  game: SeahavenGame,
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
 * A three-card same-suit run on column 0 with the nine it wants to land on
 * waiting on column 1. Returns the bottom card of the run.
 */
function runOfThree(game: SeahavenGame): PlayingCard {
  emptyBoard(game);
  const eight = relocate(game, "card-spades-8", game.tableaus[0]);
  relocate(game, "card-spades-7", game.tableaus[0]);
  relocate(game, "card-spades-6", game.tableaus[0]);
  relocate(game, "card-spades-9", game.tableaus[1]);
  return eight;
}

describe("SeahavenGame", () => {
  let game: SeahavenGame;

  beforeEach(() => {
    game = new SeahavenGame(
      ALL_PLAYING_CARD_IDS,
      sequenceRandom(SHUFFLE_VALUES),
    );
    game.startNewGame();
  });

  describe("the board", () => {
    it("has four cells, four foundations and ten columns", () => {
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
    it("gives every column five cards", () => {
      expect(game.tableaus.map((tableau) => tableau.size)).toEqual(
        Array(TABLEAU_COUNT).fill(CARDS_PER_COLUMN),
      );
    });

    it("spends two of the four cells on the two cards left over", () => {
      expect(game.cells.map((cell) => cell.size)).toEqual([1, 1, 0, 0]);
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
    beforeEach(() => emptyBoard(game));

    it("accepts the next card down in the same suit", () => {
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-spades-7", game.cells[0]);

      expect(game.moveCardToPile(seven.id, game.tableaus[0].id)).toBe(true);
    });

    it("refuses the next card down in another suit, unlike FreeCell", () => {
      relocate(game, "card-spades-8", game.tableaus[0]);
      const seven = relocate(game, "card-hearts-7", game.cells[0]);

      expect(game.moveCardToPile(seven.id, game.tableaus[0].id)).toBe(false);
    });

    it("lets a King start an empty column", () => {
      const king = relocate(game, "card-spades-king", game.cells[0]);

      expect(game.moveCardToPile(king.id, game.tableaus[0].id)).toBe(true);
    });

    it("refuses anything but a King into an empty column", () => {
      const queen = relocate(game, "card-spades-queen", game.cells[0]);

      expect(game.moveCardToPile(queen.id, game.tableaus[0].id)).toBe(false);
    });
  });

  describe("the cells", () => {
    beforeEach(() => emptyBoard(game));

    it("takes any single card", () => {
      const seven = relocate(game, "card-hearts-7", game.tableaus[0]);

      expect(game.moveCardToPile(seven.id, game.cells[0].id)).toBe(true);
    });

    it("holds exactly one card", () => {
      relocate(game, "card-hearts-7", game.cells[0]);
      const eight = relocate(game, "card-spades-8", game.tableaus[0]);

      expect(game.moveCardToPile(eight.id, game.cells[0].id)).toBe(false);
    });
  });

  /*
   * The rule that separates Seahaven from FreeCell. FreeCell would double the
   * allowance for each empty column; here an empty column takes only a King, a
   * moving run's only King is its bottom card, and so no sub-run staged on the
   * way could ever be parked in one.
   */
  describe("the supermove limit", () => {
    it("carries a run the free cells can stage", () => {
      const eight = runOfThree(game);
      leaveSlack(game, { freeCells: 2, emptyColumns: 0 });

      expect(game.moveCardToPile(eight.id, game.tableaus[1].id)).toBe(true);
    });

    it("refuses the same run one cell short", () => {
      const eight = runOfThree(game);
      leaveSlack(game, { freeCells: 1, emptyColumns: 0 });

      expect(game.moveCardToPile(eight.id, game.tableaus[1].id)).toBe(false);
    });

    /*
     * One free cell and one empty column. Seahaven's limit is two, so the run
     * of three is refused. FreeCell's `(cells + 1) x 2 ^ (empty columns)` would
     * make it four and allow the move, so this is the case that actually
     * distinguishes the two formulas rather than merely exercising one.
     */
    it("does not count an empty column as staging space", () => {
      const eight = runOfThree(game);
      leaveSlack(game, { freeCells: 1, emptyColumns: 1 });

      expect(game.moveCardToPile(eight.id, game.tableaus[1].id)).toBe(false);
    });
  });

  describe("the win", () => {
    it("is won once every card in play reaches a foundation", () => {
      const aces = ALL_PLAYING_CARD_IDS.filter(
        (card) => card.rank === Rank.ACE,
      );
      const short = new SeahavenGame(aces, sequenceRandom(SHUFFLE_VALUES));
      short.startNewGame();
      emptyBoard(short);
      relocate(short, "card-spades-ace", short.foundations[0]);
      relocate(short, "card-hearts-ace", short.foundations[1]);
      relocate(short, "card-diamonds-ace", short.foundations[2]);
      relocate(short, "card-clubs-ace", short.tableaus[0]);
      let won = false;
      short.on("game-won", () => (won = true));

      short.moveCardToPile("card-clubs-ace", short.foundations[3].id);

      expect(won).toBe(true);
    });
  });
});
