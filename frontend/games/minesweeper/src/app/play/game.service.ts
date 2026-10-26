import {
  Injectable,
  InjectionToken,
  computed,
  inject,
  signal,
} from "@angular/core";
import { StopwatchService } from "@fz/game-ui/stopwatch";
import { AnnouncerService } from "@fz/ui/announcer";
import { ConfirmService } from "@fz/ui/confirm";
import { describeMove } from "../../rules/describe";
import type { DifficultyId } from "../../rules/difficulty";
import {
  type Field,
  createField,
  isOver,
  minesLeft,
  restart,
  reveal,
  toggleFlag,
} from "../../rules/field";
import { randomSeed } from "../../rules/random";
import { type Settings, SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";

/** Where new deals take their seeds from: `Math.random` but in specs. */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});

/**
 * Plays the game: holds the field, makes the player's moves on it, runs its
 * clock, keeps its score, and says what each move did.
 */
@Injectable({ providedIn: "root" })
export class GameService {
  private readonly settings = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly confirm = inject(ConfirmService);
  private readonly stopwatch = inject(StopwatchService);
  private readonly announcer = inject(AnnouncerService);
  private readonly random = inject(GAME_RANDOM);

  private readonly fieldState = signal<Field>(this.deal());
  private readonly difficultyState = signal<DifficultyId>(
    this.settings.settings().difficulty,
  );
  private readonly newBestState = signal(false);
  private readonly flagModeState = signal(false);
  private readonly resultOpenState = signal(false);

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

  /** The mines not yet flagged or stepped on. */
  readonly minesLeft = computed(() => minesLeft(this.fieldState()));

  /** Whether a game is under way, which a new deal would lose. */
  readonly inProgress = computed(() => this.fieldState().outcome === "playing");

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
    this.move(reveal(this.fieldState(), index));
  }

  /** Flags a hidden square, or takes the flag off. */
  flag(index: number): void {
    this.move(toggleFlag(this.fieldState(), index));
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
    if (!(await this.mayLoseGame())) return false;
    this.begin(this.deal(), 0, this.settings.settings().difficulty);
    return true;
  }

  /**
   * Starts the same field again, its mines where they were, asking first if
   * a game is under way, and resolves to whether it did.
   */
  async restart(): Promise<boolean> {
    if (!(await this.mayLoseGame())) return false;
    this.begin(restart(this.fieldState()), 0, this.difficultyState());
    return true;
  }

  /**
   * Changes the settings and deals a game from them, asking first if a game
   * is under way, and resolves to whether it did.
   */
  async changeSettings(change: Partial<Settings>): Promise<boolean> {
    if (!(await this.mayLoseGame())) return false;
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
    this.fieldState.set(field);
    this.difficultyState.set(difficulty);
    this.stopwatch.reset(seconds);
    this.newBestState.set(false);
    this.resultOpenState.set(false);
    this.announcer.clear();
    this.syncClock();
  }

  private move(after: Field): void {
    const before = this.fieldState();
    if (after === before) return;
    this.fieldState.set(after);
    this.syncClock();
    this.keepScore(before, after);
    this.announcer.say(describeMove(before, after));
    if (isOver(after)) this.resultOpenState.set(true);
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

  private async mayLoseGame(): Promise<boolean> {
    if (!this.inProgress()) return true;
    return this.confirm.ask({
      title: "Start a new game?",
      message: "The game in progress will be lost.",
      confirmLabel: "New game",
      tone: "danger",
    });
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
