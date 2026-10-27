import {
  Injectable,
  InjectionToken,
  computed,
  inject,
  signal,
} from "@angular/core";
import { StopwatchService, formatClock } from "@fz/game-ui/stopwatch";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { CELLS } from "../../rules/cells";
import { deal } from "../../rules/deal";
import { describeMove } from "../../rules/describe";
import type { Level } from "../../rules/difficulty";
import {
  type Grid,
  countHint,
  createGrid,
  erase,
  place,
  restart,
  toggleNote,
  undo,
} from "../../rules/grid";
import { type Hint, fillHint, firstBlank, hintFor } from "../../rules/hint";
import { randomSeed } from "../../rules/random";
import { SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";

/** Where new deals take their seeds from: `Math.random` but in specs. */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});

/**
 * Plays the game: holds the grid and the square selected, makes the player's
 * moves on it, gives hints, runs its clock, keeps its score, and says what
 * each move did.
 */
@Injectable({ providedIn: "root" })
export class GameService {
  private readonly settings = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly confirm = inject(ConfirmService);
  private readonly stopwatch = inject(StopwatchService);
  private readonly announcer = inject(AnnouncerService);
  private readonly random = inject(GAME_RANDOM);

  private readonly gridState = signal<Grid>(
    this.deal(this.settings.settings().level),
  );
  private readonly selectedState = signal(firstBlank(this.gridState()));
  private readonly notesModeState = signal(false);
  private readonly hintState = signal<Hint | null>(null);
  private readonly countedState = signal(false);
  private readonly newBestState = signal(false);
  private readonly resultOpenState = signal(false);

  /** The game on the board. */
  readonly grid = this.gridState.asReadonly();

  /** The square the player has selected, which the pad and keys act on. */
  readonly selected = this.selectedState.asReadonly();

  /** Whether a digit adds or takes away a note rather than placing it. */
  readonly notesMode = this.notesModeState.asReadonly();

  /** The hint showing, until the board changes. */
  readonly hint = this.hintState.asReadonly();

  /** Whether the puzzle just solved set a new best time. */
  readonly newBest = this.newBestState.asReadonly();

  /** Whether the card over a solved puzzle is showing. */
  readonly resultOpen = this.resultOpenState.asReadonly();

  /**
   * How long the game has been played, in whole seconds, not counting while
   * the page is out of sight.
   */
  readonly seconds = this.stopwatch.seconds;

  /** The level the game on the board was dealt at. */
  readonly level = computed(() => this.gridState().puzzle.level);

  /** Whether a game is under way, which a new deal would lose. */
  readonly inProgress = computed(
    () => this.countedState() && this.gridState().outcome === "playing",
  );

  /** Whether the puzzle on the board is solved, after which nothing changes. */
  readonly solved = computed(() => this.gridState().outcome === "solved");

  /** Whether a hint can be shown, or the one showing filled in. */
  readonly canHint = computed(() => this.gridState().outcome === "playing");

  /** Whether there is a move to take back. */
  readonly canUndo = computed(() => {
    const grid = this.gridState();
    return grid.outcome === "playing" && grid.history.length > 0;
  });

  constructor() {
    this.stopwatch.reset();
    this.stopwatch.start();
  }

  /** Selects a square. */
  select(index: number): void {
    if (Number.isInteger(index) && index >= 0 && index < CELLS) {
      this.selectedState.set(index);
    }
  }

  /**
   * Puts a digit in the selected square, or in Notes mode adds or takes away
   * a note: what a digit on the pad or the keyboard does.
   */
  enter(digit: number): void {
    if (this.notesModeState()) {
      this.toggleNote(digit);
    } else {
      this.place(digit);
    }
  }

  /** Puts a digit in the selected square, or takes away the one it holds. */
  place(digit: number): void {
    const { clearNotes } = this.settings.settings();
    this.move(
      place(this.gridState(), this.selectedState(), digit, { clearNotes }),
    );
  }

  /** Adds a note to the selected square, or takes it away. */
  toggleNote(digit: number): void {
    this.move(toggleNote(this.gridState(), this.selectedState(), digit));
  }

  /** Clears the selected square of its digit, or of its notes. */
  erase(): void {
    this.move(erase(this.gridState(), this.selectedState()));
  }

