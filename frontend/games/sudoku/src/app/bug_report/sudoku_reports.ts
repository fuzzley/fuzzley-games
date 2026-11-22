import { Injectable, inject } from "@angular/core";
import type { ReportState } from "@fz/game-ui/bug_report";
import { LEVEL_INFO } from "../../rules/difficulty";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";
import { REPORT_TAG, type ReportedGame, reportState } from "./reported_game";

/**
 * Says what Sudoku puts in a bug report: the game in play in a line, its
 * settings, and its state as it stands, taken from the game itself, since
 * the game's save keeps no solved puzzle, no selection, no Notes mode and
 * no hint.
 */
@Injectable({ providedIn: "root" })
export class SudokuReports {
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
