import { beforeEach, describe, expect, it } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { anyCard } from "@/engine/tableau/rules";
import { Tabletop } from "@/engine/tableau/tabletop";
import { ZoneSpec } from "@/engine/tableau/zone";

/** Returns a pile's zone: any card goes, and nothing is drawn. */
function zone(id: string): ZoneSpec {
  return {
    id,
    role: "column",
    slot: { pileId: id, column: 0, row: 0 },
    layout: { kind: "stacked" },
    accept: anyCard,
    grab: { kind: "any-face-up" },
    draggable: true,
    face: "card",
  };
}

describe("Deal", () => {
  let registry: CardRegistry;
  let tabletop: Tabletop;
  let left: CardPile<PlayingCard>;
  let right: CardPile<PlayingCard>;

  beforeEach(() => {
    registry = new CardRegistry();
    tabletop = new Tabletop([zone("left"), zone("right")], registry);
    left = tabletop.requirePile("left");
    right = tabletop.requirePile("right");
  });

  /** Returns the hearts of the given ranks, in order. */
  function hearts(...ranks: Rank[]): PlayingCard[] {
    return ranks.map((rank) =>
      registry.getOrCreate({ suit: Suit.HEART, rank }),
    );
  }

  /** Returns a deal of the given cards, the last of them dealt first. */
  function dealOf(cards: PlayingCard[]): Deal {
    return new Deal([...cards], tabletop);
  }

  it("deals the last card first", () => {
    const [ace, two] = hearts(Rank.ACE, Rank.TWO);

    expect(dealOf([ace, two]).draw()).toBe(two);
  });

  it("shows the next card without taking it", () => {
    const deal = dealOf(hearts(Rank.ACE, Rank.TWO));

    const next = deal.peek();

    expect([next?.rank, deal.remaining]).toEqual([Rank.TWO, 2]);
  });

  it("deals a card onto a pile, turned the way it is told", () => {
    const [ace] = hearts(Rank.ACE);

    dealOf([ace]).dealTo(left, false);

    expect([left.getCards(), ace.faceUp]).toEqual([[ace], false]);
  });

  it("deals nothing, and says so, once the deck is out", () => {
    expect(dealOf([]).dealTo(left, true)).toBeUndefined();
  });

  it("deals one card to each pile, and says whether it reached them all", () => {
    const deal = dealOf(hearts(Rank.ACE));

    const reachedAll = deal.dealEach([left, right], true);

    expect([reachedAll, left.size, right.size]).toEqual([false, 1, 0]);
  });

  it("deals everything left onto one pile, the last card at the bottom", () => {
    const [ace, two, three] = hearts(Rank.ACE, Rank.TWO, Rank.THREE);

    dealOf([ace, two, three]).dealRest(left, false);

    expect(left.getCards()).toEqual([three, two, ace]);
  });

  it("pulls out every matching card in the order it would deal them", () => {
    const [ace, two, three] = hearts(Rank.ACE, Rank.TWO, Rank.THREE);
    const deal = dealOf([ace, two, three]);

    const odd = deal.pull((card) => card.rank !== Rank.TWO);

    expect([odd, deal.undealt]).toEqual([[three, ace], [two]]);
  });

  it("pulls out the first matching card it would deal", () => {
    const [ace, two, three] = hearts(Rank.ACE, Rank.TWO, Rank.THREE);
    const deal = dealOf([ace, two, three]);

    expect(deal.pullFirst((card) => card.rank !== Rank.TWO)).toBe(three);
  });

  it("puts cards back on top, the first of them dealt first", () => {
    const [ace, two, three] = hearts(Rank.ACE, Rank.TWO, Rank.THREE);
    const deal = dealOf([ace]);

    deal.putBack([two, three]);

    expect([deal.draw(), deal.draw(), deal.draw()]).toEqual([two, three, ace]);
  });

  it("puts a card underneath, to be dealt last", () => {
    const [ace, two] = hearts(Rank.ACE, Rank.TWO);
    const deal = dealOf([ace]);

    deal.putUnder(two);

    expect(deal.undealt).toEqual([two, ace]);
  });

  it("moves a card it places off any pile it was on", () => {
    const [ace] = hearts(Rank.ACE);
    const deal = dealOf([ace]);
    deal.dealTo(left, true);

    deal.place(ace, right, true);

    expect([left.isEmpty, right.getCards()]).toEqual([true, [ace]]);
  });
});
