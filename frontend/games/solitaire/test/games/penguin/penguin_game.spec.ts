import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { PenguinGame } from "@/games/penguin/penguin_game";
import {
  CARDS_PER_COLUMN,
  dealPenguinLayout,
} from "@/games/penguin/penguin_deal";
import { TABLEAU_COUNT } from "@/games/penguin/penguin_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";
import { makePlayingCard } from "@test/support/card_builder";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  cardIds: typeof ALL_PLAYING_CARD_IDS = ALL_PLAYING_CARD_IDS,
): PenguinGame {
  const game = new PenguinGame({
    cardIds,
    random: sequenceRandom(SHUFFLE_VALUES),
  });
  game.startNewGame();
  return game;
}

/** Empties the board and makes Seven the beak's rank. */
function sevensAsBeak(game: PenguinGame): void {
  emptyBoard(game);
  relocate(game, "card-hearts-7", game.foundations[0]);
}

describe("PenguinGame deal", () => {
  let game: PenguinGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals seven columns of seven", () => {
    expect(game.tableaus.map((pile) => pile.size)).toEqual(
      Array<number>(TABLEAU_COUNT).fill(CARDS_PER_COLUMN),
    );
  });

  it("sends the other three cards of the beak's rank to the foundations", () => {
    const beak = game.tableaus[0].getCards()[0];

    const started = game.foundations
      .filter((pile) => !pile.isEmpty)
      .map((pile) => [pile.size, pile.topCard?.rank]);

    expect(started).toEqual(Array(3).fill([1, beak.rank]));
  });

  it("deals no other card of the beak's rank to a column", () => {
    const beak = game.tableaus[0].getCards()[0];

    const sameRank = game.tableaus
      .flatMap((pile) => pile.getCards())
      .filter((card) => card.rank === beak.rank);

    expect(sameRank).toEqual([beak]);
  });
});

describe("dealPenguinLayout", () => {
  /** Returns a face-down card of the given suit and rank. */
  function card(suit: Suit, rank: Rank): PlayingCard {
    return makePlayingCard({ id: `${suit}-${rank}`, suit, rank });
  }

  it("sends home a card of the beak's rank that turns up after the last row", () => {
    const column = new CardPile<PlayingCard>("column");
    const foundation = new CardPile<PlayingCard>("foundation");
    const lastSeven = card(Suit.SPADE, Rank.SEVEN);
    // Dealt from the end: the beak, six more to fill the column, then a Seven.
    const deck = [
      lastSeven,
      ...[Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX].map(
        (rank) => card(Suit.CLUB, rank),
      ),
      card(Suit.HEART, Rank.SEVEN),
    ];

    dealPenguinLayout(deck, [foundation], [column]);

    expect(foundation.getCards()).toEqual([lastSeven]);
  });
});

describe("PenguinGame rules", () => {
  let game: PenguinGame;

  beforeEach(() => {
    game = newGame();
    sevensAsBeak(game);
  });

  it("starts a foundation with the beak's rank", () => {
    relocate(game, "card-clubs-7", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-7", game.foundations[1].id);

    expect(moved).toBe(true);
  });

  it("builds a column down in suit, a King on an Ace", () => {
    relocate(game, "card-clubs-ace", game.tableaus[0]);
    relocate(game, "card-clubs-king", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-king", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("moves a whole run with every cell full", () => {
    for (const [index, cell] of game.cells.entries()) {
      relocate(game, `card-spades-${index + 2}`, cell);
    }
    relocate(game, "card-clubs-10", game.tableaus[0]);
    relocate(game, "card-clubs-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[0]);
    relocate(game, "card-clubs-jack", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-10", game.tableaus[1].id);

    expect(moved).toBe(true);
  });

  it("fills a space only with the rank below the beak", () => {
    relocate(game, "card-clubs-6", game.tableaus[1]);
    relocate(game, "card-clubs-king", game.tableaus[2]);

    const moved = [
      game.moveCardToPile("card-clubs-king", game.tableaus[0].id),
      game.moveCardToPile("card-clubs-6", game.tableaus[0].id),
    ];

    expect(moved).toEqual([false, true]);
  });

  it("parks any card in a cell", () => {
    relocate(game, "card-clubs-king", game.tableaus[2]);

    const moved = game.moveCardToPile("card-clubs-king", game.cells[3].id);

    expect(moved).toBe(true);
  });
});

describe("PenguinGame win condition", () => {
  it("is won once every card is on a foundation", () => {
    const sevens = ALL_PLAYING_CARD_IDS.filter(
      (card) => card.rank === Rank.SEVEN,
    );
    const game = newGame(sevens);
    sevensAsBeak(game);
    relocate(game, "card-spades-7", game.foundations[1]);
    relocate(game, "card-diamonds-7", game.foundations[2]);
    relocate(game, "card-clubs-7", game.tableaus[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-7", game.foundations[3].id);

    expect(won).toBe(true);
  });
});
