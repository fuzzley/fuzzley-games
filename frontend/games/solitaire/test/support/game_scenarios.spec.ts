import { describe, expect, it } from "vitest";
import { cardId } from "@test/support/game_scenarios";

describe("cardId", () => {
  it("names a card by rank then suit", () => {
    expect(cardId("QH")).toBe("card-hearts-queen");
  });

  it("reads a Ten as 10 or T", () => {
    expect([cardId("10D"), cardId("TD")]).toEqual([
      "card-diamonds-10",
      "card-diamonds-10",
    ]);
  });

  it("names the second deck's copy after a #", () => {
    expect(cardId("AS#1")).toBe("card-spades-ace#1");
  });

  it("refuses a code that names no card", () => {
    expect(() => cardId("1X")).toThrow('"1X" names no card.');
  });
});
