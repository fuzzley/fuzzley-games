import { Injectable, inject } from "@angular/core";
import type { BugReportSource, ReportState } from "@fz/game-ui/bug_report";
import { LEVEL_INFO } from "../../rules/difficulty";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import {
  REPORT_TAG,
  type ReportedGame,
  readReportedGame,
  reportState,
} from "./reported_game";

/**
 * Says what Sudoku puts in a bug report: the game in play in a line, its
 * settings, and its state as it stands, taken from the game itself, since
 * the game's save keeps no solved puzzle, no selection, no Notes mode and
 * no hint. Puts a reported game back.
 */
@Injectable({ providedIn: "root" })
export class SudokuReports implements BugReportSource {
  private readonly play = inject(GameService);
  private readonly settingsInUse = inject(SettingsService);

  readonly title = "Sudoku";
  readonly tag = REPORT_TAG;

  /** Describes the game in play: "Sudoku · Expert". */
  game(): string {
    return `${this.title} · ${LEVEL_INFO[this.play.level()].name}`;
  }

  /**
   * Returns the settings, as a report lists them: "Level: Expert", "Mark
   * mistakes: Off", "Auto-clear notes: On".
   */
  settings(): readonly string[] {
    const { level, markMistakes, clearNotes } = this.settingsInUse.settings();
    return [
      `Level: ${LEVEL_INFO[level].name}`,
      `Mark mistakes: ${onOrOff(markMistakes)}`,
      `Auto-clear notes: ${onOrOff(clearNotes)}`,
    ];
  }

  /** Takes the game as it stands, solved or not. */
  capture(): ReportState {
    return reportState(this.take());
  }

  /**
   * Puts a reported game on the board as the player left it, a solved one
   * without its card, asking first if a game is under way, and resolves to
   * whether it did.
   *
   * @throws Error naming the first part of the state this build can't read,
   *   before asking anything.
   */
  async load(state: unknown): Promise<boolean> {
    const game = readReportedGame(state);
    return this.play.load(game);
  }

  private take(): ReportedGame {
    return {
      grid: this.play.grid(),
      seconds: this.play.seconds(),
      selected: this.play.selected(),
      notesMode: this.play.notesMode(),
      hint: this.play.hint(),
      settings: this.settingsInUse.settings(),
      replay: this.play.replay(),
    };
  }
}

/** Returns how a report words a setting turned on or off. */
function onOrOff(on: boolean): string {
  return on ? "On" : "Off";
}
