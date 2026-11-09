import { type Signal, inject, signal } from "@angular/core";
import { AnnouncerService } from "@fz/ui/announcer";
import { type ConfirmRequest, ConfirmService } from "@fz/ui/confirm";

/**
 * Names where a run stands, among the stages the games' runs pass through:
 * waiting for its first move, under way, paused, a stage cleared, or ended,
 * lost or won.
 */
export type RunStage =
  "ready" | "playing" | "paused" | "cleared" | "over" | "won";

/**
 * Names what the keys every game shares ask of its run: to pause; to pause
 * or go on, as it isn't (`toggle`); or to go on (`go`).
 */
export type RunCommand = "pause" | "toggle" | "go";

/** What a new run asks before it throws away the one under way. */
const NEW_GAME_QUESTION: ConfirmRequest = {
  title: "Start a new game?",
  message: "The run in progress will be lost.",
  confirmLabel: "New game",
  tone: "danger",
};

/** Returns what a run at another speed asks: New game's question, naming the speed. */
export function speedQuestion(speedName: string): ConfirmRequest {
  return { ...NEW_GAME_QUESTION, title: `Start a new ${speedName} game?` };
}

/**
 * Holds what every game's run does around its play: pausing and going on as
 * the keys ask, starting another once an ended run's card is put away,
 * waiting for the board to be drawn, counting the runs begun, and asking
 * before a run in progress is lost.
 *
 * A game's `GameService` extends it, giving its run's stage and pausing,
 * going on and starting runs as its rules say, and calls `began()` as each
 * run begins. Nothing here reads what the game gives while it is made, so
 * the game's fields and constructor may lay out its first run.
 */
export abstract class RunLifecycle {
  private readonly confirm = inject(ConfirmService);

  /** Says what happens to the run, through the page's live region. */
  protected readonly announcer = inject(AnnouncerService);

  private readonly runsState = signal(0);
  private readonly drawnState = signal(true);

  /** Where the run stands, which a game gives from its run, in the stages its runs have. */
  abstract readonly outcome: Signal<RunStage>;

  /** Whether the run has ended, which a game gives as its rules end a run. */
  abstract readonly ended: Signal<boolean>;

  /**
   * Whether a run is in progress, which a game gives as its rules say: one
   * a new game would lose, so it asks first.
   */
  abstract readonly inProgress: Signal<boolean>;

  /**
   * Whether the card over an ended run has been put away, leaving the board
   * to look at, which a game gives from its card: from then, a key starts
   * another run.
   */
  abstract readonly resultClosed: Signal<boolean>;

  /**
   * How many runs have begun since the page loaded, each new game or run
   * taken up adding one, for the board to take the focus after.
   */
  readonly runs = this.runsState.asReadonly();

  /**
   * Whether the board is drawn, which a game's `resume()`, next stage and
   * first move wait for, since the board's scene is what moves the run on.
   */
  readonly drawn = this.drawnState.asReadonly();

  /** Pauses the run in play, as a game's rules let one pause, and says so. */
  abstract pause(): void;

  /** Goes on with a paused run, as a game's rules let one, once the board is drawn, and says so. */
  abstract resume(): void;

  /**
   * Starts a new run, asking first through `mayLoseRun()` if one is in
   * progress, and resolves to whether it did; a game calls `began()` as the
   * run begins.
   */
  abstract newGame(): Promise<boolean>;

  /** Does what a key, a click or a tap on the board asks. */
  command(command: RunCommand): void {
    switch (command) {
      case "pause":
        this.pause();
        return;
      case "toggle":
        this.toggle();
        return;
      case "go":
        this.go();
        return;
    }
  }

  /** Says whether the board is drawn yet, as the board's canvas reports it. */
  setDrawn(drawn: boolean): void {
    this.drawnState.set(drawn);
  }

  /**
   * Pauses the run in play, or goes on with one paused, or starts another
   * once an ended run's card is put away.
   */
  private toggle(): void {
    if (this.mayStartAnother()) {
      void this.newGame();
    } else if (this.outcome() === "paused") {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Goes on with a paused run, or to the stage after one cleared, or starts
   * another once an ended run's card is put away, as a key or a press on
   * the board asks.
   */
  protected go(): void {
    if (this.mayStartAnother()) {
      void this.newGame();
    } else if (this.outcome() === "cleared") {
      this.nextStage();
    } else {
      this.resume();
    }
  }

  /**
   * Goes on to the stage after the one just cleared, its wave or its level,
   * as `go()` asks: a game whose runs clear stages gives it, and one whose
   * runs clear none leaves it doing nothing.
   */
  protected nextStage(): void {
    // A run that clears no stage is never "cleared".
  }

  /**
   * Counts a run begun, for the board to take the focus after, then clears
   * what the last one said, as a game asks once each run is on the board.
   */
  protected began(): void {
    this.runsState.update((runs) => runs + 1);
    this.announcer.clear();
  }

  /** Returns whether a key may start another run: once an ended run's card is away. */
  private mayStartAnother(): boolean {
    return this.ended() && this.resultClosed();
  }

  /**
   * Resolves to whether to go ahead, asking a question first, New game's
   * unless given another: at once with no run in progress to lose.
   */
  protected async mayLoseRun(
    question: ConfirmRequest = NEW_GAME_QUESTION,
  ): Promise<boolean> {
    if (!this.inProgress()) return true;
    return this.confirm.ask(question);
  }
}
