import { Card } from "../../../src/model/card/card";

describe("Card", () => {
  it("can be created", () => {
    const card: Card = { id: "test-card", faceUp: true };
    expect(card).toBeDefined();
  });
});
