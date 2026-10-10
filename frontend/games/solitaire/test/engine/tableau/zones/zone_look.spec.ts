import { describe, it, expect } from "vitest";
import { PlayingCard, Rank, Suit } from "@/engine/core/card/playing_card";
import { frameFor, showsFace } from "@/engine/tableau/zones/zone_look";
import { makePlayingCard } from "@test/support/card_builder";

/** Returns a card of the given suit and rank, face up unless stated. */
function card(suit: Suit, rank: Rank, faceUp = true): PlayingCard {
  return makePlayingCard({ suit, rank, faceUp, id: `${suit}-${rank}` });
}

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
