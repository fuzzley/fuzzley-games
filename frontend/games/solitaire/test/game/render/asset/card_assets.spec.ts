import { describe, it, expect } from "vitest";
import { playingCardIdToFileName } from "@/game/render/asset/card_assets";
import { Suit, Type } from "@/game/model/card/playing_card";

describe("playingCardIdToFileName", () => {
  it("maps a suit and type to its atlas frame name", () => {
    const fileName = playingCardIdToFileName({
      suit: Suit.HEART,
      type: Type.QUEEN,
    });

    expect(fileName).toBe("card-hearts-queen");
  });

  it("throws for an unknown suit", () => {
    expect(() =>
      playingCardIdToFileName({ suit: 999 as Suit, type: Type.ACE }),
    ).toThrow("Unknown Suit: 999");
  });

  it("throws for an unknown type", () => {
    expect(() =>
      playingCardIdToFileName({ suit: Suit.SPADE, type: 999 as Type }),
    ).toThrow("Unknown Type: 999");
  });
});
