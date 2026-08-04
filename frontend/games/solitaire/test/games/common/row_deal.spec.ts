import { describe, it, expect } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { dealRowFromStock } from "@/games/common/row_deal";
import { makePlayingCard } from "@test/support/card_builder";

/**
 * A face-down stock of `count` cards named `stock-0` upwards, bottom-first —
 * so `stock-0` is at the bottom and the highest-numbered card deals first.
 */
function stockOf(count: number): CardPile<PlayingCard> {
  const stock = new CardPile<PlayingCard>("stock");
  for (let index = 0; index < count; index++) {
    stock.addCard(makePlayingCard({ id: `stock-${index}` }));
  }
  return stock;
}

/** Empty columns named `tableau-0` upwards. */
function columnsOf(count: number): CardPile<PlayingCard>[] {
  return Array.from(
    { length: count },
    (_, index) => new CardPile<PlayingCard>(`tableau-${index}`),
  );
}

/** The ids of a pile's cards, bottom-first. */
function idsIn(pile: CardPile<PlayingCard>): string[] {
  return pile.getCards().map((card) => card.id);
}

describe("dealRowFromStock", () => {
  it("deals one card onto each column", () => {
    const stock = stockOf(10);
    const columns = columnsOf(3);

    dealRowFromStock(stock, columns);

    expect(columns.map((column) => column.size)).toEqual([1, 1, 1]);
  });

  it("deals off the top of the stock, so the first column takes the top card", () => {
    const stock = stockOf(3);
    const columns = columnsOf(3);

    dealRowFromStock(stock, columns);

    expect(columns.map(idsIn)).toEqual([["stock-2"], ["stock-1"], ["stock-0"]]);
  });

  it("turns every card it deals face up", () => {
    const stock = stockOf(3);
    const columns = columnsOf(3);

    dealRowFromStock(stock, columns);

    const dealt = columns.map((column) => column.topCard!.faceUp);
    expect(dealt).toEqual([true, true, true]);
  });

  it("adds to a column that already holds cards", () => {
    const stock = stockOf(1);
    const columns = columnsOf(1);
    columns[0].addCard(makePlayingCard({ id: "already-there" }));

    dealRowFromStock(stock, columns);

    expect(idsIn(columns[0])).toEqual(["already-there", "stock-0"]);
  });

  it("takes the dealt cards out of the stock", () => {
    const stock = stockOf(10);

    dealRowFromStock(stock, columnsOf(4));

    expect(stock.size).toBe(6);
  });

  it("deals as far as a stock too small for the row reaches", () => {
    const stock = stockOf(2);
    const columns = columnsOf(4);

    dealRowFromStock(stock, columns);

    // Spiderette's stock does not divide by its columns, so its last deal is
    // always a short one.
    expect(columns.map((column) => column.size)).toEqual([1, 1, 0, 0]);
  });

  it("deals nothing from an empty stock", () => {
    const columns = columnsOf(3);

    const transfers = dealRowFromStock(stockOf(0), columns);

    expect([transfers, columns.map((column) => column.size)]).toEqual([
      [],
      [0, 0, 0],
    ]);
  });

  it("leaves the columns it was not given alone", () => {
    const stock = stockOf(5);
    const [dealtTo, untouched] = columnsOf(2);

    dealRowFromStock(stock, [dealtTo]);

    // Scorpion empties its stock onto its first three columns only, which is
    // why the columns are a parameter rather than "all of them".
    expect(untouched.size).toBe(0);
  });

  it("reports one transfer per card, in the order they were dealt", () => {
    const stock = stockOf(2);
    const columns = columnsOf(2);

    const transfers = dealRowFromStock(stock, columns);

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
