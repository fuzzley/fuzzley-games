import { Injectable, inject } from "@angular/core";
import type { BugReportSource, ReportState } from "@fz/game-ui/bug_report";
import { formatCustomPercent } from "../../rules/run/describe";
import { SPEED_INFO } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { formatScale } from "../settings/debug_tuning";
import { TOUCH_CHOICES } from "../settings/settings.component";
import { SettingsService } from "../settings/settings.service";
import { REPORT_TAG, reportState } from "./brick_breaker_state";

/**
 * Says what Brick Breaker puts in a bug report: the run and the level in
 * play as they stand, the field's moment beyond what the saved game keeps,
 * the ball's speed as the debug menu tunes it, and the settings.
 */
@Injectable({ providedIn: "root" })
export class BrickBreakerBugReports implements Omit<BugReportSource, "load"> {
  private readonly play = inject(GameService);
  private readonly store = inject(SettingsService);

  readonly title = "Brick Breaker";
  readonly tag = REPORT_TAG;

  /** Returns the game in one line: "Brick Breaker · Normal · Level 9: Rocket". */
  game(): string {
    const { number, data } = this.play.level();
    const speed = SPEED_INFO[this.play.speed()].name;
    return `${this.title} · ${speed} · Level ${String(number)}: ${data.name}`;
  }

  /**
   * Returns each setting as the drawer shows it, "Touch controls: Drag":
   * the run's speed, Custom's ball speed while the run is at Custom, and the
   * ball's speed where the debug menu tunes it.
   */
  settings(): readonly string[] {
    const { touch, sound } = this.store.settings();
    const touchName =
      TOUCH_CHOICES.find((choice) => choice.id === touch)?.name ?? touch;
    const custom = this.play.customPercent();
    const scale = this.play.ballSpeedScale();
    return [
      `Speed: ${SPEED_INFO[this.play.speed()].name}`,
      ...(custom === null
        ? []
        : [`Custom ball speed: ${formatCustomPercent(custom)}`]),
      `Touch controls: ${touchName}`,
      `Sound: ${sound ? "On" : "Off"}`,
      ...(scale === 1 ? [] : [`Ball speed (debug): ${formatScale(scale)}`]),
    ];
  }

  /** Takes the run, the level in play and the ball's speed as they stand. */
  capture(): ReportState {
    return reportState(this.play.reported(), this.play.ballSpeedScale());
  }
}
