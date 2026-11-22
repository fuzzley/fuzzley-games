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
} from "./reported_game";

/**
 * Says what Asteroid Breaker puts in a bug report, and takes one back: the
 * run as the game saves it, its field's moment, size and tuning, taken from
 * the live game, and the settings.
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
    const saved = this.play.saved();
    const reported = {
      saved,
      moment: this.play.moment(),
      torus: saved?.field ? saved.field.torus : this.play.shape(),
      tuning: this.tuner.tuning(),
      settings: this.store.settings(),
    };
    return reportState(reported, this.play.run());
  }

  /**
   * Takes up a reported run, paused, on its field's size and with its
   * tuning, asking first if a run is in progress here; resolves to whether
   * it did. The report's settings are left as this page's.
   *
   * @throws Error naming the first part of the state that doesn't fit this
   *   build, or saying it holds no game in progress, before asking anything.
   */
  async load(value: unknown): Promise<boolean> {
    const read = readReportedGame(value, this.waves, this.play.run().id + 1);
    const { takenUp } = read;
    if (!takenUp) {
      throw new Error(
        "This report was filed with no game in progress. Only a game in progress can be loaded.",
      );
    }
    return this.play.takeUpReported({ ...read, takenUp });
  }
}

/**
 * Returns the provider that has Asteroid Breaker take bug reports, which the
 * settings drawer then offers.
 */
export function provideAsteroidBreakerBugReports(): Provider {
  return { provide: BUG_REPORT_SOURCE, useExisting: AsteroidBreakerBugReports };
}
