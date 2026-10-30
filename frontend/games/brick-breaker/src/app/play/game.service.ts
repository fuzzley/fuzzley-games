import {
  Injectable,
  type WritableSignal,
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
  describeFewLeft,
  describeLevel,
  describeLives,
  describePause,
  describeResume,
  describeTakenUp,
} from "../../rules/describe";
import type { FieldEvent } from "../../rules/events";
import {
  type Field,
  createField,
  launch as launchBalls,
  serve,
  steerField,
  stepField,
} from "../../rules/field";
import { type LevelEntry, parseLevel } from "../../rules/levels";
import type { Steer } from "../../rules/paddle";
import {
  type Run,
  catchUp,
  createRun,
  gainedLifeByPoints,
  hasEnded,
  levelSeed,
  pause,
  resume,
  startLevel,
} from "../../rules/run";
import {
  type LevelTally,
  multiplier,
  pointsOf,
  tallyOf,
} from "../../rules/scoring";
import {
  type SavedGame,
  type TakenUp,
  saveGame,
  takeUpField,
} from "../../rules/saved_game";
import { SPEED_INFO, type Speed } from "../../rules/speed";
import { advanceClock, createClock, progressOf } from "../../rules/stepper";
import type { FieldCommand } from "../../view/controls";
import type { EventsView, FieldFrame, FieldView } from "../../view/frame";
import { SERVE_MS, clearedDelayMs, resultDelayMs } from "../../view/timing";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_LEVELS, GAME_RANDOM } from "../tokens";

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
 * asks, says what happened, and keeps the records and the levels cleared.
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
  private readonly settings = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly progress = inject(ProgressService);

  /** The id the last run took, which the next one follows. */
  private lastId = 0;
  private readonly runState = signal<Run>(
    this.create(this.settings.settings().speed, 1),
  );
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
  /** The time the paddle has stood empty since the last ball was lost. */
  private sinceLost = 0;
  /** The time since the level was cleared or the run ended, while its card waits to open, or null. */
  private sinceDone: number | null = null;
  /** What a frame calls to be said, gathered as it is worked out, and said at its end. */
  private readonly news: string[] = [];

  private readonly servingState = signal(true);
  private readonly multiplierState = signal(1);
  private readonly clearedOpenState = signal(false);
  private readonly tallyState = signal<LevelTally | null>(null);
  private readonly resultOpenState = signal(false);
  private readonly resultClosedState = signal(false);
  private readonly runsState = signal(0);
  private readonly drawnState = signal(true);
  private readonly newBestState = signal(false);
  private readonly chimesState = signal(0);

  /** The run on the board. */
  readonly run = this.runState.asReadonly();

  /** The level in play, or the last one cleared. */
  readonly level = computed(() => this.levelEntry(this.runState().level));

  /** The run's speed, which changes only as a new run begins. */
  readonly speed = computed(() => this.runState().speed);

  /** The run's points so far. */
  readonly score = computed(() => this.runState().score);

  /** The lives the run has left. */
  readonly lives = computed(() => this.runState().lives);

  /** The best score at the run's speed, as of the last run that ended. */
  readonly best = computed(() => this.stats.stats().speeds[this.speed()].best);

  /** Whether the run just ended set a new best score at its speed. */
  readonly newBest = this.newBestState.asReadonly();

  /**
   * How many times the game has called for the chime since the page
   * loaded: for a life a run's points brought, and for a new best as its
   * card opens.
   */
  readonly chimes = this.chimesState.asReadonly();

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

  /** How the last level cleared added up, for its card, or null until a level of this run is cleared. */
  readonly tally = this.tallyState.asReadonly();

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
   * the run; or, with the level cleared or the run ended, opens the card it
   * waits for once its time has run. A paused level stays as it is.
   */
  tick(deltaMs: number, steer: Readonly<Steer>): void {
    switch (this.runState().outcome) {
      case "ready":
      case "playing":
        this.play(deltaMs, steer);
        break;
      case "cleared":
        this.openAfter(deltaMs, clearedDelayMs, this.clearedOpenState);
        break;
      case "over":
      case "won":
        if (
          this.openAfter(deltaMs, resultDelayMs, this.resultOpenState) &&
          this.newBestState()
        ) {
          this.chime();
        }
        break;
      case "paused":
        break;
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
        this.stats.recordStart(this.runState().speed);
        this.runState.update(startLevel);
        this.announcer.say(describeLevel(this.level(), this.field.needed));
      }
      launchBalls(this.field);
      fireBolts(this.field);
      this.servingState.set(this.field.state === "serve");
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
    this.showField(after);
    this.runState.set(after);
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
   * Starts a run at another speed, and keeps it in the settings, asking
   * first if one is under way, and resolves to whether it did.
   */
  async changeSpeed(speed: Speed): Promise<boolean> {
    if (!(await this.mayLoseRun(speedQuestion(speed)))) return false;
    this.settings.update({ speed });
    this.begin(this.create(speed, this.runState().firstLevel));
    return true;
  }

  /** Starts a new run at the level an ended run reached, as its card offers. */
  tryAgain(): void {
    const run = this.runState();
    if (hasEnded(run)) this.begin(this.create(run.speed, run.level));
  }

  /**
   * Returns the run under way and its level's field as storage keeps them,
   * or null for a run with nothing to keep.
   */
  saved(): SavedGame | null {
    return saveGame(this.runState(), this.field, this.levels);
  }

  /**
   * Takes up a run where storage kept it, paused, with its bricks as they
   * were and the ball on the paddle, and says so.
   */
  takeUp({ run, field }: TakenUp): void {
    this.lastId = Math.max(this.lastId, run.id);
    this.begin(run);
    takeUpField(this.field, field, run);
    this.announcer.say(describeTakenUp(run, this.level()));
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
   * Steps the field by a frame's time, hears what happened and takes it
   * into the run, then, with the level still in play, serves again once a
   * lost ball's beat has run.
   */
  private play(deltaMs: number, steer: Readonly<Steer>): void {
    const field = this.field;
    const needed = field.needed;
    steerField(field, steer);
    const steps = advanceClock(this.clock, deltaMs);
    for (let i = 0; i < steps; i++) stepField(field);
    this.shown.alpha = progressOf(this.clock);
    field.events.forEachSince(this.heard, this.hear);
    this.heard = field.events.latest;
    const fewLeft = describeFewLeft(needed, field.needed);
    if (fewLeft !== null) this.news.push(fewLeft);
    this.takeIn(catchUp(this.runState(), field));
    if (this.runState().outcome === "playing") this.serveAfterLoss(deltaMs);
    this.servingState.set(field.state === "serve");
    this.multiplierState.set(multiplier(field.streak));
  }

  /** Puts the next ball on the paddle once the last one lost has had its beat. */
  private serveAfterLoss(deltaMs: number): void {
    if (this.field.state !== "lost") return;
    this.sinceLost += deltaMs;
    if (this.sinceLost < SERVE_MS) return;
    serve(this.field);
    this.sinceLost = 0;
  }

  /**
   * Hears an event of the field: a capsule caught is said by its name, but
   * an extra life, which `describeLives()` says as the run takes it. Made
   * once, so hearing makes nothing.
   */
  private readonly hear = (event: Readonly<FieldEvent>): void => {
    if (event.kind !== "caught" || event.capsule === null) return;
    if (capsule(event.capsule).effect.kind === "life") return;
    this.news.push(describeCaught(event.capsule));
  };

  /**
   * Takes the run the field brought it to, keeps the records, and gathers
   * what to say of the change: the end of a run lost, rather than
   * its last ball; else the lives gained and lost, then a clearing or a win.
   */
  private takeIn(after: Run): void {
    const before = this.runState();
    if (after === before) return;
    this.runState.set(after);
    if (after.outcome === "over") {
      this.end(after);
      return;
    }
    if (gainedLifeByPoints(before, after)) this.chime();
    const lives = describeLives(before, after);
    if (lives !== null) this.news.push(lives);
    if (after.outcome === "cleared") {
      this.sinceDone = 0;
      const tally = tallyOf(this.field);
      this.tallyState.set(tally);
      this.keepCleared(after, tally);
      this.news.push(describeCleared(after));
    } else if (after.outcome === "won") {
      this.keepCleared(after, tallyOf(this.field));
      this.end(after);
    }
  }

  /** Keeps a level cleared, which opens the next, and its points if they are its best. */
  private keepCleared(run: Run, tally: LevelTally): void {
    const id = this.level().data.id;
    this.progress.recordCleared(id);
    this.stats.recordLevel(id, run.speed, pointsOf(tally));
  }

  /** Keeps an ended run's score and reach, and says how it ended. */
  private end(run: Run): void {
    this.sinceDone = 0;
    const newBest = this.stats.recordEnd(run);
    this.newBestState.set(newBest);
    this.news.push(describeEnd(run, newBest));
  }

  /** Calls for the chime, which the scene plays. */
  private chime(): void {
    this.chimesState.update((chimes) => chimes + 1);
  }

  /**
   * Opens a card once its wait, with motion or without, has run since the
   * level was cleared or the run ended, and returns whether it opened now.
   */
  private openAfter(
    deltaMs: number,
    delayMs: (motion: boolean) => number,
    card: WritableSignal<boolean>,
  ): boolean {
    if (this.sinceDone === null) return false;
    this.sinceDone += deltaMs;
    if (this.sinceDone < delayMs(this.viewport.allowsMotion())) return false;
    card.set(true);
    this.sinceDone = null;
    return true;
  }

  /** Says what the frame gathered, all at once. */
  private sayNews(): void {
    if (this.news.length === 0) return;
    this.announcer.say(this.news.join(" "));
    this.news.length = 0;
  }

  /** Returns whether a key may start another run: once an ended run's card is away. */
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

  /** Puts a new run on the board, at its first level, laid out before the run is. */
  private begin(run: Run): void {
    this.showField(run);
    this.runState.set(run);
    this.tallyState.set(null);
    this.newBestState.set(false);
    this.resultOpenState.set(false);
    this.resultClosedState.set(false);
    this.runsState.update((runs) => runs + 1);
    this.announcer.clear();
  }

  /** Lays out the run's level in play on a new field, with nothing of the last one left. */
  private showField(run: Run): void {
    this.field = this.fieldOf(run);
    this.shown.field = this.field;
    this.shown.events = this.field.events;
    this.shown.alpha = 0;
    this.clock.carried = 0;
    this.heard = 0;
    this.sinceLost = 0;
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
