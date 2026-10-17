import { TestBed } from "@angular/core/testing";
import type { Game } from "../model/game";
import { provideTestCatalog, testGame } from "../testing/catalog";
import { GameCatalog } from "./game_catalog.service";

describe("GameCatalog", () => {
  const klondike = testGame("klondike");
  let catalog: GameCatalog;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTestCatalog()] });
    catalog = TestBed.inject(GameCatalog);
  });

  function daysAfter(iso: string, days: number): Date {
    return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000);
  }

  function addedOn(game: Game, added: string): Game {
    return { ...game, added };
  }

  it("finds a game by its slug", () => {
    expect(catalog.findGame("bakers-game")?.name).toBe("Baker’s Game");
  });

  it("finds no game for an unknown slug", () => {
    expect(catalog.findGame("hearts")).toBeUndefined();
  });

  it("finds no category for an unknown id", () => {
    expect(catalog.findCategory("cards")).toBeUndefined();
  });

  it("gives a game's category", () => {
    expect(catalog.categoryOf(klondike).name).toBe("Solitaire");
  });

  it("lists a category's games in the catalog's order", () => {
    expect(catalog.gamesIn("classics").map((game) => game.slug)).toEqual([
      "minesweeper",
      "reversi",
    ]);
  });

  it("matches a game on its name, ignoring case", () => {
    expect(catalog.matcher("KLON")(klondike)).toBe(true);
  });

  it("matches a game on its category's name", () => {
    expect(catalog.matcher("solitaire")(klondike)).toBe(true);
  });

  it("matches a game on its blurb", () => {
    expect(catalog.matcher("stock")(klondike)).toBe(true);
  });

  it("matches a game on its other names", () => {
    expect(catalog.matcher("whitehead")(klondike)).toBe(true);
  });

  it("doesn't match a game on another game's words", () => {
    expect(catalog.matcher("mine")(klondike)).toBe(false);
  });

  it("ignores apostrophes in the query and the game", () => {
    const bakers = testGame("bakers-game");

    expect(catalog.matcher("bakers")(bakers)).toBe(true);
    expect(catalog.matcher("baker's game")(bakers)).toBe(true);
  });

  it("needs every word of the query to match", () => {
    expect(catalog.matcher("solitaire hearts")(klondike)).toBe(false);
  });

  it("marks a game added after the site opened as new for 30 days", () => {
    const later = addedOn(klondike, "2026-11-02");

    expect(catalog.isNew(later, daysAfter(later.added, 29))).toBe(true);
  });

  it("stops marking a game as new after 30 days", () => {
    const later = addedOn(klondike, "2026-11-02");

    expect(catalog.isNew(later, daysAfter(later.added, 31))).toBe(false);
  });

  it("never marks the games the site opened with as new", () => {
    expect(catalog.isNew(klondike, new Date(klondike.added))).toBe(false);
  });

  it("never marks a game still to come as new", () => {
    const reversi = addedOn(testGame("reversi"), "2026-11-02");

    expect(catalog.isNew(reversi, new Date(reversi.added))).toBe(false);
  });
});
