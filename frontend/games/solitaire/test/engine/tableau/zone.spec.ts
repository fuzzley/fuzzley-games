import { describe, it, expect } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import {
  PlayingCard,
  Rank,
  Suit,
  rankBelow,
} from "@/engine/core/card/playing_card";
import {
  GrabRule,
  ZoneSpec,
  canGrab,
  frameFor,
  hasRoomFor,
  runColumn,
  showsFace,
} from "@/engine/tableau/zone";
import {
  BoardQuery,
  PlacementRule,
  cardIs,
  hasRank,
  isSameSuitRun,
  never,
} from "@/engine/tableau/rules";
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

describe("showsFace", () => {
  const faceUp = card(Suit.HEART, Rank.QUEEN);
  const faceDown = card(Suit.HEART, Rank.QUEEN, false);

  it("hides the face in an always-down zone even when the card is face up", () => {
    expect(showsFace("always-down", faceUp)).toBe(false);
  });

  it("shows the face in an always-up zone even when the card is face down", () => {
    expect(showsFace("always-up", faceDown)).toBe(true);
  });

  it("defers to a face-up card in a card-driven zone", () => {
    expect(showsFace("card", faceUp)).toBe(true);
  });

  it("defers to a face-down card in a card-driven zone", () => {
    expect(showsFace("card", faceDown)).toBe(false);
  });
});

describe("frameFor", () => {
  const faceUp = card(Suit.HEART, Rank.QUEEN);
  const faceDown = card(Suit.HEART, Rank.QUEEN, false);

  it("shows the back for an always-down zone even when the card is face up", () => {
    expect(frameFor("always-down", faceUp, "back")).toBe("back");
  });

  it("shows the face for an always-up zone even when the card is face down", () => {
    expect(frameFor("always-up", faceDown, "back")).toBe(faceDown.faceKey);
  });

  it("defers to a face-up card in a card-driven zone", () => {
    expect(frameFor("card", faceUp, "back")).toBe(faceUp.faceKey);
  });

  it("defers to a face-down card in a card-driven zone", () => {
    expect(frameFor("card", faceDown, "back")).toBe("back");
  });
});

describe("hasRoomFor", () => {
  function zone(capacity?: number): ZoneSpec {
    return {
      id: "cell",
      role: "cell",
      slot: { pileId: "cell", column: 0, row: 0 },
      layout: { kind: "stacked" },
      capacity,
      accept: never,
      grab: { kind: "top-only" },
      draggable: true,
      face: "always-up",
    };
  }

  it("accepts a card into an empty single-card zone", () => {
    expect(hasRoomFor(zone(1), pileWith(), 1)).toBe(true);
  });

  it("refuses a second card into a single-card zone", () => {
    const occupied = pileWith(card(Suit.SPADE, Rank.KING));

    expect(hasRoomFor(zone(1), occupied, 1)).toBe(false);
  });

  it("refuses a stack larger than the remaining room", () => {
    expect(hasRoomFor(zone(1), pileWith(), 2)).toBe(false);
  });

  it("accepts anything into a zone with no stated capacity", () => {
    const long = pileWith(
      ...Array.from({ length: 20 }, (_, i) =>
        card(Suit.SPADE, Rank.TWO, true, `c${i}`),
      ),
    );

    expect(hasRoomFor(zone(), long, 10)).toBe(true);
  });
});

describe("runColumn", () => {
  /** A column built down in suit, taking only a King when empty. */
  const column = runColumn({
    adjacent: isSameSuitRun,
    whenEmpty: cardIs(hasRank(Rank.KING)),
  });

  /** Asks whether `rule` lets `movingStack` land on `target`. */
  function lands(
    rule: PlacementRule,
    target: CardPile<PlayingCard>,
    movingStack: PlayingCard[],
  ): boolean {
    return rule({
      card: movingStack[0],
      movingStack,
      sourcePile: pileWith(),
      targetPile: target,
      board: EMPTY_BOARD,
    });
  }

  it("lands a card that sits on the top card by the adjacency", () => {
    const target = pileWith(card(Suit.SPADE, Rank.NINE));

    expect(lands(column.accept, target, [card(Suit.SPADE, Rank.EIGHT)])).toBe(
      true,
    );
  });

  it("refuses a card the adjacency does not allow", () => {
    const target = pileWith(card(Suit.SPADE, Rank.NINE));

    expect(lands(column.accept, target, [card(Suit.HEART, Rank.EIGHT)])).toBe(
      false,
    );
  });

  it("asks the empty-column rule of an empty column", () => {
    expect(
      lands(column.accept, pileWith(), [card(Suit.SPADE, Rank.QUEEN)]),
    ).toBe(false);
  });

  it("lifts runs by the same adjacency it lands them by", () => {
    expect(column.grab).toEqual({ kind: "run", adjacent: isSameSuitRun });
  });

  it("refuses a stack longer than the limit allows", () => {
    const capped = runColumn({
      adjacent: isSameSuitRun,
      whenEmpty: never,
      maxStack: () => 1,
    });
    const target = pileWith(card(Suit.SPADE, Rank.TEN));

    expect(
      lands(capped.accept, target, [
        card(Suit.SPADE, Rank.NINE),
        card(Suit.SPADE, Rank.EIGHT),
      ]),
    ).toBe(false);
  });
});
