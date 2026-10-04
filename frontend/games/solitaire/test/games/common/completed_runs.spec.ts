import { describe, it, expect, beforeEach } from "vitest";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import {
  ALL_RANKS,
  PlayingCard,
  Rank,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import {
  RUN_LENGTH,
  collectCompletedRuns,
  completedRunStart,
  flipExposedTop,
} from "@/games/common/completed_runs";
import { makePlayingCard } from "@test/support/card_builder";
import { TestTabletop } from "@test/support/test_tabletop";

/** The table each test's piles lie on, fresh for every test. */
let table: TestTabletop;

beforeEach(() => {
  table = new TestTabletop([
    "tableau-0",
    "tableau-1",
    "foundation-0",
    "foundation-1",
  ]);
});

/** Returns a card named as a single-deck game names it, face up by default. */
function card(suit: Suit, rank: Rank, faceUp = true): PlayingCard {
  return makePlayingCard({
    id: playingCardInstanceId({ suit, rank }),
    suit,
    rank,
    faceUp,
  });
}

/** Returns King down to Ace of one suit, bottom first: a finished run. */
function fullRun(suit: Suit = Suit.SPADE): PlayingCard[] {
  return [...ALL_RANKS].reverse().map((rank) => card(suit, rank));
}

/** Returns a pile holding the given cards, bottom first. */
function pileOf(
  id: string,
  cards: readonly PlayingCard[] = [],
): ReadonlyCardPile<PlayingCard> {
  return table.fill(id, cards);
}

/** Returns the ids of a pile's cards, bottom first. */
function idsIn(pile: ReadonlyCardPile<PlayingCard>): string[] {
  return pile.getCards().map((pileCard) => pileCard.id);
}

describe("completedRunStart", () => {
  it("finds a run that fills the whole column", () => {
    const cards = fullRun();

    expect(completedRunStart(cards)).toBe(0);
  });

  it("finds a run sitting on top of other cards", () => {
    const cards = [card(Suit.HEART, Rank.FOUR), ...fullRun()];

    expect(completedRunStart(cards)).toBe(1);
  });

  it("finds no run in a column shorter than thirteen cards", () => {
    const cards = fullRun().slice(1);

    expect(completedRunStart(cards)).toBe(-1);
  });

  it("finds no run in an empty column", () => {
    expect(completedRunStart([])).toBe(-1);
  });

  it("leaves a run alone once another card is stacked on it", () => {
    const cards = [...fullRun(), card(Suit.HEART, Rank.FOUR)];

    // Scorpion lets a player drop an Ace with cards resting on it, which
    // finishes a run that is no longer at the top of its column. It stays put
    // until the covering card moves away.
    expect(completedRunStart(cards)).toBe(-1);
  });

  it("finds no run in thirteen cards that do not start on a King", () => {
    const cards = [...fullRun().slice(1), card(Suit.HEART, Rank.KING)];

    expect(completedRunStart(cards)).toBe(-1);
  });

  it("finds no run in thirteen cards that do not end on an Ace", () => {
    const cards = [card(Suit.SPADE, Rank.KING), ...fullRun().slice(0, 12)];

    expect(completedRunStart(cards)).toBe(-1);
  });

  it("finds no run when a card in the middle breaks the sequence", () => {
    const cards = fullRun();
    cards[5] = card(Suit.SPADE, Rank.TWO);

    expect(completedRunStart(cards)).toBe(-1);
  });

  it("finds no run when a card in the middle changes suit", () => {
    const cards = fullRun();
    cards[5] = card(Suit.HEART, cards[5].rank);

    expect(completedRunStart(cards)).toBe(-1);
  });

  it("finds no run while one of its cards is still face down", () => {
    const cards = fullRun();
    cards[5].faceUp = false;

    expect(completedRunStart(cards)).toBe(-1);
  });
});

describe("flipExposedTop", () => {
  it("turns a face-down top card over", () => {
    const top = card(Suit.SPADE, Rank.FIVE, false);
    const pile = pileOf("tableau-0", [card(Suit.HEART, Rank.TWO, false), top]);

    const flipped = flipExposedTop(pile);

    expect([flipped, top.faceUp]).toEqual([top, true]);
  });

  it("leaves a card that is already face up alone", () => {
    const pile = pileOf("tableau-0", [card(Suit.SPADE, Rank.FIVE)]);

    expect(flipExposedTop(pile)).toBeUndefined();
  });

  it("turns nothing over in an empty pile", () => {
    expect(flipExposedTop(pileOf("tableau-0"))).toBeUndefined();
  });

  it("leaves the cards beneath the top one face down", () => {
    const buried = card(Suit.HEART, Rank.TWO, false);
    const pile = pileOf("tableau-0", [buried, card(Suit.SPADE, Rank.FIVE)]);

    flipExposedTop(pile);

    expect(buried.faceUp).toBe(false);
  });
});

describe("collectCompletedRuns", () => {
  it("sends a completed run to an empty foundation, King first", () => {
    const run = fullRun();
    const tableau = pileOf("tableau-0", run);
    const foundation = pileOf("foundation-0");

    collectCompletedRuns(table.tabletop, [tableau], [foundation]);

    expect([tableau.size, idsIn(foundation)]).toEqual([
      0,
      run.map((runCard) => runCard.id),
    ]);
  });

  it("reports the run it moved as a single transfer", () => {
    const run = fullRun();
    const tableau = pileOf("tableau-0", run);
    const foundation = pileOf("foundation-0");

    const { transfers } = collectCompletedRuns(
      table.tabletop,
      [tableau],
      [foundation],
    );

    expect(transfers).toEqual([
      {
        cardIds: run.map((runCard) => runCard.id),
        fromPileId: "tableau-0",
        toPileId: "foundation-0",
        faceUpBefore: true,
      },
    ]);
  });

  it("leaves the cards the run was sitting on behind", () => {
    const buried = card(Suit.HEART, Rank.FOUR);
    const tableau = pileOf("tableau-0", [buried, ...fullRun()]);

    collectCompletedRuns(table.tabletop, [tableau], [pileOf("foundation-0")]);

    expect(idsIn(tableau)).toEqual([buried.id]);
  });

  it("turns over the card the run uncovered", () => {
    const buried = card(Suit.HEART, Rank.FOUR, false);
    const tableau = pileOf("tableau-0", [buried, ...fullRun()]);

    const { flippedCardIds } = collectCompletedRuns(
      table.tabletop,
      [tableau],
      [pileOf("foundation-0")],
    );

    expect([flippedCardIds, buried.faceUp]).toEqual([[buried.id], true]);
  });

  it("reports no flip when the run left the column empty", () => {
    const tableau = pileOf("tableau-0", fullRun());

    const { flippedCardIds } = collectCompletedRuns(
      table.tabletop,
      [tableau],
      [pileOf("foundation-0")],
    );

    expect(flippedCardIds).toEqual([]);
  });

  it("collects two runs finished by the same move", () => {
    const spades = pileOf("tableau-0", fullRun(Suit.SPADE));
    const hearts = pileOf("tableau-1", fullRun(Suit.HEART));
    const foundations = [pileOf("foundation-0"), pileOf("foundation-1")];

    collectCompletedRuns(table.tabletop, [spades, hearts], foundations);

    expect([spades.size, hearts.size, foundations[1].size]).toEqual([
      0,
      0,
      RUN_LENGTH,
    ]);
  });

  it("leaves a run in place when every foundation is taken", () => {
    const tableau = pileOf("tableau-0", fullRun(Suit.SPADE));
    const foundation = pileOf("foundation-0", fullRun(Suit.HEART));

    const { transfers } = collectCompletedRuns(
      table.tabletop,
      [tableau],
      [foundation],
    );

    expect([tableau.size, transfers]).toEqual([RUN_LENGTH, []]);
  });

  it("moves nothing when no column has finished a run", () => {
    const tableau = pileOf("tableau-0", fullRun().slice(1));

    const result = collectCompletedRuns(
      table.tabletop,
      [tableau],
      [pileOf("foundation-0")],
    );

    expect(result).toEqual({ transfers: [], flippedCardIds: [] });
  });
});
