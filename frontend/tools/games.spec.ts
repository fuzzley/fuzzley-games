import { checkGame, releaseUrl } from "./games.mjs";

describe("checkGame", () => {
  const entry = {
    repo: "fuzzley/fSolitaire",
    commit: "549c93afb5d1592257262ceb42ed2e91dcb165d6",
    asset: "solitaire-549c93a.tar.gz",
    sha256: "187b7432935ee1b926d81e6c60e2fbfdc65f59fbce217632da462e1271a6f19b",
  };

  it("accepts a well-formed entry", () => {
    expect(checkGame("solitaire", entry)).toBe(entry);
  });

  it("names the field that is malformed", () => {
    expect(() =>
      checkGame("solitaire", { ...entry, commit: "549c93a" }),
    ).toThrow('solitaire: "commit" is missing or malformed.');
  });

  it("refuses something that isn't an entry at all", () => {
    expect(() => checkGame("solitaire", "solitaire.tar.gz")).toThrow(
      '"repo" is missing or malformed',
    );
  });
});

describe("releaseUrl", () => {
  it("addresses a file on a game's site-build release", () => {
    expect(releaseUrl("fuzzley/fSolitaire", "latest.json")).toBe(
      "https://github.com/fuzzley/fSolitaire/releases/download/site-build/latest.json",
    );
  });
});
