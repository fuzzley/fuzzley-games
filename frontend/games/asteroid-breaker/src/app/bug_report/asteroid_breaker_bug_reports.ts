import { Injectable, type Provider, inject } from "@angular/core";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  type ReportState,
} from "@fz/game-ui/bug_report";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { GAME_WAVES, TUNING } from "../tokens";
import {
  REPORT_TAG,
  gameLine,
  readReportedGame,
  reportState,
  settingsLines,
  startOf,
} from "./reported_game";

/** What loading a report says of one filed once its game was over, which the game keeps nothing of. */
export const ENDED_WORDS =
  "This report was filed after the game was over. Load a report filed during a game.";

/**
 * Says what Asteroid Breaker puts in a bug report, and takes one back: the
 * run as the game saves it, or where it starts, its field's moment, size
 * and tuning, taken from the live game, and the settings.
 */
@Injectable({ providedIn: "root" })
export class AsteroidBreakerBugReports implements BugReportSource {
  private readonly play = inject(GameService);
  private readonly store = inject(SettingsService);
  private readonly tuner = inject(TUNING);
  private readonly waves = inject(GAME_WAVES);

  readonly title = "Asteroid Breaker";
  readonly tag = REPORT_TAG;

  /** Returns the game in one line: "Asteroid Breaker · Fast · Wave 3: Adrift". */
  game(): string {
    return gameLine(this.play.run(), this.play.wave());
  }

  /** Returns each setting as the drawer words it: "Auto-fire: On". */
  settings(): readonly string[] {
    return settingsLines(this.store.settings());
  }

  /** Takes the run, its field and the numbers it is flown on, as they stand. */
  capture(): ReportState {
    const run = this.play.run();
    const saved = this.play.saved();
    const reported = {
      saved,
      start: startOf(run, saved, this.play.wave()),
      moment: this.play.moment(),
      torus: saved?.field ? saved.field.torus : this.play.shape(),
      tuning: this.tuner.tuning(),
      settings: this.store.settings(),
    };
    return reportState(reported, run);
  }

  /**
   * Takes up a reported run, paused, or starts one reported before its
   * first wave was flown, as it was, on its field's size and with its
   * tuning, asking first if a run is in progress here; resolves to whether
   * it did. The report's settings are left as this page's.
   *
   * @throws Error naming the first part of the state that doesn't fit this
   *   build, or saying its game had ended, before asking anything.
   */
  async load(value: unknown): Promise<boolean> {
    const read = readReportedGame(value, this.waves, this.play.run().id + 1);
    const { takenUp, start } = read;
    if (takenUp) return this.play.takeUpReported({ ...read, takenUp });
    if (start) return this.play.startReported({ ...read, start });
    throw new Error(ENDED_WORDS);
  }
}

/**
 * Returns the provider that has Asteroid Breaker take bug reports, which the
 * settings drawer then offers.
 */
export function provideAsteroidBreakerBugReports(): Provider {
  return { provide: BUG_REPORT_SOURCE, useExisting: AsteroidBreakerBugReports };
}
