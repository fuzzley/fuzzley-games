import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Suit } from "@/engine/core/card/playing_card";
import { SpideretteGame } from "@/games/spiderette/spiderette_game";
import { SpideretteVariant } from "@/games/spiderette/spiderette_rules";
import {
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
} from "@/games/spiderette/spiderette_zones";
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

function newGame(
  variant: SpideretteVariant = SpideretteVariant.SPIDERETTE,
  cardIds: typeof ALL_PLAYING_CARD_IDS = ALL_PLAYING_CARD_IDS,
): SpideretteGame {
  const game = new SpideretteGame(
    cardIds,
    sequenceRandom(SHUFFLE_VALUES),
    variant,
  );
  game.startNewGame();
  return game;
}

describe("SpideretteGame deal", () => {
  it("deals Klondike's staircase across seven columns", () => {
    const game = newGame();

    expect(game.tableaus.map((pile) => pile.size)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("puts the rest of the deck on the stock", () => {
    const game = newGame();

    expect(game.stock.size).toBe(24);
  });

  it("deals Will o' the Wisp a flat three to every column", () => {
    const game = newGame(SpideretteVariant.WILL_O_THE_WISP);

    expect(game.tableaus.map((pile) => pile.size)).toEqual([
      3, 3, 3, 3, 3, 3, 3,
    ]);
  });

  it("leaves Will o' the Wisp a larger stock", () => {
    const game = newGame(SpideretteVariant.WILL_O_THE_WISP);

    expect(game.stock.size).toBe(31);
  });

  it("shows only the top card of each column", () => {
    const game = newGame();

    const faceUpCounts = game.tableaus.map(
      (pile) => pile.getCards().filter((card) => card.faceUp).length,
    );
    expect(faceUpCounts).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it("lays out seven columns and four foundations", () => {
    const game = newGame();

    expect([game.tableaus.length, game.foundations.length]).toEqual([
      TABLEAU_COUNT,
      FOUNDATION_COUNT,
    ]);
  });
});

describe("SpideretteGame column rules", () => {
  let game: SpideretteGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("accepts a descending card of another suit", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-8", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("refuses a card that is not one rank lower", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-7", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-7", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("accepts any card into an empty column", () => {
    relocate(game, "card-hearts-7", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-7", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("refuses to lift a card buried under another suit", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.tableaus[0]);
    relocate(game, "card-hearts-10", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-9", game.tableaus[1].id)).toBe(
      false,
    );
  });

  it("turns over the card a move exposed", () => {
    const buried = relocate(game, "card-clubs-4", game.tableaus[0], false);
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-10", game.tableaus[1]);

    game.moveCardToPile("card-spades-9", game.tableaus[1].id);

    expect(buried.faceUp).toBe(true);
  });
});

describe("SpideretteGame stock", () => {
  it("deals one card onto every column", () => {
    const game = newGame();

    game.dealRow();

    expect(game.tableaus.map((pile) => pile.size)).toEqual([
      2, 3, 4, 5, 6, 7, 8,
    ]);
  });

  /*
   * The rule that separates this stock from Spider's, which refuses while any
   * column stands empty. Twenty-four cards across seven columns cannot come out
   * evenly, so a game that had emptied a column would strand the short last row.
   */
  it("deals even when a column is empty, unlike Spider", () => {
    const game = newGame();
    game.tableaus[0].clear();

    expect(game.dealRow()).toBe(true);
  });

  it("deals a short row when the stock cannot fill every column", () => {
    const game = newGame();
    game.dealRow();
    game.dealRow();
    game.dealRow();

    game.dealRow();

    expect(game.stock.isEmpty).toBe(true);
  });

  it("refuses to deal once the stock is empty", () => {
    const game = newGame();
    game.dealRow();
    game.dealRow();
    game.dealRow();
    game.dealRow();

    expect(game.dealRow()).toBe(false);
  });

  it("takes a whole dealt row back in one undo", () => {
    const game = newGame();
    game.dealRow();

    game.undo();

    expect(game.stock.size).toBe(24);
  });
});

describe("SpideretteGame completed runs", () => {
  let game: SpideretteGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
    for (const cardId of KING_TO_TWO) {
      relocate(game, cardId, game.tableaus[0]);
    }
    relocate(game, "card-spades-ace", game.tableaus[1]);
  });

  it("sends a completed King-to-Ace run to a foundation", () => {
    game.moveCardToPile("card-spades-ace", game.tableaus[0].id);

    expect(game.foundations[0].size).toBe(13);
  });

  it("takes the run back with the move that completed it, in one undo", () => {
    game.moveCardToPile("card-spades-ace", game.tableaus[0].id);

    game.undo();

    expect([game.tableaus[0].size, game.tableaus[1].size]).toEqual([12, 1]);
  });
});

describe("SpideretteGame win condition", () => {
  it("is won once every card in play has been collected", () => {
    const game = newGame(SpideretteVariant.SPIDERETTE, SPADES_ONLY);
    emptyBoard(game);
    for (const cardId of KING_TO_TWO) {
      relocate(game, cardId, game.tableaus[0]);
    }
    relocate(game, "card-spades-ace", game.tableaus[1]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-spades-ace", game.tableaus[0].id);

    expect(won).toBe(true);
  });
});
