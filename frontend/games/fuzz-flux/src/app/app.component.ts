import { DOCUMENT } from "@angular/common";
import {
  Component,
  DestroyRef,
  ElementRef,
  ViewContainerRef,
  computed,
  inject,
  inputBinding,
  outputBinding,
  signal,
  viewChild,
} from "@angular/core";
import { BugReportDialogComponent } from "@fz/game-ui/bug_report";
import { PlayRoomDirective, refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { KeepKeysDirective } from "@fz/phaser/canvas";
import { AnnouncerComponent, AnnouncerService } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { IconComponent } from "@fz/ui/icon";
import { onDemand } from "@fz/ui/on_demand";
import { BarComponent } from "./bar/bar.component";
import { LevelFiguresComponent } from "./bar/level_figures.component";
import { LevelTitleComponent } from "./bar/level_title.component";
import { BoardComponent } from "./board/board.component";
import {
  type CardChoice,
  LevelCardComponent,
} from "./cards/level_card.component";
import { LOAD_HELP } from "./help/load_help";
import { ChooseLevelComponent } from "./levels/choose_level.component";
import { newThingLine } from "../rules/run/describe";
import { GameService } from "./play/game.service";
import { SettingsComponent } from "./settings/settings.component";
import { SettingsService } from "./settings/settings.service";

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
  "How to play couldn't be loaded. Check your connection and try again.";

/**
 * Shows the game: the bar, the board, a wide window's panels beside it, the
 * card over the board at a level's end, Choose a level, as the bar and the
 * card open it, and How to play and the settings, as the bar opens them.
 *
 * A level that brings something new has a line about it, on the bar's
 * side of the board where the bar stands across the window. A phone on its
 * side leaves the board the whole height, so there the line shows in the
 * panel, or, where the phone spares no panel, in the room left of the
 * board. Across the window the line never moves to the panel: the height
 * it takes from the board could bring the panels on, and its leaving take
 * them off again.
 *
 * How to play is a chunk of its own, loaded as it first opens
 * (`onDemand()`): the bar shows its button busy meanwhile, Escape, or the
 * focus, a press or a key outside the bar, drops the opening, and the
 * announcer says so if the load fails.
 *
 * The board takes the focus as a level begins, as the page loads or after
 * a dialog over it closes, so the keys play at once.
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BarComponent,
    BoardComponent,
    BugReportDialogComponent,
    ChooseLevelComponent,
    ConfirmDialogComponent,
    IconComponent,
    KeepKeysDirective,
    LevelCardComponent,
    LevelFiguresComponent,
    LevelTitleComponent,
    PlayRoomDirective,
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
  private readonly settings = inject(SettingsService);
  private readonly board = viewChild.required(BoardComponent);
  private readonly bar = viewChild.required(BarComponent);
  private readonly barElement = viewChild.required<
    BarComponent,
    ElementRef<HTMLElement>
  >(BarComponent, { read: ElementRef });
  private readonly panelFigures = viewChild(LevelFiguresComponent);
  private readonly helpHost = viewChild.required("helpHost", {
    read: ViewContainerRef,
  });
  private readonly announcer = inject(AnnouncerService);

  /** Whether Choose a level is open. */
  protected readonly levelsOpen = signal(false);

  /** Whether How to play is open, or opens once it has loaded. */
  protected readonly helpOpen = signal(false);

  /** Whether How to play is loading after a press, to open once it arrives. */
  protected readonly helpLoading = signal(false);

  /** Whether How to play is in the page, loaded, so a press opens it at once. */
  private helpMade = false;

  /** Whether the settings are open. */
  protected readonly settingsOpen = signal(false);

  /** Whether the player wants sound, as Sound and the settings say. */
  protected readonly soundOn = computed(() => this.settings.settings().sound);

  /** Whether the panels beside the board show the level, its figures and its buttons, in the bar's place. */
  protected readonly panelled = computed(() => this.board().panels() !== null);

  /**
   * The pictures of the pieces the board last baked, each bake's encoded
   * once, as the bar, the panel, the cards and How to play show them, or
   * null before the board has baked them.
   */
  protected readonly pictures = computed(
    () => this.board().pictures()?.() ?? null,
  );

  /** Loads How to play, a chunk of its own, and puts it in the page. */
  private readonly loadHelp = onDemand(
    inject(LOAD_HELP),
    () => this.helpHost(),
    [
      inputBinding("open", this.helpOpen),
      inputBinding("pictures", this.pictures),
      outputBinding("closed", () => {
        this.helpOpen.set(false);
      }),
    ],
  );

  /** The line about what the level brings in new, or null for a level that brings nothing. */
  private readonly line = computed(() => {
    const thing = this.game.state().newThing;
    return thing === null ? null : newThingLine(thing);
  });

  /** Whether the bar runs down the end of a phone on its side. */
  private readonly onRail = computed(
    () => this.viewport.barPlacement() === "end",
  );

  /** The line about what the level brings in new on the bar's side of the board, where the bar stands across the window, or null. */
  protected readonly lineBesideBar = computed(() =>
    this.onRail() ? null : this.line(),
  );

  /** The line about what the level brings in new where the panel shows it, on a phone on its side, or null. */
  protected readonly lineInPanel = computed(() =>
    this.onRail() ? this.line() : null,
  );

  /** The line about what the level brings in new left of the board, on a phone on its side that spares no panel, and where it lies there, or null. */
  protected readonly lineBesideBoard = computed(() => {
    const line = this.lineInPanel();
    const room = this.board().besideBoard();
    return line !== null && room !== null ? { line, room } : null;
  });

  /** Each goal's picture where the page shows the level's figures, in the panel or else in the bar, for the board's copies to fly to. */
  protected readonly goalPictures = computed(() => {
    const figures = this.panelFigures() ?? this.bar().figures();
    return (
      figures?.goalPictures().map(({ nativeElement }) => nativeElement) ?? []
    );
  });

  constructor() {
    refocusWhenUncovered(this.board, this.game.runs);
    this.dropHelpAtKeys();
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
  private dropHelp(): void {
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
    if (
      target instanceof Node &&
      this.barElement().nativeElement.contains(target)
    ) {
      return;
    }
    this.dropHelp();
  }

  /** Turns the sound on or off, as Sound asks. */
  protected toggleSound(): void {
    this.settings.update({ sound: !this.soundOn() });
  }

  /** Does what a card's button asks, its sound played first. */
  protected chooseFromCard(choice: CardChoice): void {
    this.game.cue("button");
    switch (choice) {
      case "next-level":
        void this.game.nextLevel();
        return;
      case "play-again":
      case "try-again":
        void this.game.newGame();
        return;
      case "choose-level":
        this.levelsOpen.set(true);
        return;
    }
  }

  /** Plays the level again on its deal, as Restart asks, asking first once a move is made. */
  protected restart(): void {
    void this.game.restart();
  }
}
