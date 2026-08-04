import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { EasthavenGame } from "@/games/easthaven/easthaven_game";
import { CARDS_PER_COLUMN } from "@/games/easthaven/easthaven_deal";
import {
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
} from "@/games/easthaven/easthaven_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A fixed shuffle, so the deal is the same on every run and a failure here is a
 * failure of the game rather than of a lucky arrangement of cards.
 */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

/** A four-card deck, so a win is four moves rather than fifty-two. */
const ACES_ONLY = ALL_PLAYING_CARD_IDS.filter((card) => card.rank === Rank.ACE);

function newGame(
  cardIds: typeof ALL_PLAYING_CARD_IDS = ALL_PLAYING_CARD_IDS,
): EasthavenGame {
  const game = new EasthavenGame(cardIds, sequenceRandom(SHUFFLE_VALUES));
  game.startNewGame();
  return game;
}

/**
 * Deals `rows` full rows from the opening position.
 *
 * No column can empty itself while only dealing, so the stock stays willing
 * throughout — which is what makes this a plain loop rather than a loop that has
 * to keep refilling spaces.
 */
function dealRows(game: EasthavenGame, rows: number): void {
  for (let row = 0; row < rows; row++) {
    game.dealRow();
  }
}

describe("EasthavenGame deal", () => {
  let game: EasthavenGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals seven columns of three", () => {
    expect(game.tableaus.map((pile) => pile.size)).toEqual(
      Array(TABLEAU_COUNT).fill(CARDS_PER_COLUMN),
    );
  });

  it("puts the rest of the deck on the stock", () => {
    expect(game.stock.size).toBe(31);
  });

  it("shows only the top card of each column", () => {
    const faceUpCounts = game.tableaus.map(
      (pile) => pile.getCards().filter((card) => card.faceUp).length,
    );

    expect(faceUpCounts).toEqual(Array(TABLEAU_COUNT).fill(1));
  });

  it("lays out seven columns and four foundations", () => {
    expect([game.tableaus.length, game.foundations.length]).toEqual([
      TABLEAU_COUNT,
      FOUNDATION_COUNT,
    ]);
  });
});

describe("EasthavenGame column rules", () => {
  let game: EasthavenGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("accepts the next card down in the other color", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-8", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("refuses the same color, unlike Spiderette", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[1]);

    expect(game.moveCardToPile("card-clubs-8", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("lets a King start an empty column", () => {
    relocate(game, "card-spades-king", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-king", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("refuses anything but a King into an empty column", () => {
    relocate(game, "card-spades-queen", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-queen", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("lifts an ordered run along with the card under it", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-hearts-8", game.tableaus[0]);
    relocate(game, "card-hearts-10", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-9", game.tableaus[1].id)).toBe(
      true,
    );
  });

  it("refuses to lift a card under a broken run, unlike Klondike", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[0]);
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

  it("sends an Ace to a foundation, which the player fills by hand", () => {
    relocate(game, "card-spades-ace", game.tableaus[0]);

    expect(game.autoMoveCard("card-spades-ace")).toBe(true);
  });
});

describe("EasthavenGame stock", () => {
  it("deals one card onto every column", () => {
    const game = newGame();

    game.dealRow();

    expect(game.tableaus.map((pile) => pile.size)).toEqual(
      Array(TABLEAU_COUNT).fill(CARDS_PER_COLUMN + 1),
    );
  });

  /*
   * Spider's rule, kept — and the reason Easthaven can be lost outright, since
   * only a King may refill the space that is blocking the deal.
   */
  it("refuses to deal while a column is empty", () => {
    const game = newGame();
    game.tableaus[0].clear();

    expect(game.dealRow()).toBe(false);
  });

  it("deals again once the empty column is filled", () => {
    const game = newGame();
    game.tableaus[0].clear();
    relocate(game, "card-spades-king", game.tableaus[0]);

    expect(game.dealRow()).toBe(true);
  });

  it("leaves three cards after four full rows, since 31 does not divide by 7", () => {
    const game = newGame();

    dealRows(game, 4);

    expect(game.stock.size).toBe(3);
  });

  /*
   * The short last row is the case `dealRowFromStock` handles by simply
   * stopping when the stock runs out, so it is worth pinning down that only
   * three columns grow rather than all seven.
   */
  it("deals a short final row onto only as many columns as it can reach", () => {
    const game = newGame();
    dealRows(game, 4);
    const before = game.tableaus.map((pile) => pile.size);

    game.dealRow();

    const grown = game.tableaus.filter(
      (pile, index) => pile.size > before[index],
    );
    expect(grown.length).toBe(3);
  });

  it("empties the stock on that final row", () => {
    const game = newGame();

    dealRows(game, 5);

    expect(game.stock.isEmpty).toBe(true);
  });

  it("refuses to deal once the stock is empty", () => {
    const game = newGame();
    dealRows(game, 5);

    expect(game.dealRow()).toBe(false);
  });

  it("takes a whole dealt row back in one undo", () => {
    const game = newGame();
    game.dealRow();

    game.undo();

    expect(game.stock.size).toBe(31);
  });
});

describe("EasthavenGame win condition", () => {
  it("is won once every card in play reaches a foundation", () => {
    const game = newGame(ACES_ONLY);
    emptyBoard(game);
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-hearts-ace", game.foundations[1]);
    relocate(game, "card-diamonds-ace", game.foundations[2]);
    relocate(game, "card-clubs-ace", game.tableaus[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-ace", game.foundations[3].id);

    expect(won).toBe(true);
  });
});
