import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { BakersDozenGame } from "@/games/bakers_dozen/bakers_dozen_game";
import { CARDS_PER_COLUMN } from "@/games/bakers_dozen/bakers_dozen_deal";
import {
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
} from "@/games/bakers_dozen/bakers_dozen_zones";
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
): BakersDozenGame {
  const game = new BakersDozenGame(cardIds, sequenceRandom(SHUFFLE_VALUES));
  game.startNewGame();
  return game;
}

describe("BakersDozenGame deal", () => {
  let game: BakersDozenGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals thirteen columns of four", () => {
    const sizes = game.tableaus.map((pile) => pile.size);

    expect(sizes).toEqual(Array(TABLEAU_COUNT).fill(CARDS_PER_COLUMN));
  });

  it("deals the whole deck onto the columns", () => {
    const dealt = game.tableaus.reduce((total, pile) => total + pile.size, 0);

    expect(dealt).toBe(52);
  });

  it("deals every card face up, since nothing is hidden", () => {
    const hidden = game.tableaus
      .flatMap((pile) => pile.getCards())
      .filter((card) => !card.faceUp);

    expect(hidden).toEqual([]);
  });

  it("leaves no King on top of a column, where it would bury the rest", () => {
    const kingsOnTop = game.tableaus.filter(
      (pile) => pile.topCard?.rank === Rank.KING,
    );

    expect(kingsOnTop).toEqual([]);
  });

  /*
   * Stated as "no King sits above a non-King" rather than "every King is at
   * index 0", because a column can be dealt two Kings and then both belong at
   * the bottom. The index form passes on most shuffles and is wrong on those.
   */
  it("sinks every King it dealt beneath every other card in its column", () => {
    const columnsWithARaisedKing = game.tableaus.filter((pile) => {
      const cards = pile.getCards();
      const firstOther = cards.findIndex((card) => card.rank !== Rank.KING);
      // Sunk Kings form a prefix, so nothing after the first non-King is one.
      return (
        firstOther !== -1 &&
        cards.slice(firstOther).some((card) => card.rank === Rank.KING)
      );
    });

    expect(columnsWithARaisedKing).toEqual([]);
  });

  /*
   * A deck of four Kings and four Queens over columns of four: some column must
   * receive at least two Kings, so this exercises the case the assertion above
   * is written for rather than the one a full deck usually produces.
   */
  it("sinks both Kings when a column is dealt two of them", () => {
    const kingsAndQueens = ALL_PLAYING_CARD_IDS.filter(
      (card) => card.rank === Rank.KING || card.rank === Rank.QUEEN,
    );
    const crowded = newGame(kingsAndQueens);

    const queensBuriedUnderAKing = crowded.tableaus.filter((pile) => {
      const cards = pile.getCards();
      const firstQueen = cards.findIndex((card) => card.rank === Rank.QUEEN);
      return (
        firstQueen !== -1 &&
        cards.slice(firstQueen).some((card) => card.rank === Rank.KING)
      );
    });

    expect(queensBuriedUnderAKing).toEqual([]);
  });

  it("lays out thirteen columns and four foundations", () => {
    expect([game.tableaus.length, game.foundations.length]).toEqual([
      TABLEAU_COUNT,
      FOUNDATION_COUNT,
    ]);
  });
});

describe("BakersDozenGame column rules", () => {
  let game: BakersDozenGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("accepts a descending card of any suit", () => {
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

  /*
   * The rule the whole game turns on. Every other solitaire here would take
   * this card.
   */
  it("refuses every card into an empty column, which can never be refilled", () => {
    relocate(game, "card-spades-king", game.tableaus[1]);

    const moved = game.moveCardToPile("card-spades-king", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("refuses to lift a card out from under another", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-spades-8", game.tableaus[0]);
    relocate(game, "card-hearts-10", game.tableaus[1]);

    const moved = game.moveCardToPile("card-spades-9", game.tableaus[1].id);

    expect(moved).toBe(false);
  });

  it("sends an Ace to a foundation", () => {
    relocate(game, "card-spades-ace", game.tableaus[0]);

    const moved = game.autoMoveCard("card-spades-ace");

    expect(moved).toBe(true);
  });

  it("builds a foundation up in suit", () => {
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-spades-2", game.tableaus[0]);

    const moved = game.moveCardToPile("card-spades-2", game.foundations[0].id);

    expect(moved).toBe(true);
  });

  it("refuses a foundation card of the wrong suit", () => {
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-hearts-2", game.tableaus[0]);

    const moved = game.moveCardToPile("card-hearts-2", game.foundations[0].id);

    expect(moved).toBe(false);
  });
});

describe("BakersDozenGame win condition", () => {
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

  it("is not won while a card remains on the tableau", () => {
    const game = newGame();
    let won = false;
    game.on("game-won", () => (won = true));

    game.autoMoveCard(game.tableaus[0].topCard!.id);

    expect(won).toBe(false);
  });
});
