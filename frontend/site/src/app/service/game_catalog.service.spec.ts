import { TestBed } from "@angular/core/testing";
import { provideTestCatalog, testGame } from "../testing/catalog";
import { GameCatalog } from "./game_catalog.service";

describe("GameCatalog", () => {
  const klondike = testGame("klondike");
  let catalog: GameCatalog;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTestCatalog()] });
    catalog = TestBed.inject(GameCatalog);
  });

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
});
