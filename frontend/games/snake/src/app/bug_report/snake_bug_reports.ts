import { Injectable, type Provider, inject } from "@angular/core";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  type ReportState,
} from "@fz/game-ui/bug_report";
import type { ChoiceOption } from "@fz/ui/radio_group";
import { reportRun, summarizeRun } from "../../rules/reported_run";
import { SPEED_INFO } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { ARROWS, MOVEMENTS } from "../settings/settings.component";
import { SettingsService } from "../settings/settings.service";
import { type SnakeState, readSnakeState } from "./snake_state";

/**
 * Says what Snake puts in a bug report, and takes one back: the run as it
 * stands, an ended one too, what the board shows of it, and the settings.
 */
@Injectable({ providedIn: "root" })
export class SnakeBugReports implements BugReportSource {
  private readonly play = inject(GameService);
  private readonly store = inject(SettingsService);

  readonly title = "Snake";
  readonly tag = "sn1";

  /** Returns the game in one line, with the run's speed: "Snake · Normal". */
  game(): string {
    return `${this.title} · ${SPEED_INFO[this.play.run().speed].name}`;
  }

  /** Returns each setting as the settings word it: "Movement: Glide". */
  settings(): readonly string[] {
    const { speed, movement, arrows, sound } = this.store.settings();
    return [
      `Speed: ${SPEED_INFO[speed].name}`,
      `Movement: ${nameOf(MOVEMENTS, movement)}`,
      `On-screen arrows: ${nameOf(ARROWS, arrows)}`,
      `Sound: ${sound ? "On" : "Off"}`,
    ];
  }

  /** Takes the run, the board and the settings as they stand. */
  capture(): ReportState {
    const run = this.play.run();
    const state: SnakeState = {
      run: reportRun(run),
      stage: this.play.endStage(),
      settings: this.store.settings(),
    };
    return { summary: summarizeRun(run), value: state };
  }

  /**
   * Takes up a reported run as it was reported, paused where it was under
   * way, asking first if a run is under way here, then takes on the report's
   * settings; resolves to whether it did.
   *
   * @throws Error naming the first part of the state that doesn't fit this
   *   build, before asking anything.
   */
  async load(value: unknown): Promise<boolean> {
    const state = readSnakeState(value, this.play.run().id + 1);
    if (!(await this.play.takeUpReported(state.run, state.stage))) return false;
    this.store.update(state.settings);
    return true;
  }
}

/**
 * Returns the provider that has Snake take bug reports, which the settings
 * drawer then offers.
 */
export function provideSnakeBugReports(): Provider {
  return { provide: BUG_REPORT_SOURCE, useExisting: SnakeBugReports };
}

/** Returns the name the settings give a choice. */
function nameOf<T extends string>(
  options: readonly ChoiceOption<T>[],
  id: T,
): string {
  return options.find((option) => option.id === id)?.name ?? id;
}
