import { CATEGORIES } from "./categories";

describe("CATEGORIES", () => {
  it("gives every category its own id", () => {
    const ids = CATEGORIES.map((category) => category.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
