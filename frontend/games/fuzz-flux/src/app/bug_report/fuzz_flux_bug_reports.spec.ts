import { TestBed } from "@angular/core/testing";
import { BUG_REPORT_SOURCE } from "@fz/game-ui/bug_report";
import {
  FuzzFluxBugReports,
  provideFuzzFluxBugReports,
} from "./fuzz_flux_bug_reports";

/** Returns the source the bug reports are handed. */
function reports(): FuzzFluxBugReports {
  TestBed.configureTestingModule({ providers: [provideFuzzFluxBugReports()] });
  return TestBed.inject(FuzzFluxBugReports);
}

describe("FuzzFluxBugReports", () => {
  it("is the source the bug reports are handed", () => {
    const source = reports();

    expect(TestBed.inject(BUG_REPORT_SOURCE)).toBe(source);
  });

  it("files a report under the game's name, its state under ff1", () => {
    const source = reports();

    expect({ title: source.title, tag: source.tag }).toEqual({
      title: "Fuzz Flux",
      tag: "ff1",
    });
  });

  it("names the game, with no settings to list", () => {
    const source = reports();

    expect({ game: source.game(), settings: source.settings() }).toEqual({
      game: "Fuzz Flux",
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
      "Fuzz Flux can't load a game state yet. It's still being built.",
    );
  });
});
