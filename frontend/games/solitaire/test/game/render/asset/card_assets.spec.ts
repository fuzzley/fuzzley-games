import { describe, it, expect } from "vitest";
import { playingCardIdToFileName } from "@/game/render/asset/card_assets";
import { Suit, Rank } from "@/game/model/card/playing_card";

describe("playingCardIdToFileName", () => {
  it("maps a suit and type to its atlas frame name", () => {
    const fileName = playingCardIdToFileName({
      suit: Suit.HEART,
      rank: Rank.QUEEN,
    });

    expect(fileName).toBe("card-hearts-queen");
  });

  it("throws for an unknown suit", () => {
    expect(() =>
      playingCardIdToFileName({ suit: 999 as Suit, rank: Rank.ACE }),
    ).toThrow("Unknown Suit: 999");
  });

  it("throws for an unknown type", () => {
    expect(() =>
      playingCardIdToFileName({ suit: Suit.SPADE, rank: 999 as Rank }),
    ).toThrow("Unknown Rank: 999");
  });
});
