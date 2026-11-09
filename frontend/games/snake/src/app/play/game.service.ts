import {
  Injectable,
  InjectionToken,
  computed,
  inject,
  signal,
} from "@angular/core";
import { Countdown } from "@fz/core/clock";
import { hasEnded, isUnderWay } from "@fz/core/run";
import { RunNumbers } from "@fz/core/run_numbers";
import { RunLifecycle, speedQuestion } from "@fz/game-ui/run_lifecycle";
import { GameViewportService } from "@fz/game-ui/viewport";
import {
  describeEnd,
  describePause,
  describeResume,
  describeStart,
  describeTakenUp,
} from "../../rules/describe";
import type { Direction } from "../../rules/geometry";
import { type Run, createRun, pause, resume, turn } from "../../rules/run";
import { SPEED_INFO, type Speed } from "../../rules/speed";
import { advance } from "../../rules/stepper";
import type { BoardCommand } from "../../view/controls";
import type { SnakeFrame } from "../../view/frame";
import { resultDelayMs } from "../../view/timing";
import { SettingsService } from "../settings/settings.service";
import { StatsService } from "../stats/stats.service";

/** Where new runs take their seeds from: `Math.random` but in specs. */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});

/** The frame the scene is handed, one object written again each frame. */
interface Frame {
  run: Run;
  progress: number;
  newBest: boolean;
}

/**
 * Plays the game: holds the run, moves it on by the time the board's frames
 * take, turns, pauses and starts it as the player asks, keeps its score, and
 * says what happened.
 *
 * The run, the score and the outcome are signals, which change only on a
 * step. How far the snake has glided toward the next square changes every
 * frame, so it is a plain field the scene reads through {@link frame}, never
 * a signal a template would follow.
 */
@Injectable({ providedIn: "root" })
export class GameService extends RunLifecycle {
  private readonly settings = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly viewport = inject(GameViewportService);
  private readonly numbers = new RunNumbers(inject(GAME_RANDOM));

  private readonly runState = signal<Run>(
    this.create(this.settings.settings().speed),
  );
  private readonly newBestState = signal(false);
  private readonly resultOpenState = signal(false);
  private readonly resultClosedState = signal(false);

  /** The time since the last step, toward the next, in milliseconds. */
  private carried = 0;
  /** How far the run is from its last step to its next, from 0 to 1. */
  private progress = 0;
  /** The wait before the result card opens, from the run's end. */
  private readonly resultWait = new Countdown();
  private readonly shown: Frame = {
    run: this.runState(),
    progress: 0,
    newBest: false,
  };

  /** The run on the board. */
  readonly run = this.runState.asReadonly();

  /** Whether the run just ended set a new best score at its speed. */
  readonly newBest = this.newBestState.asReadonly();

  /** Whether the card over an ended run is showing. */
  readonly resultOpen = this.resultOpenState.asReadonly();

  /**
   * Whether the card over an ended run has been put away, leaving the board
   * to look at, from which another run starts at a key.
   */
  readonly resultClosed = this.resultClosedState.asReadonly();

  /** The apples eaten this run. */
  readonly score = computed(() => this.runState().eaten);

  /** The best score at the run's speed. */
  readonly best = computed(
    () => this.stats.stats()[this.runState().speed].best,
  );

  /** Where the run stands. */
  readonly outcome = computed(() => this.runState().outcome);

  /** Whether the run has ended, by a crash or a full board. */
  readonly ended = computed(() => hasEnded(this.runState().outcome));

  /** Whether a run is under way, which a new game would lose. */
  readonly inProgress = computed(() => isUnderWay(this.runState().outcome));

  /**
   * Moves the run on by the time a frame took, stepping it as often as the
   * time holds, and opens the result card once an ended run's fade has run.
   */
  tick(deltaMs: number): void {
    const run = this.runState();
    if (run.outcome === "playing") {
      const advanced = advance({ run, carried: this.carried }, deltaMs);
      this.carried = advanced.carried;
      this.progress = advanced.progress;
      if (advanced.run !== run) this.stepTo(advanced.run);
      return;
    }
    const waitMs = resultDelayMs(this.viewport.allowsMotion());
    if (this.resultWait.count(deltaMs, waitMs)) this.resultOpenState.set(true);
  }