  /** Takes back the last move. */
  undo(): void {
    const before = this.gridState();
    const after = undo(before);
    if (after === before) return;
    this.gridState.set(after);
    this.hintState.set(null);
    this.announcer.say("Undone.");
  }

  /** Turns Notes mode on or off. */
  toggleNotesMode(): void {
    this.notesModeState.update((on) => !on);
  }

  /**
   * Shows a hint, or fills in the one showing.
   *
   * A hint first checks the board: a digit on it that the solution doesn't
   * hold is the hint, whether or not mistakes are marked, and then notes
   * that leave out their square's digit. Otherwise it is the square logic
   * fills next, with the steps that prove it. Either way it selects the
   * square and counts, so a puzzle solved with one sets no best time.
   */
  useHint(): void {
    const showing = this.hintState();
    if (showing) {
      this.fill(showing);
      return;
    }
    const grid = this.gridState();
    if (grid.outcome !== "playing") return;
    const hint = hintFor(grid);
    if (!hint) {
      this.announcer.say("No hint: logic finds no next step here.");
      return;
    }
    this.gridState.set(countHint(grid));
    this.hintState.set(hint);
    this.selectedState.set(hint.index);
    this.announcer.say(`${hint.title}. ${hint.text}`);
  }

  /**
   * Deals a new puzzle at the level in the settings, asking first if a game
   * is under way, and resolves to whether it did.
   */
  async newGame(): Promise<boolean> {
    if (!(await this.mayLoseGame())) return false;
    this.begin(this.deal(this.settings.settings().level));
    return true;
  }

  /**
   * Starts the same puzzle again, asking first if a game is under way, and
   * resolves to whether it did.
   */
  async restart(): Promise<boolean> {
    if (!(await this.mayLoseGame())) return false;
    this.begin(restart(this.gridState()));
    return true;
  }

  /**
   * Deals a puzzle at another level, and keeps it in the settings, asking
   * first if a game is under way, and resolves to whether it did.
   */
  async changeLevel(level: Level): Promise<boolean> {
    if (!(await this.mayLoseGame())) return false;
    this.settings.update({ level });
    this.begin(this.deal(level));
    return true;
  }

  /** Takes up a game where it was left, such as one saved before a reload. */
  resume(grid: Grid, seconds: number): void {
    this.begin(grid, seconds, true);
  }

  /** Puts away the card over a solved puzzle, leaving the board to look at. */
  closeResult(): void {
    this.resultOpenState.set(false);
  }

  private deal(level: Level): Grid {
    return createGrid(deal(level, randomSeed(this.random)));
  }

  private begin(grid: Grid, seconds = 0, counted = false): void {
    this.gridState.set(grid);
    this.selectedState.set(firstBlank(grid));
    this.hintState.set(null);
    this.countedState.set(counted);
    this.newBestState.set(false);
    this.resultOpenState.set(false);
    this.announcer.clear();
    this.stopwatch.reset(seconds);
    if (grid.outcome === "playing") this.stopwatch.start();
  }

  /** Makes a move, and says what it did. */
  private move(after: Grid): void {
    const before = this.gridState();
    if (after === before) return;
    this.gridState.set(after);
    this.hintState.set(null);
    if (!this.countedState()) {
      this.countedState.set(true);
      this.stats.recordStart(after.puzzle.level);
    }
    if (after.outcome !== "solved") {
      this.announcer.say(describeMove(before, after));
      return;
    }
    this.stopwatch.stop();
    const seconds = this.stopwatch.seconds();
    this.newBestState.set(
      this.stats.recordSolve(after.puzzle.level, seconds, after.hints),
    );
    this.announcer.say(`Solved in ${formatClock(seconds)}.`);
    this.resultOpenState.set(true);
  }

  /** Fills in a hint: the digit a step names, the note, or out with a wrong one. */
  private fill(hint: Hint): void {
    const { clearNotes } = this.settings.settings();
    this.selectedState.set(hint.index);
    this.move(fillHint(this.gridState(), hint, { clearNotes }));
  }

  private async mayLoseGame(): Promise<boolean> {
    if (!this.inProgress()) return true;
    return this.confirm.ask({
      title: "Start a new game?",
      message: "The game in progress will be lost.",
      confirmLabel: "New game",
      tone: "danger",
    });
  }
}
