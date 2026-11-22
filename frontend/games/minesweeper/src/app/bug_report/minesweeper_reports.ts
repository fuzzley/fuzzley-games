import { Injectable, Injector, afterNextRender, inject } from "@angular/core";
import type { BugReportSource, ReportState } from "@fz/game-ui/bug_report";
import { GameViewportService } from "@fz/game-ui/viewport";
import { describeSize, difficultyName } from "../../rules/difficulty";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import {
  REPORT_TAG,
  type ReportedGame,
  readReportedGame,
  reportSummary,
  reportedValue,
} from "./reported_game";
import { StageScroll } from "./stage_scroll";

/**
 * Says what Minesweeper puts in a bug report, and puts a reported game back:
 * the game in play in a line, its settings, and its state as it stands,
 * taken from the game itself, since the game's save is removed once a game
 * ends.
 */
@Injectable({ providedIn: "root" })
export class MinesweeperReports implements BugReportSource {
  private readonly play = inject(GameService);
  private readonly settingsInUse = inject(SettingsService);
  private readonly viewport = inject(GameViewportService);
  private readonly stage = inject(StageScroll);
  private readonly injector = inject(Injector);

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

  /**
   * Puts a reported game on the board as the player left it, an ended one
   * without its card, asking first if a game is under way, and resolves to
   * whether it did. The board turns as it did only in an upright window.
   *
   * @throws Error naming the first part of the state this build can't read.
   */
  async load(state: unknown): Promise<boolean> {
    const game = readReportedGame(state);
    if (!(await this.play.load(game))) return false;
    // The stage scrolls as far as the board it holds, once that has drawn.
    afterNextRender(
      () => {
        this.stage.scrollTo(game.scroll);
      },
      { injector: this.injector },
    );
    return true;
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
