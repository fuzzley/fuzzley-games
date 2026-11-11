import {
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from "@angular/core";
import { PlayRoomDirective, refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { BarComponent } from "./bar/bar.component";
import { BoardComponent } from "./board/board.component";
import { DebugService } from "./debug/debug.service";
import { HelpComponent, type HelpPictures } from "./help/help.component";
import { LevelsComponent } from "./levels/levels.component";
import { GameService } from "./play/game.service";
import { ResultComponent, type RunEnd } from "./result/result.component";
import { SettingsComponent } from "./settings/settings.component";
import { levelMarksOf } from "./stats/level_marks";
import { ProgressService } from "./stats/progress.service";
import { StatsService } from "./stats/stats.service";
import { GAME_LEVELS } from "./tokens";

/**
 * Shows the game: the bar, the board in the room the bar leaves it, the
 * live region that says what happens, the Levels dialog, How to play and
 * the settings the bar opens, the result card over an ended run, and the
 * question before a run is thrown away, each wired to `GameService`.
 *
 * The board takes the focus as a run begins, as the page loads, after a
 * dialog over it closes, and after the bar's Resume, so the keys steer at
 * once. The level in play pauses whenever the player looks away from the
 * room (`[fzPlayRoom]`).
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BarComponent,
    BoardComponent,
    ConfirmDialogComponent,
    HelpComponent,
    LevelsComponent,
    PlayRoomDirective,
    ResultComponent,
    SettingsComponent,
  ],
  host: {
    "[class.compact]": "viewport.isCompact()",
    "[attr.data-bar]": "viewport.barPlacement()",
  },
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly viewport = inject(GameViewportService);
  protected readonly game = inject(GameService);
  private readonly board = viewChild.required(BoardComponent);
  private readonly debug = inject(DebugService);
  private readonly stats = inject(StatsService);
  private readonly progress = inject(ProgressService);
  protected readonly levels = inject(GAME_LEVELS);

  protected readonly levelsOpen = signal(false);
  protected readonly helpOpen = signal(false);
  protected readonly settingsOpen = signal(false);

  /**
   * The last run's end, kept as the next run begins, so the result card
   * closes through its `open`, giving the focus back as a dialog closing
   * does, rather than leaving the page while it is open.
   */
  protected readonly lastEnd = linkedSignal<RunEnd | null, RunEnd | null>({
    source: this.game.runEnd,
    computation: (end, previous) => end ?? previous?.value ?? null,
  });

  /**
   * The pictures How to play shows, asked of the scene only while it is
   * open, as the scene encodes them only as they are asked for.
   */
  protected readonly helpPictures = computed((): HelpPictures | null => {
    const pictures = this.game.pictures();
    return this.helpOpen() && pictures !== null ? pictures() : null;
  });

  /**
   * How far each level has been played, as the Levels dialog shows it,
   * every level open while the debug menu opens them.
   */
  protected readonly marks = computed(() => {
    const marks = levelMarksOf(
      this.levels,
      this.progress.cleared(),
      this.stats.stats(),
    );
    if (!this.debug.everyLevelOpen()) return marks;
    return Object.fromEntries(
      Object.entries(marks).map(([id, mark]) => [id, { ...mark, open: true }]),
    );
  });

  constructor() {
    refocusWhenUncovered(this.board, this.game.runs);
  }

  /** Pauses the level in play as the player looks away from the room. */
  protected pauseRun(): void {
    this.game.pause();
  }

  /** Goes on with the paused level, as the bar's Resume asks, and hands the board the focus back from it. */
  protected resumeRun(): void {
    this.game.resume();
    this.board().focus();
  }

  /** Starts a new run at the level the last one started at, asking first if one is in progress. */
  protected newGame(): void {
    void this.game.newGame();
  }

  /** Starts a run at the level chosen, asking first if one is in progress, and closes the Levels dialog once it has. */
  protected async startAt(level: number): Promise<void> {
    if (await this.game.startAt(level)) this.levelsOpen.set(false);
  }

  /** Puts the result card away and opens the Levels dialog, as the card's Choose a level asks. */
  protected chooseLevel(): void {
    this.game.closeResult();
    this.levelsOpen.set(true);
  }
}
