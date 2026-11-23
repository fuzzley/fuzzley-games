import { TestBed } from "@angular/core/testing";
import { BUG_REPORT_SOURCE } from "@fz/game-ui/bug_report";
import { RickashayReports, provideBugReports } from "./bug_report_source";

/** Returns the source the bug reports are handed. */
function reports(): RickashayReports {
  TestBed.configureTestingModule({ providers: provideBugReports() });
  return TestBed.inject(RickashayReports);
}

describe("RickashayReports", () => {
  it("is the source the bug reports are handed", () => {
    const source = reports();

    expect(TestBed.inject(BUG_REPORT_SOURCE)).toBe(source);
  });

  it("files a report under the game's name, its state under rk1", () => {
    const source = reports();

    expect({ title: source.title, tag: source.tag }).toEqual({
      title: "Rickashay",
      tag: "rk1",
    });
  });

  it("names the game, with no settings to list", () => {
    const source = reports();

    expect({ game: source.game(), settings: source.settings() }).toEqual({
      game: "Rickashay",
      settings: [],
    });
  });

  it("takes nothing in play as its state", () => {
    const source = reports();

    expect(source.capture()).toEqual({
      summary: "Nothing in play",
      value: null,
    });
  });

  it("refuses a reported state, its own included, saying why", async () => {
    const source = reports();

    await expect(source.load(source.capture().value)).rejects.toThrow(
      "Rickashay can't load a game state yet. It's still being built.",
    );
  });
});
