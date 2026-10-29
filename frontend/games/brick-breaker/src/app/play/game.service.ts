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
import { fireBolts } from "../../rules/bolts";
import { capsule } from "../../rules/catalog/capsules";
import {
  describeCaught,
  describeCleared,
  describeEnd,
  describeExtraLife,
  describeFewLeft,
  describeLevel,
  describeLost,
  describePause,
  describeResume,
} from "../../rules/describe";
import type { FieldEvent } from "../../rules/events";
import {
  type Field,
  createField,
  launch,
  serve,
  steerField,
  stepField,
} from "../../rules/field";
import { LEVELS, type LevelEntry, parseLevel } from "../../rules/levels";
import type { Steer } from "../../rules/paddle";
import {
  type Run,
  catchUp,
  createRun,
  hasEnded,
  levelSeed,
  pause,
  resume,
  startLevel,
} from "../../rules/run";
import { multiplier } from "../../rules/scoring";
import { SPEED_INFO, type Speed } from "../../rules/speed";
import { advanceClock, createClock, progressOf } from "../../rules/stepper";
import type { FieldCommand } from "../../view/controls";
import type { EventsView, FieldFrame, FieldView } from "../../view/frame";
import { SERVE_MS, clearedDelayMs, resultDelayMs } from "../../view/timing";

/** Where new runs take their seeds from: `Math.random` but in specs. */
export const GAME_RANDOM = new InjectionToken<() => number>("GAME_RANDOM", {
  providedIn: "root",
  factory: () => Math.random,
});

/** The levels a run is played through, in order: the game's but in specs. */
export const GAME_LEVELS = new InjectionToken<readonly LevelEntry[]>(
  "GAME_LEVELS",
  { providedIn: "root", factory: () => LEVELS },
);

/** The speed the first run is played at. */
const FIRST_SPEED: Speed = "normal";

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

/** The frame the scene is handed, one record written again each frame. */
interface Frame extends FieldFrame {
  field: FieldView;
  alpha: number;
  events: EventsView;
}

/**
 * Plays the game: holds the run and the level in play's field, moves the
 * field on by the time the board's frames take, steered as the player
 * steers, launches, fires, pauses and starts levels and runs as the player
 * asks, and says what happened.
 *
 * The run is a signal, which changes only when the field comes to
 * something the run takes: points, a life, a clearing. The field changes
 * 120 times a second, so no signal holds it; the scene reads it through
 * {@link frame}, and what the shell shows of it is copied into signals
 * that change only when it does.
 */
@Injectable({ providedIn: "root" })
export class GameService {
  private readonly confirm = inject(ConfirmService);
  private readonly announcer = inject(AnnouncerService);
  private readonly viewport = inject(GameViewportService);
  private readonly random = inject(GAME_RANDOM);
  private readonly levels = inject(GAME_LEVELS);

  /** The id the last run took, which the next one follows. */
  private lastId = 0;
  private readonly runState = signal<Run>(this.create(FIRST_SPEED, 1));
  /** The level in play, stepped in place. */
  private field: Field = this.fieldOf(this.runState());
  private readonly clock = createClock();
  private readonly shown: Frame = {
    field: this.field,
    alpha: 0,
    events: this.field.events,
  };

  /** The serial of the last of the field's events heard. */
  private heard = 0;
  /** The time since the last ball was lost, while the next waits to be served, or null. */
  private sinceLost: number | null = null;
  /** The time since the level was cleared or the run ended, while its card waits to open, or null. */
  private sinceDone: number | null = null;
  /** What a frame calls to be said, gathered as it is worked out, and said at its end. */
  private readonly news: string[] = [];

  private readonly servingState = signal(true);
  private readonly multiplierState = signal(1);
  private readonly clearedOpenState = signal(false);
  private readonly resultOpenState = signal(false);
  private readonly resultClosedState = signal(false);
  private readonly runsState = signal(0);
  private readonly drawnState = signal(true);

