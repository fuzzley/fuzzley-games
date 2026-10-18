import { beforeEach, describe, expect, it } from "vitest";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { CardTransfer } from "@/engine/tableau/moves/move";
import { anyCard } from "@/engine/tableau/rules/placement";
import { Tabletop } from "@/engine/tableau/game/tabletop";
import { ZoneSpec } from "@/engine/tableau/zones/zone";

/** Returns a pile's zone, taking any card unless told it takes none. */
function zone(id: string, role = "column", accepts = true): ZoneSpec {
  return {
    id,
    role,
    slot: { pileId: id, column: 0, row: 0 },
    layout: { kind: "stacked" },
    accept: accepts ? anyCard : null,
    grab: { kind: "any-face-up" },
    draggable: true,
    face: "card",
  };
}

describe("Tabletop", () => {
  let registry: CardRegistry;
  let tabletop: Tabletop;
  let left: ReadonlyCardPile<PlayingCard>;
  let right: ReadonlyCardPile<PlayingCard>;
  let stock: ReadonlyCardPile<PlayingCard>;

  beforeEach(() => {
    registry = new CardRegistry();
    tabletop = new Tabletop(
      [zone("left"), zone("right"), zone("stock", "stock", false)],
      registry,
    );
    left = tabletop.requirePile("left");
    right = tabletop.requirePile("right");
    stock = tabletop.requirePile("stock");
  });

  /** Puts cards of the given ranks on a pile, bottom first, and returns them. */
  function lay(
    pile: ReadonlyCardPile<PlayingCard>,
    ranks: readonly Rank[],
    faceUp = true,
  ): PlayingCard[] {
    return ranks.map((rank) => {
      const card = registry.getOrCreate({ suit: Suit.HEART, rank });
      tabletop.place(card, pile, faceUp);
      return card;
    });
  }

  /** Returns each pile's cards, bottom first, with the side each shows. */
  function table(): Record<string, string[]> {
    return Object.fromEntries(
      tabletop.piles.map((pile) => [
        pile.id,
        pile.getCards().map((card) => `${card.id}${card.faceUp ? "" : "*"}`),
      ]),
    );
  }

  /** Undoes transfers the way history does: last one first. */
  function reverseAll(transfers: readonly CardTransfer[]): void {
    for (const transfer of [...transfers].reverse()) {
      tabletop.reverse(transfer);
    }
  }

  describe("reading the table", () => {
    it("offers as drop targets only the piles that accept something", () => {
      expect(tabletop.dropTargetPiles.map((pile) => pile.id)).toEqual([
        "left",
        "right",
      ]);
    });

    it("finds every pile of a role, in declaration order", () => {
      expect(tabletop.pilesByRole("column")).toEqual([left, right]);
    });

    it("counts the empty piles of a role", () => {
      lay(left, [Rank.ACE]);

      expect(tabletop.emptyCount("column")).toBe(1);
    });

    it("refuses a pile no zone declares", () => {
      expect(() => tabletop.requirePile("nowhere")).toThrow(/nowhere/);
    });

    it("knows which pile holds a card", () => {
      const [ace] = lay(right, [Rank.ACE]);

      expect(tabletop.pileHolding(ace.id)).toBe(right);
    });
  });

  describe("relocate", () => {
    it("moves the cards onto the pile in the order given", () => {
      const [ace, two] = lay(left, [Rank.ACE, Rank.TWO]);

      tabletop.relocate([two, ace], right);

      expect(right.getCards()).toEqual([two, ace]);
    });

    it("records the cards in the order they sat, whatever order they land in", () => {
      const [ace, two] = lay(left, [Rank.ACE, Rank.TWO]);

      const transfer = tabletop.relocate([two, ace], right);

      expect(transfer.cardIds).toEqual([ace.id, two.id]);
    });

    it("records where they came from, where they went and how they lay", () => {
      const [ace] = lay(stock, [Rank.ACE], false);

      const transfer = tabletop.relocate([ace], left, { faceUp: true });

      expect(transfer).toEqual({
        cardIds: [ace.id],
        fromPileId: "stock",
        toPileId: "left",
        faceUpBefore: false,
      });
    });

    it("turns the cards the way it is told", () => {
      const [ace] = lay(stock, [Rank.ACE], false);

      tabletop.relocate([ace], left, { faceUp: true });

      expect(ace.faceUp).toBe(true);
    });

    it("leaves the cards turned as they were when told nothing", () => {
      const [ace] = lay(stock, [Rank.ACE], false);

      tabletop.relocate([ace], left);

      expect(ace.faceUp).toBe(false);
    });

    it("hands back a transfer that undo turns into the table it found", () => {
      lay(left, [Rank.KING]);
      const drawn = lay(stock, [Rank.ACE, Rank.TWO, Rank.THREE], false);
      const before = table();

      // Drawn top first, the way a stock is turned onto a waste.
      reverseAll([
        tabletop.relocate([...drawn].reverse(), right, { faceUp: true }),
      ]);

      expect(table()).toEqual(before);
    });

    it("refuses cards that are not all in one pile", () => {
      const [ace] = lay(left, [Rank.ACE]);
      const [two] = lay(right, [Rank.TWO]);

      expect(() => tabletop.relocate([ace, two], stock)).toThrow(
        /not all in left/,
      );
    });

    it("refuses cards that are not all turned the same way", () => {
      const [ace] = lay(left, [Rank.ACE], false);
      const [two] = lay(left, [Rank.TWO], true);

      expect(() => tabletop.relocate([ace, two], right)).toThrow(
        /turned the same way/,
      );
    });

    it("refuses a pile from another table, even one with the same id", () => {
      const [ace] = lay(left, [Rank.ACE]);
      const elsewhere = new Tabletop([zone("right")], registry).requirePile(
        "right",
      );

      expect(() => tabletop.relocate([ace], elsewhere)).toThrow(
        /not on this table/,
      );
    });

    it("refuses a card that is on no pile", () => {
      const loose = registry.getOrCreate({ suit: Suit.CLUB, rank: Rank.ACE });

      expect(() => tabletop.relocate([loose], right)).toThrow(/on the table/);
    });
  });

  describe("rearrange", () => {
    it("lays out the new contents of every pile it names", () => {
      const [ace, two] = lay(left, [Rank.ACE, Rank.TWO]);
      const [three] = lay(right, [Rank.THREE]);

      tabletop.rearrange(
        new Map([
          [left, [three]],
          [right, [two, ace]],
        ]),
      );

      expect([left.getCards(), right.getCards()]).toEqual([
        [three],
        [two, ace],
      ]);
    });

    it("hands back transfers that undo turns into the table it found", () => {
      const [ace, two, three] = lay(left, [Rank.ACE, Rank.TWO, Rank.THREE]);
      const [four, five] = lay(right, [Rank.FOUR, Rank.FIVE], false);
      const before = table();

      reverseAll(
        tabletop.rearrange(
          new Map([
            [left, [five, ace, four]],
            [right, [three, two]],
          ]),
        ),
      );

      expect(table()).toEqual(before);
    });

    it("leaves alone, and does not record, a card that keeps its place", () => {
      const [ace, two] = lay(left, [Rank.ACE, Rank.TWO]);
      const [three] = lay(right, [Rank.THREE]);

      const transfers = tabletop.rearrange(
        new Map([
          [left, [ace, three]],
          [right, [two]],
        ]),
      );

      expect(transfers.flatMap((transfer) => transfer.cardIds)).not.toContain(
        ace.id,
      );
    });

    it("keeps the side each card shows", () => {
      const [ace] = lay(left, [Rank.ACE], false);

      tabletop.rearrange(
        new Map([
          [left, []],
          [right, [ace]],
        ]),
      );

      expect(ace.faceUp).toBe(false);
    });

    it("refuses a layout that loses a card", () => {
      lay(left, [Rank.ACE, Rank.TWO]);

      expect(() => tabletop.rearrange(new Map([[left, []]]))).toThrow(
        /same cards/,
      );
    });
  });

  describe("place", () => {
    it("takes a card off the pile it was on", () => {
      const [ace] = lay(left, [Rank.ACE]);

      tabletop.place(ace, right, true);

      expect([left.isEmpty, right.getCards()]).toEqual([true, [ace]]);
    });

    it("turns the card the way it is told", () => {
      const [ace] = lay(left, [Rank.ACE], true);

      tabletop.place(ace, right, false);

      expect(ace.faceUp).toBe(false);
    });
  });

  it("empties every pile when cleared, keeping the cards in play", () => {
    lay(left, [Rank.ACE]);
    lay(right, [Rank.TWO]);

    tabletop.clear();

    expect([tabletop.emptyCount("column"), tabletop.cardsInPlay]).toEqual([
      2, 2,
    ]);
  });
});
