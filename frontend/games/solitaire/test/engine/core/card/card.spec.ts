import { makeCard } from "@test/support/card_builder";

describe("Card", () => {
  it("exposes the id and faceUp state it was created with", () => {
    const card = makeCard({ id: "test-card", faceUp: true });

    expect(card.id).toBe("test-card");
    expect(card.faceUp).toBe(true);
  });
});
