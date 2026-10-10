import { describe, it, expect } from "vitest";
import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { ZoneSpec, hasRoomFor } from "@/engine/tableau/zones/zone";
import { never } from "@/engine/tableau/rules/placement";
import { makePlayingCard } from "@test/support/card_builder";

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
