import { Injectable, type Provider, inject } from "@angular/core";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  type ReportState,
} from "@fz/game-ui/bug_report";
import { formatCustomPercent } from "../../rules/run/describe";
import { SPEED_INFO } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { formatScale } from "../settings/debug_tuning";
import { TOUCH_INFO } from "../settings/settings.component";
import { SettingsService } from "../settings/settings.service";
import { GAME_LEVELS } from "../tokens";
import {
  REPORT_TAG,
  readBrickBreakerState,
  reportState,
} from "./brick_breaker_state";

/**
 * Says what Brick Breaker puts in a bug report, and takes one back: the run
 * and the level in play as they stand, the field's moment beyond what the
 * saved game keeps, the ball's speed as the debug menu tunes it, and the
 * settings.
 */
@Injectable({ providedIn: "root" })
export class BrickBreakerBugReports implements BugReportSource {
  private readonly play = inject(GameService);
  private readonly store = inject(SettingsService);
  private readonly levels = inject(GAME_LEVELS);

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
    const custom = this.play.customPercent();
    const scale = this.play.ballSpeedScale();
    return [
      `Speed: ${SPEED_INFO[this.play.speed()].name}`,
      ...(custom === null
        ? []
        : [`Custom ball speed: ${formatCustomPercent(custom)}`]),
      `Touch controls: ${TOUCH_INFO[touch].name}`,
      `Sound: ${sound ? "On" : "Off"}`,
      ...(scale === 1 ? [] : [`Ball speed (debug): ${formatScale(scale)}`]),
    ];
  }

  /** Takes the run, the level in play and the ball's speed as they stand. */
  capture(): ReportState {
    return reportState(this.play.reported(), this.play.ballSpeedScale());
  }

  /**
   * Takes up a reported run as the saved game takes one up, paused, with its
   * field's moment laid on and the ball's speed the report tuned, asking
   * first if a run is in progress here; resolves to whether it did.
   *
   * @throws Error naming the first part of the state that doesn't fit this
   *   build, or saying its game was over, before asking anything.
   */
  async load(value: unknown): Promise<boolean> {
    const { takenUp, moment, ballSpeedScale } = readBrickBreakerState(
      value,
      this.levels,
      this.play.run().id + 1,
    );
    return this.play.takeUpReported(takenUp, moment, ballSpeedScale);
  }
}

/**
 * Returns the provider that has Brick Breaker take bug reports, which the
 * settings drawer then offers.
 */
export function provideBrickBreakerBugReports(): Provider {
  return { provide: BUG_REPORT_SOURCE, useExisting: BrickBreakerBugReports };
}
