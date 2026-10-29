import {
  DestroyRef,
  Injectable,
  InjectionToken,
  computed,
  inject,
  signal,
} from "@angular/core";
import { StopwatchService } from "@fz/game-ui/stopwatch";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerService } from "@fz/ui/announcer";
import { type ConfirmRequest, ConfirmService } from "@fz/ui/confirm";
import { describeMove } from "../../rules/describe";
import { type DifficultyId, difficultyName } from "../../rules/difficulty";
import {
  type Field,
  createField,
  isOver,
  minesLeft,
  restart,
  reveal,
  toggleFlag,
} from "../../rules/field";
import { randomSeed } from "@fz/core/random";
import { LANDING_MS } from "../board/landing";
import { type Settings, SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";

/** Where new deals take their seeds from: `Math.random` but in specs. */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});

/**
 * How long a finished board is left to look at before the card opens, once
 * nothing on it moves, in ms.
 */
export const LOOK_MS = 600;

/**
 * How long a finished board shows how the game ended before the card opens,
 * in ms: the board's landings and a moment to look at them, or the moment
 * alone where motion is unwelcome, but in specs.
 */
export const ENDING_PAUSE = new InjectionToken<() => number>("ENDING_PAUSE", {
  providedIn: "root",
  factory: () => {
    const viewport = inject(GameViewportService);
    return () => (viewport.allowsMotion() ? LANDING_MS : 0) + LOOK_MS;
  },
});

/** Says what a move did: the field before it, and the square it was made on. */
export interface Move {
  readonly before: Field;
  readonly at: number;
}

/** What a new deal asks before it throws away the game under way. */
const NEW_GAME_QUESTION: ConfirmRequest = {
  title: "Start a new game?",
  message: "The game in progress will be lost.",
  confirmLabel: "New game",
  tone: "danger",
};

/** What a deal at a difficulty asks: New Game's question, naming it. */
function difficultyQuestion(difficulty: DifficultyId): ConfirmRequest {
  return {
    ...NEW_GAME_QUESTION,
    title: `Start a new ${difficultyName(difficulty)} game?`,
  };
}

/** What Restart asks before it covers the field again. */
const RESTART_QUESTION: ConfirmRequest = {
  title: "Restart this field?",
  message:
    "Every square is covered again, the mines where they were, and the clock and your lives start over.",
  confirmLabel: "Restart",
  tone: "danger",
};

/**
 * Plays the game: holds the field, makes the player's moves on it, runs its
 * clock, keeps its score, and says what each move did.
 *
 * When a game ends, the board shows how for a moment before the card opens,
 * and a move made on it meanwhile opens the card at once.
 */
@Injectable({ providedIn: "root" })
export class GameService {
  private readonly settings = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly confirm = inject(ConfirmService);
  private readonly stopwatch = inject(StopwatchService);
  private readonly announcer = inject(AnnouncerService);
  private readonly random = inject(GAME_RANDOM);
  private readonly endingPause = inject(ENDING_PAUSE);

  private readonly fieldState = signal<Field>(this.deal());
  private readonly difficultyState = signal<DifficultyId>(
    this.settings.settings().difficulty,
  );
  private readonly newBestState = signal(false);
  private readonly flagModeState = signal(false);
  private readonly resultOpenState = signal(false);
  private readonly lastMoveState = signal<Move | null>(null);
  private readonly endingState = signal(false);
  private endingTimer: ReturnType<typeof setTimeout> | undefined;

  /** The game on the board. */
  readonly field = this.fieldState.asReadonly();

  /** The difficulty the game on the board was dealt at. */
  readonly difficulty = this.difficultyState.asReadonly();

  /** Whether the game just won set a new best time. */
  readonly newBest = this.newBestState.asReadonly();

  /** Whether a tap or click flags a square rather than revealing it. */
  readonly flagMode = this.flagModeState.asReadonly();

  /**
   * How long the game has been played, in whole seconds, not counting while
   * the page is out of sight.
   */
  readonly seconds = this.stopwatch.seconds;

  /** Whether the card at the end of a game is showing. */
  readonly resultOpen = this.resultOpenState.asReadonly();

  /** The last move that changed the field, or null since the deal. */
  readonly lastMove = this.lastMoveState.asReadonly();

  /**
   * Whether the game has just ended and the board is showing how, before the
   * card opens.
   */
  readonly ending = this.endingState.asReadonly();

  /** The mines not yet flagged or stepped on. */
  readonly minesLeft = computed(() => minesLeft(this.fieldState()));

