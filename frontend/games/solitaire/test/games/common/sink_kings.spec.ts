import { describe, it, expect } from "vitest";
import { Rank, Suit } from "@/engine/core/card/playing_card";
import { sinkKings } from "@/games/common/sink_kings";
import { makePlayingCard } from "@test/support/card_builder";

/** Returns a card of the given rank, with an id naming it. */
function card(id: string, rank: Rank) {
  return makePlayingCard({ id, rank, suit: Suit.SPADE });
}

describe("sinkKings", () => {
  it("moves every King to the bottom, keeping the order of the rest", () => {
    const column = [
      card("five", Rank.FIVE),
      card("king-1", Rank.KING),
      card("two", Rank.TWO),
      card("king-2", Rank.KING),
    ];

    const sunk = sinkKings(column).map((sunkCard) => sunkCard.id);

    expect(sunk).toEqual(["king-1", "king-2", "five", "two"]);
  });

  it("leaves a column without a King as it was", () => {
    const column = [card("five", Rank.FIVE), card("two", Rank.TWO)];

    expect(sinkKings(column)).toEqual(column);
  });
});
