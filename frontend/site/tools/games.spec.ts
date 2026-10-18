import { checkGame, checkPin, isPinned, releaseUrl } from "./games.mjs";

const pin = {
  repo: "fuzzley/fSolitaire",
  commit: "549c93afb5d1592257262ceb42ed2e91dcb165d6",
  asset: "solitaire-549c93a.tar.gz",
  sha256: "187b7432935ee1b926d81e6c60e2fbfdc65f59fbce217632da462e1271a6f19b",
};

describe("checkPin", () => {
  it("accepts a well-formed pin", () => {
    expect(checkPin("solitaire", pin)).toBe(pin);
  });

  it("names the field that is malformed", () => {
    expect(() => checkPin("solitaire", { ...pin, commit: "549c93a" })).toThrow(
      'solitaire: "commit" is missing or malformed.',
    );
  });

  it("refuses something that isn't a pin at all", () => {
    expect(() => checkPin("solitaire", "solitaire.tar.gz")).toThrow(
      '"repo" is missing or malformed',
    );
  });

  it("refuses a workspace, which no release can name", () => {
    expect(() =>
      checkPin("latest.json", { workspace: "games/minesweeper" }),
    ).toThrow('"repo" is missing or malformed');
  });
});

describe("checkGame", () => {
  it("accepts a pinned game", () => {
    expect(checkGame("solitaire", pin)).toBe(pin);
  });

  it("checks a pinned game's fields", () => {
    expect(() => checkGame("solitaire", { ...pin, sha256: "abc" })).toThrow(
      'solitaire: "sha256" is missing or malformed.',
    );
  });

  it("accepts a game built in a workspace", () => {
    expect(
      checkGame("minesweeper", { workspace: "games/minesweeper" }),
    ).toEqual({ workspace: "games/minesweeper" });
  });

  it("refuses a workspace outside games/", () => {
    expect(() =>
      checkGame("minesweeper", { workspace: "../fMinesweeper" }),
    ).toThrow('minesweeper: "workspace" isn\'t a folder under games/.');
  });

  it("refuses a game built here that pins a release as well", () => {
    expect(() =>
      checkGame("minesweeper", { workspace: "games/minesweeper", ...pin }),
    ).toThrow("minesweeper: a game built here pins no release as well.");
  });
});

describe("isPinned", () => {
  it("finds a pin on a game from a release", () => {
    expect(isPinned(pin)).toBe(true);
  });

  it("finds no pin on a game built here", () => {
    expect(isPinned({ workspace: "games/minesweeper" })).toBe(false);
  });
});

describe("releaseUrl", () => {
  it("addresses a file on a game's site-build release", () => {
    expect(releaseUrl("fuzzley/fSolitaire", "latest.json")).toBe(
      "https://github.com/fuzzley/fSolitaire/releases/download/site-build/latest.json",
    );
  });
});
