import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Suit } from "@/engine/core/card/playing_card";
import { SimpleSimonGame } from "@/games/simple_simon/simple_simon_game";
import { CARDS_PER_COLUMN } from "@/games/simple_simon/simple_simon_deal";
import {
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
} from "@/games/simple_simon/simple_simon_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A fixed shuffle, so the deal is the same on every run and a failure here is a
 * failure of the game rather than of a lucky arrangement of cards.
 */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

/** One suit only: thirteen cards, so a whole game is one run. */
const SPADES_ONLY = ALL_PLAYING_CARD_IDS.filter(
  (card) => card.suit === Suit.SPADE,
);

/** The spades from King down to Two, in the order a completed run holds them. */
const KING_TO_TWO = [
  "card-spades-king",
  "card-spades-queen",
  "card-spades-jack",
  "card-spades-10",
  "card-spades-9",
  "card-spades-8",
  "card-spades-7",
  "card-spades-6",
  "card-spades-5",
  "card-spades-4",
  "card-spades-3",
  "card-spades-2",
];

/**
 * Builds a King-down-to-Two run in the first column and leaves the Ace alone in
 * the second, so that one move finishes the run.
 *
 * Returns the game with an otherwise empty board: every test below is about
 * what that single move does, and a board still holding its deal would let a
 * stray column complete a run of its own.
 */
function boardOneMoveFromARun(game: SimpleSimonGame): void {
  emptyBoard(game);
  for (const cardId of KING_TO_TWO) {
    relocate(game, cardId, game.tableaus[0]);
  }
  relocate(game, "card-spades-ace", game.tableaus[1]);
}

describe("SimpleSimonGame deal", () => {
  let game: SimpleSimonGame;

  beforeEach(() => {
    game = new SimpleSimonGame(
      ALL_PLAYING_CARD_IDS,
      sequenceRandom(SHUFFLE_VALUES),
    );
    game.startNewGame();
  });

  it("deals the whole deck onto the columns", () => {
    const dealt = game.tableaus.reduce((total, pile) => total + pile.size, 0);

    expect(dealt).toBe(52);
  });

  it("deals the staircase of column sizes the game is named for", () => {
    const sizes = game.tableaus.map((pile) => pile.size);

    expect(sizes).toEqual([...CARDS_PER_COLUMN]);
  });

  it("deals every card face up, since nothing is hidden", () => {
    const hidden = game.tableaus
      .flatMap((pile) => pile.getCards())
      .filter((card) => !card.faceUp);

    expect(hidden).toEqual([]);
  });

  it("leaves the foundations empty", () => {
    const collected = game.foundations.reduce(
      (total, pile) => total + pile.size,
      0,
    );

    expect(collected).toBe(0);
  });

  it("lays out ten columns and four foundations", () => {
    expect([game.tableaus.length, game.foundations.length]).toEqual([
      TABLEAU_COUNT,
      FOUNDATION_COUNT,
    ]);
  });
});

describe("SimpleSimonGame column rules", () => {
  let game: SimpleSimonGame;

  beforeEach(() => {
    game = new SimpleSimonGame(
      ALL_PLAYING_CARD_IDS,
      sequenceRandom(SHUFFLE_VALUES),
    );
    game.startNewGame();
    emptyBoard(game);
  });

  it("accepts a descending card of another suit, as Spider does", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.tableaus[1]);

    const moved = game.moveCardToPile("card-hearts-8", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("refuses a card that is not one rank lower", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-7", game.tableaus[1]);

    const moved = game.moveCardToPile("card-hearts-7", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("accepts any card into an empty column", () => {
    relocate(game, "card-hearts-7", game.tableaus[1]);

    const moved = game.moveCardToPile("card-hearts-7", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("lifts a same-suit run along with the card under it", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-spades-8", game.tableaus[0]);
    relocate(game, "card-hearts-10", game.tableaus[1]);

    const moved = game.moveCardToPile("card-spades-9", game.tableaus[1].id);

    expect(moved).toBe(true);
  });

  it("refuses to lift a card buried under another suit", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.tableaus[0]);
    relocate(game, "card-hearts-10", game.tableaus[1]);

    const moved = game.moveCardToPile("card-spades-9", game.tableaus[1].id);

    expect(moved).toBe(false);
  });

  it("refuses to drop a card onto a foundation directly", () => {
    relocate(game, "card-spades-ace", game.tableaus[0]);

    const moved = game.moveCardToPile(
      "card-spades-ace",
      game.foundations[0].id,
    );

    expect(moved).toBe(false);
  });
});

describe("SimpleSimonGame completed runs", () => {
  let game: SimpleSimonGame;

  beforeEach(() => {
    game = new SimpleSimonGame(
      ALL_PLAYING_CARD_IDS,
      sequenceRandom(SHUFFLE_VALUES),
    );
    game.startNewGame();
    boardOneMoveFromARun(game);
  });

  it("sends a completed King-to-Ace run to a foundation", () => {
    game.moveCardToPile("card-spades-ace", game.tableaus[0].id);

    expect(game.foundations[0].size).toBe(13);
  });

  it("empties the column the run left", () => {
    game.moveCardToPile("card-spades-ace", game.tableaus[0].id);

    expect(game.tableaus[0].isEmpty).toBe(true);
  });

  it("takes the run back with the move that completed it, in one undo", () => {
    game.moveCardToPile("card-spades-ace", game.tableaus[0].id);

    game.undo();

    expect([game.tableaus[0].size, game.tableaus[1].size]).toEqual([12, 1]);
  });
});

describe("SimpleSimonGame win condition", () => {
  it("is won once every card in play has been collected", () => {
    const game = new SimpleSimonGame(
      SPADES_ONLY,
      sequenceRandom(SHUFFLE_VALUES),
    );
    game.startNewGame();
    boardOneMoveFromARun(game);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-spades-ace", game.tableaus[0].id);

    expect(won).toBe(true);
  });

  it("is not won while cards remain on the tableau", () => {
    const game = new SimpleSimonGame(
      ALL_PLAYING_CARD_IDS,
      sequenceRandom(SHUFFLE_VALUES),
    );
    game.startNewGame();
    boardOneMoveFromARun(game);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-spades-ace", game.tableaus[0].id);

    expect(won).toBe(false);
  });
});
