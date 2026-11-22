import { Injectable, inject } from "@angular/core";
import type { ReportState } from "@fz/game-ui/bug_report";
import { GameViewportService } from "@fz/game-ui/viewport";
import { describeSize, difficultyName } from "../../rules/difficulty";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import {
  REPORT_TAG,
  type ReportedGame,
  reportSummary,
  reportedValue,
} from "./reported_game";
import { StageScroll } from "./stage_scroll";

/**
 * Says what Minesweeper puts in a bug report: the game in play in a line,
 * its settings, and its state as it stands, taken from the game itself,
 * since the game's save is removed once a game ends.
 */
@Injectable({ providedIn: "root" })
export class MinesweeperReports {
  private readonly play = inject(GameService);
  private readonly settingsInUse = inject(SettingsService);
  private readonly viewport = inject(GameViewportService);
  private readonly stage = inject(StageScroll);

  readonly title = "Minesweeper";
  readonly tag = REPORT_TAG;

  /** Describes the game in play: "Minesweeper · Hard", and Custom's field. */
  game(): string {
    const difficulty = this.play.difficulty();
    const line = `${this.title} · ${difficultyName(difficulty)}`;
    return difficulty === "custom"
      ? `${line} · ${describeSize(this.play.field().size)}`
      : line;
  }

  /**
   * Returns the settings a new game is dealt from, as a report lists them:
   * "Difficulty: Hard", "Custom: 20 × 20, 100 mines", "Lives: 3".
   */
  settings(): readonly string[] {
    const { difficulty, custom, lives } = this.settingsInUse.settings();
    return [
      `Difficulty: ${difficultyName(difficulty)}`,
      `Custom: ${describeSize(custom)}`,
      `Lives: ${lives}`,
    ];
  }

  /** Takes the game as it stands, ended or not. */
  capture(): ReportState {
    const game = this.take();
    return { summary: reportSummary(game), value: reportedValue(game) };
  }

  private take(): ReportedGame {
    const field = this.play.field();
    const { lives, custom } = this.settingsInUse.settings();
    return {
      field,
      difficulty: this.play.difficulty(),
      seconds: this.play.seconds(),
      flagMode: this.play.flagMode(),
      lives,
      custom,
      // BoardComponent.turned's rule, which the board's specs here hold this
      // to: a field wider than tall turns on an upright screen.
      turned: this.viewport.isPortrait() && field.size.cols > field.size.rows,
      scroll: this.stage.at(),
    };
  }
}