  /** The run on the board. */
  readonly run = this.runState.asReadonly();

  /** The level in play, or the last one cleared. */
  readonly level = computed(() => this.levelEntry(this.runState().level));

  /** The run's points so far. */
  readonly score = computed(() => this.runState().score);

  /** The lives the run has left. */
  readonly lives = computed(() => this.runState().lives);

  /** Where the run stands. */
  readonly outcome = computed(() => this.runState().outcome);

  /** Whether the run has ended, lost or won. */
  readonly ended = computed(() => hasEnded(this.runState()));

  /** Whether a run is under way, which a new game would lose: a level in play, paused or just cleared. */
  readonly inProgress = computed(() => {
    const outcome = this.runState().outcome;
    return (
      outcome === "playing" || outcome === "paused" || outcome === "cleared"
    );
  });

  /** Whether a ball waits on the paddle to be served, for the card that says how. */
  readonly serving = this.servingState.asReadonly();

  /** How many times a hit now scores, by the streak, for the bar while it is more than one. */
  readonly multiplier = this.multiplierState.asReadonly();

  /** Whether the card over a cleared level is showing, which opens once its last shards have flown. */
  readonly clearedOpen = this.clearedOpenState.asReadonly();

  /** Whether the card over an ended run is showing, which opens once the last ball has faded. */
  readonly resultOpen = this.resultOpenState.asReadonly();

  /**
   * Whether the card over an ended run has been put away, leaving the board
   * to look at, from which another run starts at a key.
   */
  readonly resultClosed = this.resultClosedState.asReadonly();

  /**
   * How many runs have begun since the page loaded, each new game adding
   * one, for the board to take the focus after.
   */
  readonly runs = this.runsState.asReadonly();

  /**
   * Whether the board is drawn, so the player can watch the ball. Until it
   * is, nothing launches or goes on: the board, in its scene, is what moves
   * the field on, and a ball in play that nobody can see would be lost.
   */
  readonly drawn = this.drawnState.asReadonly();

  /**
   * Moves the field on by the time a frame took, as often as the time holds
   * a step, steered as the player steers it, and takes what it came to into
   * the run; or, with no level in play, opens the card a cleared level or an
   * ended run waits for once its time has run.
   */
  tick(deltaMs: number, steer: Readonly<Steer>): void {
    const outcome = this.runState().outcome;
    if (outcome === "ready" || outcome === "playing") {
      this.play(deltaMs, steer);
    } else {
      this.wait(deltaMs);
    }
    this.sayNews();
  }

  /**
   * Returns the field to draw, as the game now stands: one record, written
   * again as the game moves on, so drawing a frame allocates nothing.
   */
  frame(): FieldFrame {
    return this.shown;
  }