  /**
   * Returns the board to draw, as the run now stands: one object, written
   * again each call, so drawing a frame allocates nothing.
   */
  frame(): SnakeFrame {
    const glides = this.settings.settings().movement === "glide";
    this.shown.run = this.runState();
    this.shown.progress = glides ? this.progress : 0;
    this.shown.newBest = this.newBestState();
    return this.shown;
  }

  /** Does what a key or a swipe on the board asks. */
  override command(command: BoardCommand): void {
    switch (command) {
      case "pause":
      case "toggle":
      case "go":
        super.command(command);
        break;
      default:
        this.turn(command);
    }
  }

  /**
   * Turns the snake, or queues the turn, and starts a run waiting for its
   * first direction, or one paused, at a direction it can take, once the
   * board is drawn.
   */
  turn(direction: Direction): void {
    const before = this.runState();
    if (before.outcome !== "playing" && !this.drawn()) return;
    const after = turn(before, direction);
    if (after === before) return;
    this.runState.set(after);
    if (before.outcome === "ready") {
      this.stats.recordStart(after.speed);
      this.announcer.say(describeStart(after));
    } else if (before.outcome === "paused") {
      this.announcer.say(describeResume());
    }
  }

  /** Pauses the run under way, and says so. */
  pause(): void {
    const before = this.runState();
    const after = pause(before);
    if (after === before) return;
    this.runState.set(after);
    this.announcer.say(describePause(after));
  }

  /** Goes on with a paused run, once the board is drawn, and says so. */
  resume(): void {
    if (!this.drawn()) return;
    const before = this.runState();
    const after = resume(before);
    if (after === before) return;
    this.runState.set(after);
    this.announcer.say(describeResume());
  }

  /**
   * Starts a new run at the speed in the settings, asking first if one is
   * under way, and resolves to whether it did.
   */
  async newGame(): Promise<boolean> {
    if (!(await this.mayLoseRun())) return false;
    this.begin(this.create(this.settings.settings().speed));
    return true;
  }

  /**
   * Starts a run at another speed, and keeps it in the settings, asking
   * first if one is under way, and resolves to whether it did.
   */
  async changeSpeed(speed: Speed): Promise<boolean> {
    const question = speedQuestion(SPEED_INFO[speed].name);
    if (!(await this.mayLoseRun(question))) return false;
    this.settings.update({ speed });
    this.begin(this.create(speed));
    return true;
  }

  /** Takes up a run where it was left, paused, as one saved before a reload. */
  takeUp(run: Run): void {
    this.numbers.takeUp(run.id);
    this.begin(pause(run));
    this.announcer.say(describeTakenUp(run));
  }

  /** Puts away the card over an ended run, leaving the board to look at. */
  closeResult(): void {
    this.resultOpenState.set(false);
    this.resultClosedState.set(true);
  }

  /** Returns a new run at a speed, waiting for its first direction. */
  private create(speed: Speed): Run {
    return createRun({ ...this.numbers.next(), speed });
  }

  private begin(run: Run): void {
    this.runState.set(run);
    this.carried = 0;
    this.progress = 0;
    this.resultWait.stop();
    this.newBestState.set(false);
    this.resultOpenState.set(false);
    this.resultClosedState.set(false);
    this.began();
  }

  /** Takes a step's run, and keeps the score of one that ended there. */
  private stepTo(run: Run): void {
    if (!hasEnded(run.outcome)) {
      this.runState.set(run);
      return;
    }
    const newBest = this.stats.recordEnd(
      run.speed,
      run.eaten,
      run.snake.length,
    );
    this.newBestState.set(newBest);
    this.runState.set(run);
    this.progress = 0;
    this.resultWait.start();
    this.announcer.say(describeEnd(run, newBest));
  }
}
