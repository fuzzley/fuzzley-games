import {
  Injectable,
  InjectionToken,
  computed,
  inject,
  signal,
} from "@angular/core";
import { randomSeed } from "@fz/core/random";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerService } from "@fz/ui/announcer";
import { type ConfirmRequest, ConfirmService } from "@fz/ui/confirm";
import {
  describeEnd,
  describePause,
  describeResume,
  describeStart,
  describeTakenUp,
} from "../../rules/describe";
import type { Direction } from "../../rules/geometry";
import {
  type Run,
  createRun,
  hasEnded,
  pause,
  resume,
  turn,
} from "../../rules/run";
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

/** What a new run asks before it throws away the one under way. */
const NEW_GAME_QUESTION: ConfirmRequest = {
  title: "Start a new game?",
  message: "The run in progress will be lost.",
  confirmLabel: "New game",
  tone: "danger",
};

/** What a run at another speed asks: New Game's question, naming the speed. */
function speedQuestion(speed: Speed): ConfirmRequest {
  return {
    ...NEW_GAME_QUESTION,
    title: `Start a new ${SPEED_INFO[speed].name} game?`,
  };
}

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
export class GameService {
  private readonly settings = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly confirm = inject(ConfirmService);
  private readonly announcer = inject(AnnouncerService);
  private readonly viewport = inject(GameViewportService);
  private readonly random = inject(GAME_RANDOM);

  /** The id the last run took, which the next one follows. */
  private lastId = 0;
  private readonly runState = signal<Run>(
    this.create(this.settings.settings().speed),
  );
  private readonly newBestState = signal(false);
  private readonly resultOpenState = signal(false);
  private readonly runsState = signal(0);
  private readonly drawnState = signal(true);

  /** The time since the last step, toward the next, in milliseconds. */
  private carried = 0;
  /** How far the run is from its last step to its next, from 0 to 1. */
  private progress = 0;
  /** The time since the run ended, while the result card waits to open. */
  private sinceEnd: number | null = null;
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
   * How many runs have begun since the page loaded, each new game or run
   * taken up adding one, for the board to take the focus after.
   */
  readonly runs = this.runsState.asReadonly();

  /**
   * Whether the board is drawn, so the player can watch the snake move. Until
   * it is, nothing starts or goes on: the board, in its scene, is what moves
   * the run on, and a run under way that nobody can see would be lost.
   */
  readonly drawn = this.drawnState.asReadonly();

  /** The apples eaten this run. */
  readonly score = computed(() => this.runState().eaten);

  /** The best score at the run's speed. */
  readonly best = computed(
    () => this.stats.stats()[this.runState().speed].best,
  );

  /** Where the run stands. */
  readonly outcome = computed(() => this.runState().outcome);

  /** Whether the run has ended, by a crash or a full board. */
  readonly ended = computed(() => hasEnded(this.runState()));

  /** Whether a run is under way, which a new game would lose. */
  readonly inProgress = computed(() => {
    const outcome = this.runState().outcome;
    return outcome === "playing" || outcome === "paused";
  });

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
    if (this.sinceEnd === null) return;
    this.sinceEnd += deltaMs;
    if (this.sinceEnd >= resultDelayMs(this.viewport.allowsMotion())) {
      this.sinceEnd = null;
      this.resultOpenState.set(true);
    }
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
  command(command: BoardCommand): void {
    switch (command) {
      case "pause":
        this.pause();
        break;
      case "toggle":
        this.toggle();
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
    if (before.outcome !== "playing" && !this.drawnState()) return;
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
    if (!this.drawnState()) return;
    const before = this.runState();
    const after = resume(before);
    if (after === before) return;
    this.runState.set(after);
    this.announcer.say(describeResume());
  }

  /** Pauses the run under way, or goes on with one paused. */
  toggle(): void {
    if (this.runState().outcome === "paused") {
      this.resume();
    } else {
      this.pause();
    }
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
    if (!(await this.mayLoseRun(speedQuestion(speed)))) return false;
    this.settings.update({ speed });
    this.begin(this.create(speed));
    return true;
  }

  /** Takes up a run where it was left, paused, as one saved before a reload. */
  takeUp(run: Run): void {
    this.lastId = Math.max(this.lastId, run.id);
    this.begin(pause(run));
    this.announcer.say(describeTakenUp(run));
  }

  /** Says whether the board is drawn yet, as the board's canvas reports it. */
  setDrawn(drawn: boolean): void {
    this.drawnState.set(drawn);
  }

  /** Puts away the card over an ended run, leaving the board to look at. */
  closeResult(): void {
    this.resultOpenState.set(false);
  }

  /** Returns a new run at a speed, waiting for its first direction. */
  private create(speed: Speed): Run {
    return createRun({
      id: ++this.lastId,
      seed: randomSeed(this.random),
      speed,
    });
  }

  private begin(run: Run): void {
    this.runState.set(run);
    this.carried = 0;
    this.progress = 0;
    this.sinceEnd = null;
    this.newBestState.set(false);
    this.resultOpenState.set(false);
    this.runsState.update((runs) => runs + 1);
    this.announcer.clear();
  }

  /** Takes a step's run, and keeps the score of one that ended there. */
  private stepTo(run: Run): void {
    if (!hasEnded(run)) {
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
    this.sinceEnd = 0;
    this.announcer.say(describeEnd(run, newBest));
  }

  /** Resolves to whether to go ahead: at once with no run under way to lose. */
  private async mayLoseRun(question = NEW_GAME_QUESTION): Promise<boolean> {
    if (!this.inProgress()) return true;
    return this.confirm.ask(question);
  }
}
