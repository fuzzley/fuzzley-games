import { GAMES } from "./games";

// The rules every entry in the catalog keeps, whatever games it lists.
describe("GAMES", () => {
  it("gives every game its own slug", () => {
    const slugs = GAMES.map((game) => game.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses lowercase words and hyphens for slugs", () => {
    const bad = GAMES.filter(
      (game) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(game.slug),
    );

    expect(bad).toEqual([]);
  });

  it("gives each hosted game its own place to be played", () => {
    const locations = GAMES.flatMap((game) =>
      game.play ? [`${game.play.build}#${game.play.id ?? ""}`] : [],
    );

    expect(new Set(locations).size).toBe(locations.length);
  });

  it("dates every game with a real ISO date", () => {
    const bad = GAMES.filter(
      (game) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(game.added) ||
        Number.isNaN(Date.parse(game.added)),
    );

    expect(bad).toEqual([]);
  });

  it("gives every game a sensible number of players and length", () => {
    const bad = GAMES.filter(
      ({ players, minutes }) =>
        !Number.isInteger(players.min) ||
        players.min < 1 ||
        players.max < players.min ||
        !Number.isInteger(minutes) ||
        minutes < 1,
    );

    expect(bad).toEqual([]);
  });
});