  /** Whether a game is under way, which a new deal would lose. */
  readonly inProgress = computed(() => this.fieldState().outcome === "playing");

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.endingTimer);
    });
  }

  /** Reveals a square, or flags it in Flag mode: what a click or a tap does. */
  play(index: number): void {
    if (this.flagModeState()) {
      this.flag(index);
    } else {
      this.reveal(index);
    }
  }

  /** Reveals a square, or the squares around a number whose flags match it. */
  reveal(index: number): void {
    if (this.cutEndingShort()) return;
    this.move(index, reveal(this.fieldState(), index));
  }

  /** Flags a hidden square, or takes the flag off. */
  flag(index: number): void {
    if (this.cutEndingShort()) return;
    this.move(index, toggleFlag(this.fieldState(), index));
  }

  /** Turns Flag mode on or off. */
  toggleFlagMode(): void {
    this.flagModeState.update((on) => !on);
  }

  /**
   * Deals a new field from the settings, asking first if a game is under
   * way, and resolves to whether it did.
   */
  async newGame(): Promise<boolean> {
    if (!(await this.mayLoseGame(NEW_GAME_QUESTION))) return false;
    this.begin(this.deal(), 0, this.settings.settings().difficulty);
    return true;
  }

  /**
   * Starts the same field again, its mines where they were, asking first if
   * a game is under way, and resolves to whether it did.
   */
  async restart(): Promise<boolean> {
    if (!(await this.mayLoseGame(RESTART_QUESTION))) return false;
    this.begin(restart(this.fieldState()), 0, this.difficultyState());
    return true;
  }

  /**
   * Changes the settings and deals a game from them, asking first if a game
   * is under way, naming the difficulty if it changes, and resolves to
   * whether it did.
   */
  async changeSettings(change: Partial<Settings>): Promise<boolean> {
    const question = change.difficulty
      ? difficultyQuestion(change.difficulty)
      : NEW_GAME_QUESTION;
    if (!(await this.mayLoseGame(question))) return false;
    this.settings.update(change);
    this.begin(this.deal(), 0, this.settings.settings().difficulty);
    return true;
  }

  /** Takes up a game where it was left, such as one saved before a reload. */
  resume(field: Field, seconds: number, difficulty: DifficultyId): void {
    this.begin(field, seconds, difficulty);
  }

  /** Puts away the card at the end of a game, leaving the board to look at. */
  closeResult(): void {
    this.resultOpenState.set(false);
  }

  private deal(): Field {
    return createField(
      this.settings.size(),
      this.settings.settings().lives,
      randomSeed(this.random),
    );
  }

  private begin(field: Field, seconds: number, difficulty: DifficultyId): void {
    this.stopEnding();
    this.fieldState.set(field);
    this.difficultyState.set(difficulty);
    this.stopwatch.reset(seconds);
    this.newBestState.set(false);
    this.resultOpenState.set(false);
    this.lastMoveState.set(null);
    this.announcer.clear();
    this.syncClock();
  }

  private move(at: number, after: Field): void {
    const before = this.fieldState();
    if (after === before) return;
    this.fieldState.set(after);
    this.lastMoveState.set({ before, at });
    this.syncClock();
    this.keepScore(before, after);
    this.announcer.say(describeMove(before, after));
    if (isOver(after)) this.end();
  }

  /** Leaves the finished board to show how the game ended, then opens the card. */
  private end(): void {
    const pause = this.endingPause();
    if (pause <= 0) {
      this.showResult();
      return;
    }
    this.endingState.set(true);
    this.endingTimer = setTimeout(() => {
      this.showResult();
    }, pause);
  }

  /**
   * Opens the card if the board is showing how the game ended, and returns
   * whether it did.
   */
  private cutEndingShort(): boolean {
    if (!this.endingState()) return false;
    this.showResult();
    return true;
  }

  private showResult(): void {
    this.stopEnding();
    this.resultOpenState.set(true);
  }

  private stopEnding(): void {
    clearTimeout(this.endingTimer);
    this.endingState.set(false);
  }

  /** Counts a game once its first square is revealed, and again if it is won. */
  private keepScore(before: Field, after: Field): void {
    const difficulty = this.difficultyState();
    if (before.outcome === "ready" && after.outcome !== "ready") {
      this.stats.recordStart(difficulty);
    }
    if (after.outcome === "won") {
      this.newBestState.set(
        this.stats.recordWin(difficulty, this.stopwatch.seconds()),
      );
    }
  }

  /** Resolves to whether to go ahead: at once with no game under way to lose. */
  private async mayLoseGame(question: ConfirmRequest): Promise<boolean> {
    if (!this.inProgress()) return true;
    return this.confirm.ask(question);
  }

  /** Runs the clock while a game is under way. */
  private syncClock(): void {
    if (this.fieldState().outcome === "playing") {
      this.stopwatch.start();
    } else {
      this.stopwatch.stop();
    }
  }
}
