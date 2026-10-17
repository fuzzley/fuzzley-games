import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  GAMES,
  Game,
  findGame,
  gamesIn,
  isNew,
  matchesQuery,
  playUrl,
  screenshotUrl,
} from "./game_catalog";

describe("catalog", () => {
  const klondike = findGame("klondike")!;
  const daysAfter = (iso: string, n: number) =>
    new Date(new Date(iso).getTime() + n * 24 * 60 * 60 * 1000);

  it("gives every game a unique slug and a known category", () => {
    expect(new Set(GAMES.map((game) => game.slug)).size).toBe(GAMES.length);
    const ids = CATEGORIES.map((category) => category.id);
    GAMES.forEach((game) => expect(ids).toContain(game.category));
  });

  it("plays every solitaire game from the Solitaire Collection", () => {
    const builds = gamesIn("solitaire").map((game) => game.play?.build);

    expect(builds).toHaveLength(41);
    expect(new Set(builds)).toEqual(new Set(["solitaire"]));
  });

  it("gives each game in a build its own id", () => {
    const ids = GAMES.flatMap((game) => (game.play ? [game.play.id] : []));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no way yet to play the classics", () => {
    const classics = gamesIn("classics");

    expect(classics.map((game) => game.slug)).toEqual([
      "minesweeper",
      "sudoku",
      "reversi",
    ]);
    expect(classics.filter((game) => game.play)).toEqual([]);
  });

  it("matches on name, category and blurb, ignoring case", () => {
    expect(matchesQuery(klondike, "KLON")).toBe(true);
    expect(matchesQuery(klondike, "solitaire")).toBe(true);
    expect(matchesQuery(klondike, "stock")).toBe(true);
    expect(matchesQuery(klondike, "mine")).toBe(false);
  });

  it("matches a game by its other names", () => {
    expect(matchesQuery(klondike, "whitehead")).toBe(true);
    expect(matchesQuery(findGame("beleaguered-castle")!, "alleys")).toBe(true);
  });

  it("ignores apostrophes", () => {
    const bakers = findGame("bakers-game")!;

    expect(matchesQuery(bakers, "bakers")).toBe(true);
    expect(matchesQuery(bakers, "baker's game")).toBe(true);
  });

  it("needs every word of the query to match", () => {
    expect(matchesQuery(klondike, "solitaire classic")).toBe(true);
    expect(matchesQuery(klondike, "solitaire hearts")).toBe(false);
  });

  it("marks a game added after the site opened as new for 30 days", () => {
    const later: Game = { ...klondike, added: "2026-11-02" };

    expect(isNew(later, daysAfter(later.added, 29))).toBe(true);
    expect(isNew(later, daysAfter(later.added, 31))).toBe(false);
  });

  it("never marks the games the site opened with as new", () => {
    expect(isNew(klondike, new Date(klondike.added))).toBe(false);
  });

  it("never marks a game still to come as new", () => {
    const sudoku: Game = { ...findGame("sudoku")!, added: "2026-11-02" };

    expect(isNew(sudoku, new Date(sudoku.added))).toBe(false);
  });

  it("plays a game at its build's hash route", () => {
    expect(playUrl(findGame("bakers-dozen")!.play!)).toBe(
      "/play/solitaire/#/bakersdozen",
    );
  });

  it("shows the screenshots its build ships", () => {
    expect(screenshotUrl(klondike.play!, "thumb")).toBe(
      "/play/solitaire/docs/screenshots/klondike/thumb.webp",
    );
  });
});
