import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { NestorGame } from "@/games/nestor/nestor_game";
import { CARDS_PER_COLUMN, dealNestorLayout } from "@/games/nestor/nestor_deal";
import { TABLEAU_COUNT } from "@/games/nestor/nestor_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";
import { makePlayingCard } from "@test/support/card_builder";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  cardIds: typeof ALL_PLAYING_CARD_IDS = ALL_PLAYING_CARD_IDS,
): NestorGame {
  const game = new NestorGame({
    cardIds,
    random: sequenceRandom(SHUFFLE_VALUES),
  });
  game.startNewGame();
  return game;
}

describe("NestorGame deal", () => {
  let game: NestorGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals eight columns of six and a reserve of four", () => {
    const sizes = [...game.tableaus, ...game.reserves].map((pile) => pile.size);

    expect(sizes).toEqual([
      ...Array<number>(TABLEAU_COUNT).fill(CARDS_PER_COLUMN),
      1,
      1,
      1,
      1,
    ]);
  });

  it("deals no column two cards of the same rank", () => {
    const repeating = game.tableaus.filter((pile) => {
      const ranks = pile.getCards().map((card) => card.rank);
      return new Set(ranks).size !== ranks.length;
    });

    expect(repeating).toEqual([]);
  });
});

describe("dealNestorLayout", () => {
  /** Returns a face-down card of the given suit and rank. */
  function card(suit: Suit, rank: Rank): PlayingCard {
    return makePlayingCard({ id: `${suit}-${rank}`, suit, rank });
  }

  it("passes over a card that repeats a rank in its column", () => {
    const column = new CardPile<PlayingCard>("column");
    // Dealt from the end: the Ace of hearts, then the other Ace, then the Two.
    const deck = [
      card(Suit.CLUB, Rank.TWO),
      card(Suit.SPADE, Rank.ACE),
      card(Suit.HEART, Rank.ACE),
    ];

    dealNestorLayout(deck, [column], []);

    expect(column.getCards().map((dealt) => dealt.rank)).toEqual([
      Rank.ACE,
      Rank.TWO,
      Rank.ACE,
    ]);
  });

  it("gives the rule up when every card left repeats a rank", () => {
    const column = new CardPile<PlayingCard>("column");
    const deck = [card(Suit.SPADE, Rank.ACE), card(Suit.HEART, Rank.ACE)];

    dealNestorLayout(deck, [column], []);

    expect(column.size).toBe(2);
  });
});

describe("NestorGame pairing", () => {
  let game: NestorGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("discards two free cards of the same rank", () => {
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-9", game.tableaus[1]);

    game.moveCardToPile("card-clubs-9", game.tableaus[0].id);

    expect(game.discard.getCards().map((card) => card.id)).toEqual([
      "card-hearts-9",
      "card-clubs-9",
    ]);
  });

  it("pairs a reserve card with a column", () => {
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-9", game.reserves[2]);

    const moved = game.moveCardToPile("card-clubs-9", game.tableaus[0].id);

    expect([moved, game.reserves[2].isEmpty]).toEqual([true, true]);
  });

  it("refuses two cards of different ranks", () => {
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-8", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("refuses a card buried under another", () => {
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-9", game.tableaus[1]);
    relocate(game, "card-spades-2", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-9", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("puts both cards of a pair back in one undo", () => {
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-9", game.tableaus[1]);
    game.moveCardToPile("card-clubs-9", game.tableaus[0].id);

    game.undo();

    expect([
      game.tableaus[0].topCard?.id,
      game.tableaus[1].topCard?.id,
      game.discard.size,
    ]).toEqual(["card-hearts-9", "card-clubs-9", 0]);
  });

  it("pairs a card with its partner on a double press", () => {
    relocate(game, "card-hearts-9", game.tableaus[3]);
    relocate(game, "card-clubs-9", game.reserves[0]);

    game.autoMoveCard("card-clubs-9");

    expect(game.discard.size).toBe(2);
  });
});

describe("NestorGame win condition", () => {
  it("is won once every card is discarded", () => {
    const nines = ALL_PLAYING_CARD_IDS.filter(
      (card) =>
        card.rank === Rank.NINE &&
        (card.suit === Suit.HEART || card.suit === Suit.CLUB),
    );
    const game = newGame(nines);
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-9", game.reserves[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile("card-clubs-9", game.tableaus[0].id);

    expect(won).toBe(true);
  });
});