  /** Does what a key, a click or a tap on the board asks. */
  command(command: FieldCommand): void {
    switch (command) {
      case "launch":
        this.launch();
        return;
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

  /**
   * Serves the ball waiting on the paddle, starting a new run's first level
   * and saying which it is, lets go of the balls it caught, or fires its
   * laser, once the board is drawn; goes on with a paused run, or to the
   * next level; or starts another run once an ended one's card is put away.
   */
  launch(): void {
    const outcome = this.runState().outcome;
    if (outcome === "paused") {
      this.resume();
    } else if (outcome === "cleared") {
      this.nextLevel();
    } else if (this.mayStartAnother()) {
      void this.newGame();
    } else if (
      this.drawnState() &&
      (outcome === "ready" || outcome === "playing")
    ) {
      if (outcome === "ready") {
        this.runState.update(startLevel);
        this.announcer.say(describeLevel(this.level(), this.field.needed));
      }
      launch(this.field);
      fireBolts(this.field);
    }
  }

  /** Pauses the level in play, and says so. */
  pause(): void {
    const before = this.runState();
    const after = pause(before);
    if (after === before) return;
    this.runState.set(after);
    this.announcer.say(describePause(after));
  }

  /** Goes on with a paused level, once the board is drawn, and says so. */
  resume(): void {
    if (!this.drawnState()) return;
    const before = this.runState();
    const after = resume(before);
    if (after === before) return;
    this.runState.set(after);
    this.announcer.say(describeResume());
  }

  /**
   * Pauses the level in play, or goes on with one paused, or starts another
   * run once an ended one's card is put away.
   */
  toggle(): void {
    if (this.mayStartAnother()) {
      void this.newGame();
    } else if (this.runState().outcome === "paused") {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Goes on with a paused level, or to the next, or starts another run once
   * an ended one's card is put away, as the card over the board offers.
   */
  go(): void {
    if (this.mayStartAnother()) {
      void this.newGame();
    } else if (this.runState().outcome === "cleared") {
      this.nextLevel();
    } else {
      this.resume();
    }
  }

  /**
   * Goes on to the level after the one just cleared, once its card is
   * showing and the board is drawn, and says which it is.
   */
  nextLevel(): void {
    const before = this.runState();
    if (
      before.outcome !== "cleared" ||
      !this.clearedOpenState() ||
      !this.drawnState()
    ) {
      return;
    }
    const after = startLevel(before);
    this.runState.set(after);
    this.showField(after);
    this.announcer.say(describeLevel(this.level(), this.field.needed));
  }

  /**
   * Starts a new run at the level the last one started at, asking first if
   * one is under way, and resolves to whether it did.
   */
  async newGame(): Promise<boolean> {
    return this.startAt(this.runState().firstLevel);
  }

  /**
   * Starts a new run at a level, asking first if one is under way, and
   * resolves to whether it did.
   */
  async startAt(level: number): Promise<boolean> {
    if (!(await this.mayLoseRun())) return false;
    this.begin(this.create(this.runState().speed, level));
    return true;
  }

  /**
   * Starts a run at another speed, asking first if one is under way, and
   * resolves to whether it did.
   */
  async changeSpeed(speed: Speed): Promise<boolean> {
    if (!(await this.mayLoseRun(speedQuestion(speed)))) return false;
    this.begin(this.create(speed, this.runState().firstLevel));
    return true;
  }

  /** Starts a new run at the level an ended run reached, as its card offers. */
  tryAgain(): void {
    const run = this.runState();
    if (hasEnded(run)) this.begin(this.create(run.speed, run.level));
  }

  /** Says whether the board is drawn yet, as the board's canvas reports it. */
  setDrawn(drawn: boolean): void {
    this.drawnState.set(drawn);
  }

  /** Puts away the card over an ended run, leaving the board to look at. */
  closeResult(): void {
    this.resultOpenState.set(false);
    this.resultClosedState.set(true);
  }

  /**
   * Steps the field by a frame's time, serves again once a lost ball's beat
   * has run, hears what happened and takes it into the run.
   */
  private play(deltaMs: number, steer: Readonly<Steer>): void {
    const field = this.field;
    const needed = field.needed;
    steerField(field, steer);
    const steps = advanceClock(this.clock, deltaMs);
    for (let i = 0; i < steps; i++) stepField(field);
    this.shown.alpha = progressOf(this.clock);
    this.serveAfterLoss(deltaMs);
    field.events.forEachSince(this.heard, this.hear);
    this.heard = field.events.latest;
    const fewLeft = describeFewLeft(needed, field.needed);
    if (fewLeft !== null) this.news.push(fewLeft);
    this.servingState.set(field.state === "serve");
    this.multiplierState.set(multiplier(field.streak));
    this.takeIn(catchUp(this.runState(), field));
  }

  /** Puts the next ball on the paddle once the last one lost has had its beat. */
  private serveAfterLoss(deltaMs: number): void {
    if (this.field.state !== "lost") {
      this.sinceLost = null;
      return;
    }
    this.sinceLost = (this.sinceLost ?? 0) + deltaMs;
    if (this.sinceLost < SERVE_MS) return;
    serve(this.field);
    this.sinceLost = null;
  }

  /**
   * Hears an event of the field: a capsule caught is said by its name, but
   * an extra life, which is said as the run takes it. Made once, so hearing
   * makes nothing.
   */
  private readonly hear = (event: Readonly<FieldEvent>): void => {
    if (event.kind !== "caught" || event.capsule === null) return;
    if (capsule(event.capsule).effect.kind === "life") return;
    this.news.push(describeCaught(event.capsule));
  };

  /** Takes the run the field brought it to, and gathers what to say of the change. */
  private takeIn(after: Run): void {
    const before = this.runState();
    if (after === before) return;
    this.runState.set(after);
    if (after.lives > before.lives) this.news.push(describeExtraLife(after));
    if (after.outcome === "cleared") {
      this.sinceDone = 0;
      this.news.push(describeCleared(after));
    } else if (hasEnded(after)) {
      this.sinceDone = 0;
      this.news.push(describeEnd(after, false));
    } else if (after.lives < before.lives) {
      this.news.push(describeLost(after));
    }
  }

  /** Opens the card a cleared level or an ended run waits for, once its time has run. */
  private wait(deltaMs: number): void {
    if (this.sinceDone === null) return;
    this.sinceDone += deltaMs;
    const run = this.runState();
    const motion = this.viewport.allowsMotion();
    if (run.outcome === "cleared") {
      if (this.sinceDone < clearedDelayMs(motion)) return;
      this.clearedOpenState.set(true);
    } else {
      if (this.sinceDone < resultDelayMs(motion)) return;
      this.resultOpenState.set(true);
    }
    this.sinceDone = null;
  }

  /** Says what the frame gathered, all at once. */
  private sayNews(): void {
    if (this.news.length === 0) return;
    this.announcer.say(this.news.join(" "));
    this.news.length = 0;
  }

  /** Whether a key may start another run: once an ended run's card is away. */
  private mayStartAnother(): boolean {
    return this.ended() && this.resultClosedState();
  }

  /** Returns a new run at a speed, waiting at a level for its first serve. */
  private create(speed: Speed, level: number): Run {
    return createRun({
      id: ++this.lastId,
      seed: randomSeed(this.random),
      speed,
      lastLevel: this.levels.length,
      level,
    });
  }

  /** Returns the field of a run's level in play, its ball waiting on the paddle. */
  private fieldOf(run: Run): Field {
    return createField(parseLevel(this.levelEntry(run.level)), {
      speed: run.speed,
      seed: levelSeed(run),
    });
  }

  /** Returns a level of the game by its number, from 1. */
  private levelEntry(level: number): LevelEntry {
    const entry = this.levels[level - 1];
    if (!entry) throw new Error(`No level ${String(level)}.`);
    return entry;
  }

  /** Puts a new run on the board, at its first level. */
  private begin(run: Run): void {
    this.runState.set(run);
    this.resultOpenState.set(false);
    this.resultClosedState.set(false);
    this.runsState.update((runs) => runs + 1);
    this.announcer.clear();
    this.showField(run);
  }

  /** Lays out the run's level in play on a new field, with nothing of the last one left. */
  private showField(run: Run): void {
    this.field = this.fieldOf(run);
    this.shown.field = this.field;
    this.shown.events = this.field.events;
    this.shown.alpha = 0;
    this.clock.carried = 0;
    this.heard = 0;
    this.sinceLost = null;
    this.sinceDone = null;
    this.servingState.set(true);
    this.multiplierState.set(1);
    this.clearedOpenState.set(false);
  }

  /** Resolves to whether to go ahead: at once with no run under way to lose. */
  private async mayLoseRun(question = NEW_GAME_QUESTION): Promise<boolean> {
    if (!this.inProgress()) return true;
    return this.confirm.ask(question);
  }
}
