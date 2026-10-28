import { CATEGORIES } from "./categories";
import { GAMES } from "./games";

describe("CATEGORIES", () => {
  it("gives every category its own id", () => {
    const ids = CATEGORIES.map((category) => category.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("holds a game in every category", () => {
    const empty = CATEGORIES.filter(
      ({ id }) => !GAMES.some((game) => game.category === id),
    ).map(({ id }) => id);

    expect(empty).toEqual([]);
  });
});
