import { TestBed } from "@angular/core/testing";
import { packState, unpackState } from "@fz/game-ui/bug_report";
import { installCompressionStreams } from "@fz/game-ui/testing";
import { ConfirmService } from "@fz/ui/confirm";
import {
  SPEC_WAVE,
  SPEC_WAVES,
  knockOneLoose,
  provideSpecWaves,
} from "../../testing/play";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { AsteroidBreakerBugReports } from "./asteroid_breaker_bug_reports";
import { REPORT_TAG, readReportedGame } from "./reported_game";

/** Returns a value as JSON carries it, as a report's link does. */
function viaJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Returns what the game shows of its run and its field's size. */
function shownBy(game: GameService): Record<string, unknown> {
  return {
    outcome: game.outcome(),
    wave: game.wave().number,
    score: game.score(),
    crew: game.crew(),
    torus: game.frame().field.torus,
  };
}

/** Returns a state as the report's link carries it, packed and read back. */
async function throughTheLink(value: unknown): Promise<unknown> {
  return unpackState(REPORT_TAG, await packState(REPORT_TAG, value));
}

beforeEach(() => {
  TestBed.configureTestingModule({ providers: provideSpecWaves() });
});

describe("AsteroidBreakerBugReports", () => {
  installCompressionStreams();

  it("words the game in play and the settings for the issue", () => {
    TestBed.inject(SettingsService).update({ fireByItself: true });
    const reports = TestBed.inject(AsteroidBreakerBugReports);

    const words = { game: reports.game(), settings: reports.settings() };

    expect({
      game: words.game,
      autoFire: words.settings.includes("Auto-fire: On"),
    }).toEqual({
      game: "Asteroid Breaker · Normal · Wave 1: Pebble",
      autoFire: true,
    });
  });

  it("loads a run it reported back as the game showed it, its field's moment laid on", async () => {
    const game = TestBed.inject(GameService);
    const reports = TestBed.inject(AsteroidBreakerBugReports);
    await game.startAt(SPEC_WAVE.gift);
    knockOneLoose(game);
    game.pause();
    const shown = shownBy(game);
    const state = await throughTheLink(reports.capture().value);
    const starting = game.newGame();
    TestBed.inject(ConfirmService).accept();
    await starting;

    const loaded = await reports.load(state);

    expect({
      loaded,
      shown: shownBy(game),
      moment: viaJson(game.moment()),
    }).toEqual({
      loaded: true,
      shown,
      moment: readReportedGame(state, SPEC_WAVES, 0).moment,
    });
  });

  it("refuses a report filed with no game in progress, before asking", async () => {
    const game = TestBed.inject(GameService);
    const reports = TestBed.inject(AsteroidBreakerBugReports);
    await game.startAt(SPEC_WAVE.gift);
    const state = await throughTheLink(reports.capture().value);
    knockOneLoose(game);
    game.pause();

    const loading = reports.load(state);

    await expect(loading).rejects.toThrow(
      "This report was filed with no game in progress. Only a game in progress can be loaded.",
    );
    expect(TestBed.inject(ConfirmService).isOpen()).toBe(false);
  });
});
