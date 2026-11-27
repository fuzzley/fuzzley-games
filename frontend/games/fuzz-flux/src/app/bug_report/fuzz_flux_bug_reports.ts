import { Injectable, type Provider, inject } from "@angular/core";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  type ReportState,
} from "@fz/game-ui/bug_report";
import {
  REPORT_TAG,
  readReportedGame,
  reportSummary,
  reportedGameOf,
} from "../../rules/run/reported_game";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { SPEED_NAMES } from "../settings/speed_names";
import { GAME_LEVELS, GAME_RULES } from "../tokens";

/** Returns a setting that is on or off, as the report lists it. */
function onOrOff(name: string, on: boolean): string {
  return `${name}: ${on ? "On" : "Off"}`;
}

/**
 * Says what Fuzz Flux puts in a bug report, and puts a reported game back
 * (C3): the level in play in a line, the settings it plays by, and the
 * level, its deal and the moves made, as `rules/run/reported_game` keeps
 * them, replayed by the rules to the board they left.
 */
@Injectable({ providedIn: "root" })
export class FuzzFluxBugReports implements BugReportSource {
  private readonly play = inject(GameService);
  private readonly store = inject(SettingsService);
  private readonly levels = inject(GAME_LEVELS);
  private readonly rules = inject(GAME_RULES);

  readonly title = "Fuzz Flux";

  readonly tag = REPORT_TAG;

  /** Describes the level in play: "Fuzz Flux · Level 3: Show me". */
  game(): string {
    const { level } = this.play.inPlay();
    return `${this.title} · Level ${String(level.number)}: ${level.data.name}`;
  }

  /**
   * Returns the settings the game plays by, named as Settings names them,
   * Less motion saying where it follows the device's setting.
   */
  settings(): readonly string[] {
    const { speed, lessMotion, sound } = this.store.settings();
    const motion = onOrOff("Less motion", this.store.lessMotion());
    return [
      `Speed: ${SPEED_NAMES[speed]}`,
      lessMotion === null ? `${motion} (device setting)` : motion,
      onOrOff("Play sounds", sound),
    ];
  }

  /** Takes the level in play as it stands, ended or not. */
  capture(): ReportState {
    const inPlay = this.play.inPlay();
    return { summary: reportSummary(inPlay), value: reportedGameOf(inPlay) };
  }

  /**
   * Puts a reported game on the board, as `GameService.load()` does, once
   * the state is read, and resolves to whether it did.
   *
   * @throws Error naming the first part of the state this build can't read,
   *   before anything is asked.
   */
  async load(state: unknown): Promise<boolean> {
    return this.play.load(readReportedGame(state, this.levels, this.rules));
  }
}

/**
 * Returns the provider that hands the bug reports Fuzz Flux's source, so the
 * settings drawer offers Report a bug.
 */
export function provideFuzzFluxBugReports(): Provider {
  return { provide: BUG_REPORT_SOURCE, useExisting: FuzzFluxBugReports };
}
