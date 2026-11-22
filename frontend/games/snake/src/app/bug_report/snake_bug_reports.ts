import { Injectable, inject } from "@angular/core";
import type { BugReportSource, ReportState } from "@fz/game-ui/bug_report";
import type { ChoiceOption } from "@fz/ui/radio_group";
import { reportRun, summarizeRun } from "../../rules/reported_run";
import { SPEED_INFO } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { ARROWS, MOVEMENTS } from "../settings/settings.component";
import { SettingsService } from "../settings/settings.service";
import type { SnakeState } from "./snake_state";

/**
 * Says what Snake puts in a bug report: the run as it stands, an ended one
 * too, what the board shows of it, and the settings.
 */
@Injectable({ providedIn: "root" })
export class SnakeBugReports implements Omit<BugReportSource, "load"> {
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
}

/** Returns the name the settings give a choice. */
function nameOf<T extends string>(
  options: readonly ChoiceOption<T>[],
  id: T,
): string {
  return options.find((option) => option.id === id)?.name ?? id;
}
