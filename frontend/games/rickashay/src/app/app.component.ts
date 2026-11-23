import {
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from "@angular/core";
import { LevelsComponent, levelMarksOf } from "@fz/brick-wall/app/levels";
import { ResultComponent, type RunEnd } from "@fz/brick-wall/app/result";
import { PlayRoomDirective, refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { MOST_STARS, starCount } from "../rules/run/stars";
import { BoardComponent } from "./board/board.component";
import { GameService } from "./play/game.service";
import { ProgressService } from "./stats/progress.service";
import { StatsService } from "./stats/stats.service";
import { GAME_LEVELS } from "./tokens";

/**
 * Shows the game: the board in the room the page leaves it, the live region
 * that says what happens, the result card over an ended run, the Levels
 * dialog it offers, and the question before a run is thrown away, each
 * wired to `GameService`.
 *
 * The board takes the focus as a run begins, as the page loads, and after
 * a dialog over it closes, so the keys steer at once. The level in play
 * pauses whenever the player looks away from the room (`[fzPlayRoom]`), a
 * flight in the air landing at once first as the page is hidden.
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BoardComponent,
    ConfirmDialogComponent,
    LevelsComponent,
    PlayRoomDirective,
    ResultComponent,
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
  private readonly stats = inject(StatsService);
  private readonly progress = inject(ProgressService);
  protected readonly levels = inject(GAME_LEVELS);

  protected readonly levelsOpen = signal(false);

  /**
   * The last run's end, kept as the next run begins, so the result card
   * closes through its `open`, giving the focus back as a dialog closing
   * does, rather than leaving the page while it is open.
   */
  protected readonly lastEnd = linkedSignal<RunEnd | null, RunEnd | null>({
    source: this.game.runEnd,
    computation: (end, previous) => end ?? previous?.value ?? null,
  });

  /** The most stars a level earns, as the Levels dialog counts them. */
  protected readonly mostStars = MOST_STARS;

  /**
   * How far each level has been played, as the Levels dialog shows it: its
   * stars and its best rally from the stats, once it is cleared.
   */
  protected readonly marks = computed(() =>
    levelMarksOf(
      this.levels,
      this.progress.cleared(),
      this.stats.stats().levels,
      ({ stars, rally }) => ({ stars: starCount(stars), best: rally }),
    ),
  );

  constructor() {
    refocusWhenUncovered(this.board, this.game.runs);
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
