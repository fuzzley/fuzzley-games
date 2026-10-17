import {
  describeLength,
  describePlayers,
  playUrl,
  screenshotUrl,
} from "./game";

describe("game", () => {
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

  it("calls a game for one player solo", () => {
    expect(describePlayers({ min: 1, max: 1 })).toBe("Solo");
  });

  it("counts the players of a game for a fixed number", () => {
    expect(describePlayers({ min: 2, max: 2 })).toBe("2 players");
  });

  it("gives the range of players a game allows", () => {
    expect(describePlayers({ min: 2, max: 4 })).toBe("2–4 players");
  });

  it("gives a game's length in minutes", () => {
    expect(describeLength(15)).toBe("15 min");
  });
});
