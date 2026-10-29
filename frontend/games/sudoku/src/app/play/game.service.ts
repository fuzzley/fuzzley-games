import {
  Injectable,
  InjectionToken,
  computed,
  inject,
  signal,
} from "@angular/core";
import { StopwatchService, formatClock } from "@fz/game-ui/stopwatch";
import { AnnouncerService } from "@fz/ui/announcer";
import { type ConfirmRequest, ConfirmService } from "@fz/ui/confirm";
import { CELLS } from "../../rules/cells";
import { deal } from "../../rules/deal";
import {
  describeMove,
  describeRefusal,
  describeUndo,
} from "../../rules/describe";
import { LEVEL_INFO, type Level } from "../../rules/difficulty";
import {
  type Grid,
  countHint,
  createGrid,
  erase,
  fillNotes,
  place,
  restart,
  toggleNote,
  undo,
} from "../../rules/grid";
import { type Hint, fillHint, firstBlank, hintFor } from "../../rules/hint";
import { count } from "@fz/core/format";
import { randomSeed } from "@fz/core/random";
import { SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";

/** Where new deals take their seeds from: `Math.random` but in specs. */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});

/** What a new deal asks before it throws away the game under way. */
const NEW_GAME_QUESTION: ConfirmRequest = {
  title: "Start a new game?",
  message: "The game in progress will be lost.",
  confirmLabel: "New game",
  tone: "danger",
};

/** What a deal at another level asks: New Game's question, naming the level. */
function levelQuestion(level: Level): ConfirmRequest {
  return {
    ...NEW_GAME_QUESTION,
    title: `Start a new ${LEVEL_INFO[level].name} game?`,
  };
}

/** What Restart asks before it clears the game under way. */
const RESTART_QUESTION: ConfirmRequest = {
  title: "Restart this puzzle?",
  message: "Your digits and notes will be cleared, and the clock starts again.",
  confirmLabel: "Restart",
  tone: "danger",
};

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
  private readonly replayState = signal(false);
  private readonly dealsState = signal(0);
  private readonly coveredState = signal(false);

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
   * Whether the puzzle is being played again after it was solved, which the
   * stats leave out, as its solution may still be in mind.
   */
  readonly replay = this.replayState.asReadonly();

  /**
   * How many games have begun since the page loaded, each new deal, restart
   * or game taken up adding one, for the board to take the focus after.
   */
  readonly deals = this.dealsState.asReadonly();

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
    this.syncClock();
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

  /**
   * Notes every digit each blank square without notes could still hold, as
   * one move. It is bookkeeping rather than logic, so unlike a hint it costs
   * no best time.
   */
  fillNotes(): void {
    const before = this.gridState();
    const after = fillNotes(before);
    if (after === before) {
      if (before.outcome === "playing") {
        this.announcer.say("Every blank square has notes already.");
      }
      return;
    }
    const squares = after.history.at(-1)?.length ?? 0;
    this.move(
      after,
      `Notes filled in for ${count(squares, "square", "squares")}.`,
    );
  }

  /**
   * Takes back the last move, selects the square it was made on, so the eye
   * goes to what changed, and says what came back.
   */
  undo(): void {
    const before = this.gridState();
    const after = undo(before);
    if (after === before) return;
    const [main] = before.history.at(-1) ?? [];
    this.gridState.set(after);
    this.hintState.set(null);
    if (main) this.selectedState.set(main.index);
    this.announcer.say(describeUndo(before, after));
  }

  /** Turns Notes mode on or off, and says which. */
  toggleNotesMode(): void {
    this.notesModeState.update((on) => !on);
    this.announcer.say(this.notesModeState() ? "Notes on." : "Notes off.");
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
    if (!(await this.mayLoseGame(NEW_GAME_QUESTION))) return false;
    this.begin(this.deal(this.settings.settings().level));
    return true;
  }

  /**
   * Starts the same puzzle again, asking first if a game is under way, and
   * resolves to whether it did.
   *
   * It is the same game to the stats: one under way stays counted, and one
   * solved is a replay, which isn't counted again.
   */
  async restart(): Promise<boolean> {
    if (!(await this.mayLoseGame(RESTART_QUESTION))) return false;
    const grid = this.gridState();
    const replay = this.replayState() || grid.outcome === "solved";
    this.begin(restart(grid), 0, this.countedState() || replay, replay);
    return true;
  }

  /**
   * Deals a puzzle at another level, and keeps it in the settings, asking
   * first if a game is under way, and resolves to whether it did.
   */
  async changeLevel(level: Level): Promise<boolean> {
    if (!(await this.mayLoseGame(levelQuestion(level)))) return false;
    this.settings.update({ level });
    this.begin(this.deal(level));
    return true;
  }

  /** Takes up a game where it was left, such as one saved before a reload. */
  resume(grid: Grid, seconds: number, replay = false): void {
    this.begin(grid, seconds, true, replay);
  }

  /** Puts away the card over a solved puzzle, leaving the board to look at. */
  closeResult(): void {
    this.resultOpenState.set(false);
  }

  /**
   * Says whether a drawer or a dialog covers the board, which can't be
   * played meanwhile, so the clock stops until it is uncovered.
   */
  cover(covered: boolean): void {
    this.coveredState.set(covered);
    this.syncClock();
  }

  private deal(level: Level): Grid {
    return createGrid(deal(level, randomSeed(this.random)));
  }

  private begin(
    grid: Grid,
    seconds = 0,
    counted = false,
    replay = false,
  ): void {
    this.gridState.set(grid);
    this.selectedState.set(firstBlank(grid));
    this.hintState.set(null);
    this.countedState.set(counted);
    this.replayState.set(replay);
    this.newBestState.set(false);
    this.resultOpenState.set(false);
    this.dealsState.update((deals) => deals + 1);
    this.announcer.clear();
    this.stopwatch.reset(seconds);
    this.syncClock();
  }

  /** Runs the clock while the game is under way and nothing covers the board. */
  private syncClock(): void {
    if (this.gridState().outcome === "playing" && !this.coveredState()) {
      this.stopwatch.start();
    } else {
      this.stopwatch.stop();
    }
  }

  /**
   * Makes a move, and says what it did, in the words given or the move's
   * own, or why it did nothing.
   */
  private move(after: Grid, words?: string): void {
    const before = this.gridState();
    if (after === before) {
      const why = describeRefusal(before, this.selectedState());
      if (why) this.announcer.say(why);
      return;
    }
    this.gridState.set(after);
    this.hintState.set(null);
    if (!this.countedState()) {
      this.countedState.set(true);
      this.stats.recordStart(after.puzzle.level);
    }
    if (after.outcome !== "solved") {
      this.announcer.say(words ?? describeMove(before, after));
      return;
    }
    this.syncClock();
    const seconds = this.stopwatch.seconds();
    this.newBestState.set(
      !this.replayState() &&
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

  /** Resolves to whether to go ahead: at once with no game under way to lose. */
  private async mayLoseGame(question: ConfirmRequest): Promise<boolean> {
    if (!this.inProgress()) return true;
    return this.confirm.ask(question);
  }
}
