import { TestBed } from "@angular/core/testing";
import { BUG_REPORT_SOURCE } from "@fz/game-ui/bug_report";
import { provideMemoryStorage } from "@fz/ui/testing";
import { playRound } from "../../rules/round/round";
import { SPEC_LEVELS, playRoundOut, provideSpecPlay } from "../../testing/play";
import { DebugService } from "../debug/debug.service";
import { GameService } from "../play/game.service";
import { type Settings, SettingsService } from "../settings/settings.service";
import { BrickFuzzPopReports, provideBugReports } from "./bug_report_source";
import { REPORT_TAG, reportStateOf } from "./report_state";

/** Returns the source the bug reports are handed, over the specs' levels, its rounds played by the rules themselves. */
function reports(): BrickFuzzPopReports {
  TestBed.configureTestingModule({
    providers: [...provideSpecPlay(playRound), ...provideBugReports()],
  });
  return TestBed.inject(BrickFuzzPopReports);
}

describe("BrickFuzzPopReports", () => {
  it("is the source the bug reports are handed", () => {
    const source = reports();

    expect(TestBed.inject(BUG_REPORT_SOURCE)).toBe(source);
  });

  it("files a report under the game's name, its state under its tag", () => {
    const source = reports();

    expect({ title: source.title, tag: source.tag }).toEqual({
      title: "Brick Fuzz Pop",
      tag: REPORT_TAG,
    });
  });

  it("names the level in play", () => {
    const source = reports();

    expect(source.game()).toBe("Brick Fuzz Pop · Level 1: Hello, wall");
  });

  it("lists the settings as the drawer and the bar word them", () => {
    const source = reports();

    expect(source.settings()).toEqual([
      "Aiming: Point and hold",
      "Shot speed: Normal",
      "Speed up long shots: On",
      "Show aim guide: On",
      "Play sounds: On",
      "Fast-forward: Off",
    ]);
  });

  it.each<readonly [Partial<Settings>, number, string]>([
    [{ aiming: "pullBack" }, 0, "Aiming: Pull back"],
    [{ flightSpeed: "fast" }, 1, "Shot speed: Fast"],
    [{ speedUpLongFlights: false }, 2, "Speed up long shots: Off"],
    [{ guide: false }, 3, "Show aim guide: Off"],
    [{ sound: false }, 4, "Play sounds: Off"],
    [{ fastForward: true }, 5, "Fast-forward: On"],
  ])("lists %o as the player changed it", (changed, index, line) => {
    const source = reports();
    const before = source.settings();
    TestBed.inject(SettingsService).update(changed);

    expect(source.settings()).toEqual(
      before.map((each, at) => (at === index ? line : each)),
    );
  });

  it("adds what the debug menu has moved, as its controls name it", () => {
    const source = reports();
    const debug = TestBed.inject(DebugService);
    debug.setDepth(13);
    debug.tuning.tune("bored", 300);
    debug.tuning.tune("longFlightMs", 2500);

    expect(source.settings().slice(6)).toEqual([
      "The field's depth: 13 rows (debug)",
      "A long flight speeds up after: 2.5 s (debug)",
      "Bored after: 300 units (debug)",
    ]);
  });

  it("takes the game's state from the game itself", () => {
    const source = reports();
    const game = TestBed.inject(GameService);
    playRoundOut(game);

    const { summary, value } = source.capture();
    const taken = reportStateOf(game, SPEC_LEVELS);
    expect({ summary, value }).toEqual({
      summary: taken.summary,
      value: taken.value,
    });
  });

  it("puts a state it took back in play, paused and off the record", async () => {
    const source = reports();
    const game = TestBed.inject(GameService);
    playRoundOut(game);
    const { value } = source.capture();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
    const fresh = reports();

    const loaded = await fresh.load(value);

    const taken = TestBed.inject(GameService);
    expect({
      loaded,
      rounds: taken.rounds(),
      outcome: taken.outcome(),
      tuned: taken.tuned(),
    }).toEqual({ loaded: true, rounds: 1, outcome: "paused", tuned: true });
  });
});
