import { DOCUMENT } from "@angular/common";
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewContainerRef,
  computed,
  inject,
  inputBinding,
  linkedSignal,
  outputBinding,
  signal,
  viewChild,
} from "@angular/core";
import { PlayRoomDirective, refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent, AnnouncerService } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { BarComponent } from "./bar/bar.component";
import { BoardComponent } from "./board/board.component";
import { DebugService } from "./debug/debug.service";
import type { HelpPictures } from "./help/help.component";
import { LevelsComponent } from "./levels/levels.component";
import { onDemand } from "./on_demand";
import { GameService } from "./play/game.service";
import { ResultComponent, type RunEnd } from "./result/result.component";
import { SettingsComponent } from "./settings/settings.component";
import { levelMarksOf } from "./stats/level_marks";
import { ProgressService } from "./stats/progress.service";
import { StatsService } from "./stats/stats.service";
import { GAME_LEVELS, LOAD_HELP } from "./tokens";

/**
 * The keys that move along the page or only modify another, which leave How
 * to play's opening be wherever they are pressed.
 */
const PASSING_KEYS: ReadonlySet<string> = new Set([
  "Tab",
  "Shift",
  "Control",
  "Alt",
  "Meta",
]);

/** What the announcer says when How to play couldn't be loaded. */
export const HELP_FAILED_WORDS =
  "How to play couldn't be loaded. Check the connection, then try again.";

/**
 * Shows the game: the bar, the board in the room the bar leaves it, the
 * live region that says what happens, the Levels dialog, How to play and
 * the settings the bar opens, the result card over an ended run, and the
 * question before a run is thrown away, each wired to `GameService`. How
 * to play is a chunk of its own, loaded as it first opens (`onDemand()`):
 * the bar shows its button busy meanwhile, Escape, or the focus, a press or
 * a key outside the bar, drops the opening, and the announcer says so if
 * the load fails.
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
    LevelsComponent,
    PlayRoomDirective,
    ResultComponent,
    SettingsComponent,
  ],
  host: {
    "[class.compact]": "viewport.isCompact()",
    "[attr.data-bar]": "viewport.barPlacement()",
    "(document:focusin)": "dropHelpOutsideBar($event)",
    "(document:pointerdown)": "dropHelpOutsideBar($event)",
  },
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly viewport = inject(GameViewportService);
  protected readonly game = inject(GameService);
  private readonly board = viewChild.required(BoardComponent);
  private readonly bar = viewChild.required<
    BarComponent,
    ElementRef<HTMLElement>
  >(BarComponent, { read: ElementRef });
  private readonly helpHost = viewChild.required("helpHost", {
    read: ViewContainerRef,
  });
  private readonly announcer = inject(AnnouncerService);
  private readonly debug = inject(DebugService);
  private readonly stats = inject(StatsService);
  private readonly progress = inject(ProgressService);
  protected readonly levels = inject(GAME_LEVELS);

  protected readonly levelsOpen = signal(false);
  protected readonly helpOpen = signal(false);

  /** Whether How to play is loading after a press, to open once it arrives. */
  protected readonly helpLoading = signal(false);

  /** Whether How to play is in the page, loaded, so a press opens it at once. */
  private helpMade = false;
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

  /** Loads How to play, a chunk of its own, and puts it in the page. */
  private readonly loadHelp = onDemand(
    inject(LOAD_HELP),
    () => this.helpHost(),
    [
      inputBinding("open", this.helpOpen),
      inputBinding("pictures", this.helpPictures),
      outputBinding("closed", () => {
        this.helpOpen.set(false);
      }),
    ],
  );

  /**
   * How far each level has been played, as the Levels dialog shows it,
   * every level open while the debug menu opens them.
   */
  protected readonly marks = computed(() =>
    levelMarksOf(
      this.levels,
      this.progress.cleared(),
      this.stats.stats(),
      this.debug.everyLevelOpen(),
    ),
  );

  constructor() {
    refocusWhenUncovered(this.board, this.game.runs);
    this.dropHelpAtKeys();
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

  /**
   * Opens How to play, as the bar asks, loading it the first time; if the
   * load fails, puts it away, so the next press tries again, and says so.
   */
  protected async openHelp(): Promise<void> {
    this.helpOpen.set(true);
    if (this.helpMade) return;
    this.helpLoading.set(true);
    this.helpMade = await this.loadHelp();
    // Dropped meanwhile, the opening is no longer the player's to hear of.
    if (!this.helpLoading()) return;
    this.helpLoading.set(false);
    if (this.helpMade) return;
    this.helpOpen.set(false);
    this.announcer.say(HELP_FAILED_WORDS);
  }

  /**
   * Drops How to play's opening while it loads, as Escape asks, or the
   * focus, a press or a key leaving the bar does, so it never opens over
   * what the player went back to; it still loads, for the next press.
   */
  protected dropHelp(): void {
    if (!this.helpLoading()) return;
    this.helpLoading.set(false);
    this.helpOpen.set(false);
  }

  /**
   * Drops How to play's opening while it loads at Escape anywhere, or at a
   * key pressed outside the bar but one that moves along the page, which
   * the focus moving out of the bar answers. The document hears them on
   * their way down, before a card's button keeps its keys from the page.
   */
  private dropHelpAtKeys(): void {
    const gone = new AbortController();
    inject(DestroyRef).onDestroy(() => {
      gone.abort();
    });
    inject(DOCUMENT).addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          this.dropHelp();
        } else if (!PASSING_KEYS.has(event.key)) {
          this.dropHelpOutsideBar(event);
        }
      },
      { capture: true, signal: gone.signal },
    );
  }

  /**
   * Drops How to play's opening as the focus moves out of the bar, from
   * which it was asked for, or a press lands outside it, which moves no
   * focus where a click doesn't focus a button, as in Safari, nor does a
   * key pressed after one.
   */
  protected dropHelpOutsideBar({ target }: Event): void {
    if (target instanceof Node && this.bar().nativeElement.contains(target)) {
      return;
    }
    this.dropHelp();
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
