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
} from "@/engine/tableau/zone";
import { never } from "@/engine/tableau/rules";
import { makePlayingCard } from "@test/support/card_builder";

function pileWith(...cards: PlayingCard[]): CardPile<PlayingCard> {
  const pile = new CardPile<PlayingCard>("pile", "tableau");
  for (const card of cards) pile.addCard(card);
  return pile;
}

/** A card that knows its own suit and rank, face up unless stated. */
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

      expect(canGrab(grab, top, pileWith(top))).toBe(false);
    });
  });

  describe("top-only", () => {
    const grab: GrabRule = { kind: "top-only" };

    it("allows the top card", () => {
      const bottom = card(Suit.SPADE, Rank.KING);
      const top = card(Suit.HEART, Rank.QUEEN);

      expect(canGrab(grab, top, pileWith(bottom, top))).toBe(true);
    });

    it("refuses a buried card", () => {
      const bottom = card(Suit.SPADE, Rank.KING);
      const top = card(Suit.HEART, Rank.QUEEN);

      expect(canGrab(grab, bottom, pileWith(bottom, top))).toBe(false);
    });
  });

  describe("any-face-up", () => {
    const grab: GrabRule = { kind: "any-face-up" };

    it("allows a buried face-up card", () => {
      const bottom = card(Suit.SPADE, Rank.KING);
      const top = card(Suit.HEART, Rank.QUEEN);

      expect(canGrab(grab, bottom, pileWith(bottom, top))).toBe(true);
    });

    it("refuses a face-down card", () => {
      const down = card(Suit.SPADE, Rank.KING, false);

      expect(canGrab(grab, down, pileWith(down))).toBe(false);
    });

    it("allows a broken run, which is why Klondike uses it", () => {
      const king = card(Suit.SPADE, Rank.KING);
      const two = card(Suit.HEART, Rank.TWO);

      expect(canGrab(grab, king, pileWith(king, two))).toBe(true);
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

      expect(canGrab(grab, king, pileWith(king, queen, jack))).toBe(true);
    });

    it("refuses a card whose covering cards break the run", () => {
      const king = card(Suit.SPADE, Rank.KING);
      const two = card(Suit.HEART, Rank.TWO);

      expect(canGrab(grab, king, pileWith(king, two))).toBe(false);
    });

    it("allows the top card, which leads a run of one", () => {
      const king = card(Suit.SPADE, Rank.KING);
      const two = card(Suit.HEART, Rank.TWO);

      expect(canGrab(grab, two, pileWith(king, two))).toBe(true);
    });

    it("refuses a face-down card", () => {
      const down = card(Suit.SPADE, Rank.KING, false);

      expect(canGrab(grab, down, pileWith(down))).toBe(false);
    });

    it("refuses a card that is not in the pile", () => {
      const absent = card(Suit.CLUB, Rank.FOUR);

      expect(canGrab(grab, absent, pileWith(card(Suit.SPADE, Rank.KING)))).toBe(
        false,
      );
    });
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
