import { TestBed } from "@angular/core/testing";
import { STRAIGHT_UP } from "@fz/brick-wall/view/aim_settings";
import { playFor } from "@fz/core/testing";
import { BUG_REPORT_SOURCE } from "@fz/game-ui/bug_report";
import { provideMemoryStorage } from "@fz/ui/testing";
import { playRound } from "../../rules/round/round";
import {
  STILL,
  playRoundOut,
  provideSpecPlay,
  release,
} from "../../testing/spec_play";
import { DebugService } from "../debug/debug.service";
import { GameService } from "../play/game.service";
import { type Settings, SettingsService } from "../settings/settings.service";
import { RickashayReports, provideBugReports } from "./bug_report_source";

/** Returns the source the bug reports are handed, over the specs' levels, its rounds played by the rules themselves. */
function reports(): RickashayReports {
  TestBed.configureTestingModule({
    providers: [...provideSpecPlay(playRound), ...provideBugReports()],
  });
  return TestBed.inject(RickashayReports);
}

/** How long a spec plays a shot released, which leaves it in the air. */
const IN_THE_AIR_MS = 100;

/** Readies the next game's TestBed, as a page loaded afresh, and returns its source. */
function afresh(): RickashayReports {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideMemoryStorage()] });
  return reports();
}

/** Describes what the game shows, as the specs hold a load to what was reported. */
interface Shown {
  readonly level: number;
  readonly rounds: number;
  readonly score: number;
  readonly phase: string;
  readonly flying: boolean;
  readonly start: unknown;
  readonly moment: number;
}

/** Returns what the game shows. */
function shown(game: GameService): Shown {
  return {
    level: game.run().level,
    rounds: game.rounds(),
    score: game.score(),
    phase: game.phase(),
    flying: game.flying(),
    start: game.start(),
    moment: game.report().moment,
  };
}

describe("RickashayReports", () => {
  it("is the source the bug reports are handed", () => {
    const source = reports();

    expect(TestBed.inject(BUG_REPORT_SOURCE)).toBe(source);
  });

  it("files a report under the game's name, its state under rk1", () => {
    const source = reports();

    expect({ title: source.title, tag: source.tag }).toEqual({
      title: "Rickaashay",
      tag: "rk1",
    });
  });

  it("names the level in play", () => {
    const source = reports();

    expect(source.game()).toBe("Rickaashay · Level 1: First bounce");
  });

  it("lists the settings as the player set them", () => {
    const source = reports();

    expect(source.settings()).toEqual([
      "Aiming: Point and hold",
      "Release with a button: Off",
      "Aim guide: 3 turns",
      "Shot speed: Normal",
      "Play sounds: On",
      "Fast-forward: Off",
    ]);
  });

  it.each<readonly [Partial<Settings>, number, string]>([
    [{ aiming: "pullBack" }, 0, "Aiming: Pull back"],
    [{ releaseByButton: true }, 1, "Release with a button: On"],
    [{ guideTurns: 1 }, 2, "Aim guide: 1 turn"],
    [{ guideTurns: 5 }, 2, "Aim guide: 5 turns"],
    [{ flightSpeed: "fast" }, 3, "Shot speed: Fast"],
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

  it("adds the field's depth the debug menu has set", () => {
    const source = reports();

    TestBed.inject(DebugService).setDepth(13);

    expect(source.settings().at(-1)).toBe("The field's depth: 13 rows (debug)");
  });

  it("keeps the round in play by its aim alone, on the rules' own numbers, at the moment its playback reached", () => {
    const source = reports();
    const game = TestBed.inject(GameService);
    release(game);
    playFor(game, IN_THE_AIR_MS, STILL);

    const { value } = source.capture();

    expect(value).toMatchObject({
      round: { shot: [STRAIGHT_UP], rules: null, moment: game.report().moment },
    });
  });
});

describe("a state loaded", () => {
  it("shows a level aimed as it was reported, paused and off the record", async () => {
    reports();
    const played = TestBed.inject(GameService);
    playRoundOut(played);
    const { value } = TestBed.inject(RickashayReports).capture();
    const was = shown(played);
    const source = afresh();

    const loaded = await source.load(value);

    const game = TestBed.inject(GameService);
    expect({
      loaded,
      shown: shown(game),
      outcome: game.outcome(),
      tuned: game.tuned(),
    }).toEqual({ loaded: true, shown: was, outcome: "paused", tuned: true });
  });

  it("shows a shot in the air at the moment it was reported, paused", async () => {
    reports();
    const played = TestBed.inject(GameService);
    release(played);
    playFor(played, IN_THE_AIR_MS, STILL);
    const { value } = TestBed.inject(RickashayReports).capture();
    const was = shown(played);
    const source = afresh();

    await source.load(value);

    const game = TestBed.inject(GameService);
    expect({ shown: shown(game), outcome: game.outcome() }).toEqual({
      shown: was,
      outcome: "paused",
    });
  });

  it("says a report filed with no game state has none to load", async () => {
    const source = reports();

    await expect(source.load(null)).rejects.toThrow(
      "The report has no game state.",
    );
  });
});
