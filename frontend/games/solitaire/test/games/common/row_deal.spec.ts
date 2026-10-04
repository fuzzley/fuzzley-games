import { describe, it, expect, beforeEach } from "vitest";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_RANKS, PlayingCard, Rank } from "@/engine/core/card/playing_card";
import {
  dealRowCollectingRuns,
  dealRowFromStock,
} from "@/games/common/row_deal";
import { makePlayingCard } from "@test/support/card_builder";
import { TestTabletop } from "@test/support/test_tabletop";

/** The table each test's piles lie on, fresh for every test. */
let table: TestTabletop;

beforeEach(() => {
  table = new TestTabletop([
    "stock",
    "tableau-0",
    "tableau-1",
    "tableau-2",
    "tableau-3",
    "foundation-0",
  ]);
});

/**
 * Returns a face-down stock of `count` cards named `stock-0` upwards, bottom
 * first, so the highest-numbered card deals first.
 */
function stockOf(count: number): ReadonlyCardPile<PlayingCard> {
  return table.fill(
    "stock",
    Array.from({ length: count }, (_, index) =>
      makePlayingCard({ id: `stock-${index}` }),
    ),
  );
}

/** Returns empty columns named `tableau-0` upwards. */
function columnsOf(count: number): ReadonlyCardPile<PlayingCard>[] {
  return Array.from({ length: count }, (_, index) =>
    table.pile(`tableau-${index}`),
  );
}

/** Returns the ids of a pile's cards, bottom first. */
function idsIn(pile: ReadonlyCardPile<PlayingCard>): string[] {
  return pile.getCards().map((card) => card.id);
}

/** Returns a face-up spade of the given rank, named for its rank. */
function spade(rank: Rank, faceUp = true): PlayingCard {
  return makePlayingCard({ id: `spade-${rank}`, rank, faceUp });
}

/** Returns a pile holding the given cards, bottom first. */
function pileOf(
  id: string,
  cards: readonly PlayingCard[] = [],
): ReadonlyCardPile<PlayingCard> {
  return table.fill(id, cards);
}

/** Returns King down to Two of spades, bottom first: a run the Ace finishes. */
function runAwaitingAce(): PlayingCard[] {
  return [...ALL_RANKS]
    .reverse()
    .filter((rank) => rank !== Rank.ACE)
    .map((rank) => spade(rank));
}

describe("dealRowFromStock", () => {
  it("deals one card onto each column", () => {
    const stock = stockOf(10);
    const columns = columnsOf(3);

    dealRowFromStock(table.tabletop, stock, columns);

    expect(columns.map((column) => column.size)).toEqual([1, 1, 1]);
  });

  it("deals off the top of the stock, so the first column takes the top card", () => {
    const stock = stockOf(3);
    const columns = columnsOf(3);

    dealRowFromStock(table.tabletop, stock, columns);

    expect(columns.map(idsIn)).toEqual([["stock-2"], ["stock-1"], ["stock-0"]]);
  });

  it("turns every card it deals face up", () => {
    const stock = stockOf(3);
    const columns = columnsOf(3);

    dealRowFromStock(table.tabletop, stock, columns);

    const dealt = columns.map((column) => column.topCard!.faceUp);
    expect(dealt).toEqual([true, true, true]);
  });

  it("adds to a column that already holds cards", () => {
    const stock = stockOf(1);
    const columns = columnsOf(1);
    table.fill("tableau-0", [makePlayingCard({ id: "already-there" })]);

    dealRowFromStock(table.tabletop, stock, columns);

    expect(idsIn(columns[0])).toEqual(["already-there", "stock-0"]);
  });

  it("takes the dealt cards out of the stock", () => {
    const stock = stockOf(10);

    dealRowFromStock(table.tabletop, stock, columnsOf(4));

    expect(stock.size).toBe(6);
  });

  it("deals as far as a stock too small for the row reaches", () => {
    const stock = stockOf(2);
    const columns = columnsOf(4);

    dealRowFromStock(table.tabletop, stock, columns);

    // Spiderette's stock does not divide by its columns, so its last deal is
    // always a short one.
    expect(columns.map((column) => column.size)).toEqual([1, 1, 0, 0]);
  });

  it("deals nothing from an empty stock", () => {
    const columns = columnsOf(3);

    const transfers = dealRowFromStock(table.tabletop, stockOf(0), columns);

    expect([transfers, columns.map((column) => column.size)]).toEqual([
      [],
      [0, 0, 0],
    ]);
  });

  it("leaves the columns it was not given alone", () => {
    const stock = stockOf(5);
    const [dealtTo, untouched] = columnsOf(2);

    dealRowFromStock(table.tabletop, stock, [dealtTo]);

    // Scorpion empties its stock onto its first three columns only, which is
    // why the columns are a parameter rather than "all of them".
    expect(untouched.size).toBe(0);
  });

  it("reports one transfer per card, in the order they were dealt", () => {
    const stock = stockOf(2);
    const columns = columnsOf(2);

    const transfers = dealRowFromStock(table.tabletop, stock, columns);

    expect(transfers).toEqual([
      {
        cardIds: ["stock-1"],
        fromPileId: "stock",
        toPileId: "tableau-0",
        faceUpBefore: false,
      },
      {
        cardIds: ["stock-0"],
        fromPileId: "stock",
        toPileId: "tableau-1",
        faceUpBefore: false,
      },
    ]);
  });
});

describe("dealRowCollectingRuns", () => {
  it("sends a run the dealt card completes to a foundation", () => {
    const column = pileOf("tableau-0", runAwaitingAce());
    const foundation = pileOf("foundation-0");

    dealRowCollectingRuns(
      table.tabletop,
      pileOf("stock", [spade(Rank.ACE, false)]),
      [column],
      [column],
      [foundation],
    );

    expect([column.size, foundation.size]).toEqual([0, 13]);
  });

  it("reports the deal and then the run it completed, as one action", () => {
    const column = pileOf("tableau-0", runAwaitingAce());

    const { transfers } = dealRowCollectingRuns(
      table.tabletop,
      pileOf("stock", [spade(Rank.ACE, false)]),
      [column],
      [column],
      [pileOf("foundation-0")],
    );

    expect(transfers.map((t) => [t.fromPileId, t.toPileId])).toEqual([
      ["stock", "tableau-0"],
      ["tableau-0", "foundation-0"],
    ]);
  });

  it("collects a finished run from a column it did not deal to", () => {
    const dealtTo = pileOf("tableau-0");
    const finished = pileOf("tableau-1", [
      ...runAwaitingAce(),
      spade(Rank.ACE),
    ]);
    const foundation = pileOf("foundation-0");

    dealRowCollectingRuns(
      table.tabletop,
      stockOf(1),
      [dealtTo],
      [dealtTo, finished],
      [foundation],
    );

    expect(foundation.size).toBe(13);
  });

  it("reports a card that taking a run off turned face up", () => {
    const buried = makePlayingCard({ id: "buried", faceUp: false });
    const column = pileOf("tableau-0", [buried, ...runAwaitingAce()]);

    const { flippedCardIds } = dealRowCollectingRuns(
      table.tabletop,
      pileOf("stock", [spade(Rank.ACE, false)]),
      [column],
      [column],
      [pileOf("foundation-0")],
    );

    expect(flippedCardIds).toEqual(["buried"]);
  });
});
