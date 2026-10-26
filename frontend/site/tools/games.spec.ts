import { checkGame } from "./games.mjs";

describe("checkGame", () => {
  it("accepts a game built in a workspace", () => {
    expect(
      checkGame("minesweeper", { workspace: "games/minesweeper" }),
    ).toEqual({ workspace: "games/minesweeper" });
  });

  it("refuses a workspace outside games/", () => {
    expect(() =>
      checkGame("minesweeper", { workspace: "../minesweeper" }),
    ).toThrow('minesweeper: "workspace" isn\'t a folder under games/.');
  });

  it("refuses an entry that isn't an object", () => {
    expect(() => checkGame("minesweeper", "games/minesweeper")).toThrow(
      'minesweeper: "workspace" isn\'t a folder under games/.',
    );
  });

  it("refuses an entry with more than its workspace", () => {
    expect(() =>
      checkGame("minesweeper", {
        workspace: "games/minesweeper",
        asset: "minesweeper-549c93a.tar.gz",
      }),
    ).toThrow("minesweeper: an entry names its workspace and nothing else.");
  });
});
