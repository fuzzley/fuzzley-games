import { describe, it, expect } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import {
  PlayingCard,
  Rank,
  Suit,
  rankBelow,
} from "@/engine/core/card/playing_card";
import { GrabRule, canGrab, grabbedStack } from "@/engine/tableau/rules/grab";
import { BoardQuery } from "@/engine/tableau/rules/board_query";
import { makePlayingCard } from "@test/support/card_builder";

/** A board with no other piles on it, for the rules that never read one. */
const EMPTY_BOARD: BoardQuery = {
  pile: () => undefined,
  pilesByRole: () => [],
  emptyCount: () => 0,
};

function pileWith(...cards: PlayingCard[]): CardPile<PlayingCard> {
  const pile = new CardPile<PlayingCard>("pile", "tableau");
  for (const card of cards) pile.addCard(card);
  return pile;
}

/** Returns a card of the given suit and rank, face up unless stated. */
function card(
  suit: Suit,
  rank: Rank,
  faceUp = true,
  id = `${suit}-${rank}`,
): PlayingCard {
  return makePlayingCard({ suit, rank, faceUp, id });
}

describe("canGrab", () => {
  describe("none", () => {
    const grab: GrabRule = { kind: "none" };

    it("refuses even the top card", () => {
      const top = card(Suit.SPADE, Rank.KING);

      expect(canGrab(grab, top, pileWith(top), EMPTY_BOARD)).toBe(false);
    });
  });

  describe("top-only", () => {
    const grab: GrabRule = { kind: "top-only" };

    it("allows the top card", () => {
      const bottom = card(Suit.SPADE, Rank.KING);
      const top = card(Suit.HEART, Rank.QUEEN);

      expect(canGrab(grab, top, pileWith(bottom, top), EMPTY_BOARD)).toBe(true);
    });

    it("refuses a buried card", () => {
      const bottom = card(Suit.SPADE, Rank.KING);
      const top = card(Suit.HEART, Rank.QUEEN);

      expect(canGrab(grab, bottom, pileWith(bottom, top), EMPTY_BOARD)).toBe(
        false,
      );
    });
  });

  describe("any-face-up", () => {
    const grab: GrabRule = { kind: "any-face-up" };

    it("allows a buried face-up card", () => {
      const bottom = card(Suit.SPADE, Rank.KING);
      const top = card(Suit.HEART, Rank.QUEEN);

      expect(canGrab(grab, bottom, pileWith(bottom, top), EMPTY_BOARD)).toBe(
        true,
      );
    });

    it("refuses a face-down card", () => {
      const down = card(Suit.SPADE, Rank.KING, false);

      expect(canGrab(grab, down, pileWith(down), EMPTY_BOARD)).toBe(false);
    });

    it("allows a broken run, which is why Klondike uses it", () => {
      const king = card(Suit.SPADE, Rank.KING);
      const two = card(Suit.HEART, Rank.TWO);

      expect(canGrab(grab, king, pileWith(king, two), EMPTY_BOARD)).toBe(true);
    });
  });

  describe("run", () => {
    // Descending, alternating colour: the FreeCell and Spider shape.
    const grab: GrabRule = {
      kind: "run",
      adjacent: (lower, upper) => upper.rank === rankBelow(lower.rank),
    };

    it("allows a card whose covering cards descend in order", () => {
      const king = card(Suit.SPADE, Rank.KING);
      const queen = card(Suit.HEART, Rank.QUEEN);
      const jack = card(Suit.SPADE, Rank.JACK);

      expect(
        canGrab(grab, king, pileWith(king, queen, jack), EMPTY_BOARD),
      ).toBe(true);
    });

    it("refuses a card whose covering cards break the run", () => {
      const king = card(Suit.SPADE, Rank.KING);
      const two = card(Suit.HEART, Rank.TWO);

      expect(canGrab(grab, king, pileWith(king, two), EMPTY_BOARD)).toBe(false);
    });

    it("allows the top card, which leads a run of one", () => {
      const king = card(Suit.SPADE, Rank.KING);
      const two = card(Suit.HEART, Rank.TWO);

      expect(canGrab(grab, two, pileWith(king, two), EMPTY_BOARD)).toBe(true);
    });

    it("refuses a face-down card", () => {
      const down = card(Suit.SPADE, Rank.KING, false);

      expect(canGrab(grab, down, pileWith(down), EMPTY_BOARD)).toBe(false);
    });

    it("refuses a card that is not in the pile", () => {
      const absent = card(Suit.CLUB, Rank.FOUR);

      expect(
        canGrab(
          grab,
          absent,
          pileWith(card(Suit.SPADE, Rank.KING)),
          EMPTY_BOARD,
        ),
      ).toBe(false);
    });

    /*
     * The topmost card is never the `lower` of a pair, so a pairwise check
     * alone would never look at its face.
     */
    it("refuses a run whose topmost card is face down", () => {
      const king = card(Suit.SPADE, Rank.KING);
      const queen = card(Suit.HEART, Rank.QUEEN, false);

      expect(canGrab(grab, king, pileWith(king, queen), EMPTY_BOARD)).toBe(
        false,
      );
    });
  });
});

describe("canGrab uncovered", () => {
  const grab: GrabRule = { kind: "uncovered", coveredBy: ["left", "right"] };

  /** Returns a board holding the two covering piles, with the given cards. */
  function boardWith(left: PlayingCard[], right: PlayingCard[]): BoardQuery {
    const piles = new Map([
      ["left", pileWith(...left)],
      ["right", pileWith(...right)],
    ]);
    return {
      pile: (pileId) => piles.get(pileId),
      pilesByRole: () => [],
      emptyCount: () => 0,
    };
  }

  it("lets the top card go once both covering piles are empty", () => {
    const top = card(Suit.HEART, Rank.FIVE);

    expect(canGrab(grab, top, pileWith(top), boardWith([], []))).toBe(true);
  });

  it("holds the card while either covering pile has a card", () => {
    const top = card(Suit.HEART, Rank.FIVE);
    const cover = card(Suit.CLUB, Rank.TWO);

    expect(canGrab(grab, top, pileWith(top), boardWith([], [cover]))).toBe(
      false,
    );
  });

  it("refuses a card beneath the top even when uncovered", () => {
    const bottom = card(Suit.HEART, Rank.FIVE);
    const top = card(Suit.HEART, Rank.SIX);

    expect(
      canGrab(grab, bottom, pileWith(bottom, top), boardWith([], [])),
    ).toBe(false);
  });
});

describe("grabbedStack", () => {
  it("lifts the card and everything stacked on it, bottom first", () => {
    const bottom = card(Suit.SPADE, Rank.NINE);
    const middle = card(Suit.HEART, Rank.FIVE);
    const top = card(Suit.CLUB, Rank.KING);

    expect(
      grabbedStack(
        { kind: "any-face-up" },
        middle,
        pileWith(bottom, middle, top),
        EMPTY_BOARD,
      ),
    ).toEqual([middle, top]);
  });

  it("lifts nothing when the grab rule will not let go", () => {
    const only = card(Suit.SPADE, Rank.NINE);

    expect(
      grabbedStack({ kind: "none" }, only, pileWith(only), EMPTY_BOARD),
    ).toBeNull();
  });

  it("lifts nothing for a card the pile does not hold", () => {
    const stray = card(Suit.SPADE, Rank.NINE);

    expect(
      grabbedStack({ kind: "any-face-up" }, stray, pileWith(), EMPTY_BOARD),
    ).toBeNull();
  });
});
