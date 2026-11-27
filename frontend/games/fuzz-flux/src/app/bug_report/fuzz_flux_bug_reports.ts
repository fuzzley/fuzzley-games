import { Injectable, type Provider } from "@angular/core";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  type ReportState,
} from "@fz/game-ui/bug_report";

/**
 * Says what Fuzz Flux puts in a bug report: for now its name alone, with no
 * settings and no state, since nothing is played yet; and takes no reported
 * state back.
 */
@Injectable({ providedIn: "root" })
export class FuzzFluxBugReports implements BugReportSource {
  readonly title = "Fuzz Flux";

  readonly tag = "ff1";

  /** Describes the game in play: its name, while nothing is played. */
  game(): string {
    return this.title;
  }

  /** Returns the settings, none yet. */
  settings(): readonly string[] {
    return [];
  }

  /** Takes the game's state, with nothing in play. */
  capture(): ReportState {
    return { summary: "Nothing in play", value: null };
  }

  /**
   * Refuses a reported state, which this build has no game to put in play.
   *
   * @throws Error saying so, whatever the state.
   */
  load(_state: unknown): Promise<boolean> {
    return Promise.reject(
      new Error(
        "Fuzz Flux can't load a game state yet. It's still being built.",
      ),
    );
  }
}

/**
 * Returns the provider that hands the bug reports Fuzz Flux's source, so the
 * settings drawer offers Report a bug.
 */
export function provideFuzzFluxBugReports(): Provider {
  return { provide: BUG_REPORT_SOURCE, useExisting: FuzzFluxBugReports };
}
