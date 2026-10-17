import {
  type Game,
  describeGameCount,
  describeLength,
  describePlayers,
  imagesOf,
  playUrl,
  screenshotUrl,
  thumbnailUrl,
} from "./game";

describe("game", () => {
  function game(fields: Partial<Game>): Game {
    return {
      slug: "minesweeper",
      name: "Minesweeper",
      category: "classics",
      blurb: "Clear the field.",
      players: { min: 1, max: 1 },
      minutes: 5,
      added: "2026-10-17",
      ...fields,
    };
  }

  it("plays a game from a build of several at its hash route", () => {
    expect(playUrl({ build: "solitaire", id: "bakersdozen" })).toBe(
      "/play/solitaire/#/bakersdozen",
    );
  });

  it("plays a build of one game at its own address", () => {
    expect(playUrl({ build: "minesweeper" })).toBe("/play/minesweeper/");
  });

  it("finds the screenshots a build ships under each game's id", () => {
    expect(screenshotUrl({ build: "solitaire", id: "spider" }, "thumb")).toBe(
      "/play/solitaire/docs/screenshots/spider/thumb.webp",
    );
  });

  it("names a build of one game's screenshots after the build", () => {
    expect(screenshotUrl({ build: "minesweeper" }, "preview")).toBe(
      "/play/minesweeper/docs/screenshots/minesweeper/preview.webp",
    );
  });

  it("pictures a hosted game with its build's screenshot", () => {
    expect(thumbnailUrl(game({ play: { build: "minesweeper" } }))).toBe(
      "/play/minesweeper/docs/screenshots/minesweeper/thumb.webp",
    );
  });

  it("pictures a game still to come with its drawing", () => {
    expect(thumbnailUrl(game({ slug: "reversi" }))).toBe(
      "/thumbnails/reversi.svg",
    );
  });

  it("shows a hosted game's thumbnail and preview", () => {
    expect(imagesOf(game({ play: { build: "minesweeper" } }))).toEqual([
      "/play/minesweeper/docs/screenshots/minesweeper/thumb.webp",
      "/play/minesweeper/docs/screenshots/minesweeper/preview.webp",
    ]);
  });

  it("shows only the drawing of a game still to come", () => {
    expect(imagesOf(game({ slug: "reversi" }))).toEqual([
      "/thumbnails/reversi.svg",
    ]);
  });

  it("calls a game for one player solo", () => {
    expect(describePlayers({ min: 1, max: 1 })).toBe("Solo");
  });

  it("counts the players of a game for a fixed number", () => {
    expect(describePlayers({ min: 2, max: 2 })).toBe("2 players");
  });

  it("gives the range of players a game allows", () => {
    expect(describePlayers({ min: 2, max: 4 })).toBe("2–4 players");
  });

  it("counts one game in the singular", () => {
    expect(describeGameCount(1)).toBe("1 game");
  });

  it("counts any other number of games in the plural", () => {
    expect(describeGameCount(41)).toBe("41 games");
  });

  it("gives a game's length in minutes", () => {
    expect(describeLength(15)).toBe("15 min");
  });
});
