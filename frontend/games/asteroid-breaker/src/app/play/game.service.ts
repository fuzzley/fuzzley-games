import {
  Injectable,
  type WritableSignal,
  computed,
  inject,
  signal,
} from "@angular/core";
import { randomSeed } from "@fz/core/random";
import { GameViewportService } from "@fz/game-ui/viewport";
import type { Viewport } from "@fz/phaser/layout";
import { AnnouncerService } from "@fz/ui/announcer";
import { type ConfirmRequest, ConfirmService } from "@fz/ui/confirm";
import {
  describeCleared,
  describeEnd,
  describeEvent,
  describePause,
  describeResume,
  describeWave,
} from "../../rules/describe";
import type { FieldEvent } from "../../rules/events";
import { type Field, fieldFor, reshapeField } from "../../rules/field";
import type { Pilot } from "../../rules/pilots";
import { rocksLeft } from "../../rules/rocks";
import {
  type Run,
  catchUp,
  createRun,
  hasEnded,
  isInProgress,
  pause,
  resume,
  startWave,
  waveStart,
} from "../../rules/run";
import { type WaveTally, chainMultiplier, tallyOf } from "../../rules/scoring";
import { STILL, type Steer } from "../../rules/ship";
import { SPEED_INFO, type Speed } from "../../rules/speed";
import type { EndedRun } from "../../rules/stats";
import type { Torus } from "../../rules/torus";
import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import { type WaveEntry, parseWave } from "../../rules/waves";
import type { FieldCommand } from "../../view/controls";
import {
  TUNED,
  type Tuning,
  fieldTuning,
  isRetuned,
  tuneField,
} from "../../view/debug_tuning";
import { type BoardSetting, fieldShape } from "../../view/field_metrics";
import type { FieldFrame } from "../../view/frame";
import { clearedDelayMs, resultDelayMs } from "../../view/timing";
import { WavePlay } from "../../view/wave_play";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_RANDOM, GAME_WAVES } from "../tokens";

/** What a new run asks before it throws away the one under way. */
const NEW_GAME_QUESTION: ConfirmRequest = {
  title: "Start a new game?",
  message: "The run in progress will be lost.",
  confirmLabel: "New game",
  tone: "danger",
};

/** What a run at another speed asks: New game's question, naming the speed. */
function speedQuestion(speed: Speed): ConfirmRequest {
  return {
    ...NEW_GAME_QUESTION,
    title: `Start a new ${SPEED_INFO[speed].name} game?`,
  };
}

/** The field's shape before the board says what room it has: a square of the short side. */
const FIRST_TORUS: Torus = {
  width: FIELD_SHORT_SIDE,
  height: FIELD_SHORT_SIDE,
};

/**
 * Plays the game: holds the run and the wave in play's field, moves the
 * field on by the time the board's frames take, steered as the player
 * steers, pauses, goes on and starts waves and runs as the player asks,
 * shapes each field to the board's room, says what happened, and keeps the
 * records and the sectors reached, but for a run flown on numbers the debug
 * menu tuned.
 *
 * The run is a signal, which changes only when the field comes to
 * something the run takes: points, a ship, a stray, a clearing. The field
 * changes 120 times a second, so no signal holds it; the scene reads it
 * through {@link frame}, and what the shell shows of it is copied into
 * signals that change only when it does.
 */
@Injectable({ providedIn: "root" })
export class GameService {
  private readonly confirm = inject(ConfirmService);
  private readonly announcer = inject(AnnouncerService);
  private readonly viewport = inject(GameViewportService);
  private readonly random = inject(GAME_RANDOM);
  private readonly waves = inject(GAME_WAVES);
  private readonly stats = inject(StatsService);
  private readonly progress = inject(ProgressService);
  private readonly settings = inject(SettingsService);

  /** The id the last run took, which the next one follows. */
  private lastId = 0;
  /** The field's shape for the board's room, which a wave takes as it starts. */
  private torus = FIRST_TORUS;
  /** What the player held as the last frame was handed over, which a new wave's ship takes as held. */
  private readonly held: Steer = { ...STILL };
  private readonly tuningState = signal(TUNED);
  private readonly runState = signal<Run>(
    this.create(this.settings.settings().speed, 1),
  );
  /** The wave in play: its field, stepped in place, and the beat before a card. */
  private wavePlay = this.playOf(this.runState());
  /** What a frame calls to be said, gathered as it is worked out, and said at its end. */
  private readonly news: string[] = [];
  /** The pilots of the strays the frame brought home, gathered as it is heard. */
  private readonly cameHome: Pilot[] = [];
  /** Whether the numbers in use are off `tuning.ts`'s, as the debug menu tuned them. */
  private retuned = false;
  /**
   * Whether the run in play has been flown on numbers the debug menu tuned,
   * its field stepped with them, which keeps no records: the player's own,
   * set at a feel of their own.
   */
  private retunedRun = false;

  private readonly waitingState = signal(true);
  private readonly clearedOpenState = signal(false);
  private readonly tallyState = signal<WaveTally | null>(null);
  private readonly chainState = signal(1);
  private readonly newBestState = signal(false);
  private readonly broughtHomeState = signal<readonly Pilot[]>([]);
  private readonly resultOpenState = signal(false);
  private readonly resultClosedState = signal(false);
  private readonly runsState = signal(0);
  private readonly drawnState = signal(true);

  /** The run on the board. */
  readonly run = this.runState.asReadonly();

  /** The number of the wave in play, or the last one cleared, so the wave's entry changes only with it. */
  private readonly waveNumber = computed(() => this.runState().wave);

  /** The wave in play, or the last one cleared. */
  readonly wave = computed(() => this.waveEntry(this.waveNumber()));

  /** The run's speed, which changes only as a new run begins. */
  readonly speed = computed(() => this.runState().speed);

  /** The run's points so far. */
  readonly score = computed(() => this.runState().score);

  /** Who flies the run's ships and who waits at home, as the field last left them. */
  readonly crew = computed(() => this.runState().crew);

  /** How many ships the run has, the one in play among them, as the field last left the crew. */
  readonly ships = computed(() => this.crew().flying.length);

  /**
   * How many times a break scores, by the chain the wave in play counts: 1
   * once the chain's time is up, and whenever no wave is in play.
   */
  readonly chain = this.chainState.asReadonly();

  /** The best score at the run's speed, as of the last run that ended. */
  readonly best = computed(() => this.stats.stats().speeds[this.speed()].best);

  /** Whether the run just ended set a new best score at its speed. */
  readonly newBest = this.newBestState.asReadonly();

  /** The pilots of the strays the run has brought home, in the order they came, for the result card. */
  readonly broughtHome = this.broughtHomeState.asReadonly();

  /** The sector the run started in, which trying again starts at. */
  readonly firstSector = computed(
    () => this.waveEntry(this.runState().firstWave).sector,
  );

  /** Where the run stands. */
  readonly outcome = computed(() => this.runState().outcome);

  /** Whether the run has ended, its ships run out. */
  readonly ended = computed(() => hasEnded(this.runState()));

  /** Whether a run is in progress, which a new game would lose: a wave under way, paused or just cleared. */
  readonly inProgress = computed(() => isInProgress(this.runState()));

  /** Whether the wave in play waits for the player's first move, for the card that says how. */
  readonly waiting = this.waitingState.asReadonly();

  /** Whether the card over a cleared wave is showing, which opens once its last shards have flown. */
  readonly clearedOpen = this.clearedOpenState.asReadonly();

  /** How the last wave cleared added up, for its card, or null until a wave of this run is cleared. */
  readonly tally = this.tallyState.asReadonly();

  /** Whether the card over an ended run is showing, which opens once the last ship's burst has faded. */
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
   * Whether the board is drawn, so the player can watch the field. Until it
   * is, nothing goes on: the board, in its scene, is what moves the field
   * on.
   */
  readonly drawn = this.drawnState.asReadonly();

  /**
   * The numbers that set the feel, as the debug menu tunes them, which the
   * field in play and every one after take: `tuning.ts`'s until it does.
   */
  readonly tuning = this.tuningState.asReadonly();

  /**
   * Moves the field on by the time a frame took, steered as the player
   * steers it, starting the run's first wave at the player's first move,
   * and takes what it came to into the run; or, with the wave cleared or
   * the run ended, opens the card it waits for once its time has run. A
   * paused wave stays as it is.
   */
  tick(deltaMs: number, steer: Readonly<Steer>): void {
    Object.assign(this.held, steer);
    switch (this.runState().outcome) {
      case "ready":
      case "playing":
        this.playOn(deltaMs, steer);
        break;
      case "cleared":
        this.openAfter(deltaMs, clearedDelayMs, this.clearedOpenState);
        break;
      case "over":
        this.openAfter(deltaMs, resultDelayMs, this.resultOpenState);
        break;
      case "paused":
        break;
    }
    this.sayNews();
  }

  /**
   * Returns the field to draw, as the game now stands: one record for each
   * wave, written again as the field moves on, so drawing a frame
   * allocates nothing.
   */
  frame(): FieldFrame {
    return this.wavePlay.frame();
  }

  /** Does what a key, a click or a tap on the board asks. */
  command(command: FieldCommand): void {
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

  /** Pauses the wave in play, stretched to the board's room if that changed in play, and says so. */
  pause(): void {
    const before = this.runState();
    const after = pause(before);
    if (after === before) return;
    reshapeField(this.wavePlay.field, this.torus);
    this.runState.set(after);
    this.announcer.say(describePause(after));
  }

  /** Goes on with a paused wave, once the board is drawn, and says so. */
  resume(): void {
    if (!this.drawnState()) return;
    const before = this.runState();
    const after = resume(before);
    if (after === before) return;
    this.runState.set(after);
    this.announcer.say(describeResume());
  }

  /**
   * Pauses the wave in play, or goes on with one paused, or starts another
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
   * Goes on with a paused wave, or to the next, or starts another run once
   * an ended one's card is put away, as a flight key, Enter or the card
   * over the board asks.
   */
  go(): void {
    if (this.mayStartAnother()) {
      void this.newGame();
    } else if (this.runState().outcome === "cleared") {
      this.nextWave();
    } else {
      this.resume();
    }
  }

  /**
   * Goes on to the wave after the one just cleared, once its card is
   * showing and the board is drawn, laid out on the board's room, and says
   * which it is.
   */
  nextWave(): void {
    const before = this.runState();
    if (
      before.outcome !== "cleared" ||
      !this.clearedOpenState() ||
      !this.drawnState()
    ) {
      return;
    }
    const after = startWave(before);
    this.showField(after);
    this.runState.set(after);
    this.reachWave();
    this.sayWave();
    this.sayNews();
  }

  /**
   * Starts a new run at the wave the last one started at, asking first if
   * one is under way, and resolves to whether it did.
   */
  async newGame(): Promise<boolean> {
    return this.startAt(this.runState().firstWave);
  }

  /**
   * Starts a new run at a wave, asking first if one is under way, and
   * resolves to whether it did.
   */
  async startAt(wave: number): Promise<boolean> {
    if (!(await this.mayLoseRun())) return false;
    this.begin(this.create(this.runState().speed, wave));
    return true;
  }

  /**
   * Starts a new run at a speed, at the wave the last one started at, and
   * keeps the speed in the settings, asking first if a run is under way, and
   * resolves to whether it did.
   */
  async changeSpeed(speed: Speed): Promise<boolean> {
    if (!(await this.mayLoseRun(speedQuestion(speed)))) return false;
    this.settings.update({ speed });
    this.begin(this.create(speed, this.runState().firstWave));
    return true;
  }

  /** Starts a new run at the wave an ended run started at, as its card offers. */
  tryAgain(): void {
    const run = this.runState();
    if (hasEnded(run)) this.begin(this.create(run.speed, run.firstWave));
  }

  /**
   * Takes the room the board lays the field out in, which the next wave is
   * shaped for. A wave waiting for its first move is laid out again at
   * once, a paused one stretched to it, and one in play stretched as it
   * pauses; a room that keeps the field's shape changes nothing.
   */
  setRoom(viewport: Viewport, board: BoardSetting): void {
    const torus = fieldShape(viewport, board, this.torus);
    const { width, height } = this.torus;
    if (torus.width === width && torus.height === height) return;
    this.torus = torus;
    const run = this.runState();
    if (this.waitingState()) {
      this.showField(run);
    } else if (run.outcome === "paused") {
      reshapeField(this.wavePlay.field, torus);
    }
  }

  /**
   * Tunes some of the numbers that set the feel, as the debug menu does. A
   * wave waiting for its first move is laid out again with them, as the
   * rocks' speed bears on a fair start, and one under way takes them at
   * once.
   */
  tune(change: Partial<Tuning>): void {
    this.tuningState.update((tuning) => ({ ...tuning, ...change }));
    this.retuned = isRetuned(this.tuningState());
    if (this.waitingState()) {
      this.showField(this.runState());
    } else {
      tuneField(this.wavePlay.field, this.tuningState());
    }
  }

  /** Puts the numbers that set the feel back to `tuning.ts`'s. */
  resetTuning(): void {
    this.tune(TUNED);
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
   * Steps the field by a frame's time, starts the run's first wave at the
   * first move, hears what happened, takes it into the run, and shows the
   * chain the wave in play counts.
   */
  private playOn(deltaMs: number, steer: Readonly<Steer>): void {
    const field = this.wavePlay.field;
    this.wavePlay.advance(deltaMs, steer, this.hear);
    if (this.cameHome.length > 0) {
      const came = this.cameHome.splice(0);
      this.broughtHomeState.update((home) => [...home, ...came]);
    }
    const moved = field.steps > 0;
    if (moved && this.retuned) this.retunedRun = true;
    if (moved && this.runState().outcome === "ready") {
      this.runState.update(startWave);
      if (!this.retunedRun) this.stats.recordStart(this.runState().speed);
      this.reachWave();
      this.sayWave();
    }
    this.waitingState.set(!moved);
    this.takeIn(catchUp(this.runState(), field));
    this.chainState.set(
      this.runState().outcome === "playing" ? chainMultiplier(field) : 1,
    );
  }

  /** Hears an event of the field, and gathers what to say of it and the strays brought home. Made once, so hearing makes nothing. */
  private readonly hear = (event: Readonly<FieldEvent>): void => {
    if (event.kind === "home" && event.pilot !== null) {
      this.cameHome.push(event.pilot);
    }
    const said = describeEvent(event);
    if (said !== null) this.news.push(said);
  };

  /**
   * Takes the run the field brought it to, keeps the strays it brought home
   * and its end in the records, and gathers what to say of the change: its
   * end, or its clearing, which come once each, as no frame plays a field
   * past them.
   */
  private takeIn(after: Run): void {
    const before = this.runState();
    if (after === before) return;
    this.runState.set(after);
    if (!this.retunedRun) {
      this.stats.recordStrays(after.speed, after.strays - before.strays);
    }
    if (after.outcome === "over") {
      this.wavePlay.startCardWait();
      if (!this.retunedRun) {
        this.newBestState.set(this.stats.recordEnd(this.endOf(after)));
      }
      this.news.push(describeEnd(after, this.newBestState()));
    } else if (after.outcome === "cleared") {
      this.wavePlay.startCardWait();
      this.tallyState.set(tallyOf(this.wavePlay.field));
      this.news.push(describeCleared(after));
    }
  }

  /** Keeps the sector of the wave begun as reached, which a run may start at from then on. */
  private reachWave(): void {
    if (!this.retunedRun) this.progress.recordReached(this.wave().sector.id);
  }

  /** Returns what an ended run brings to the records, the sector it started at among it. */
  private endOf(run: Run): EndedRun {
    return {
      speed: run.speed,
      score: run.score,
      wave: run.wave,
      sector: this.waveEntry(run.firstWave).sector.id,
    };
  }

  /** Gathers what to say as a wave begins: which it is, and the rocks it holds. */
  private sayWave(): void {
    this.news.push(describeWave(this.wave(), rocksLeft(this.wavePlay.field)));
  }

  /**
   * Opens a card once its wait, with motion or without, has run since the
   * wave was cleared or the run ended.
   */
  private openAfter(
    deltaMs: number,
    delayMs: (motion: boolean) => number,
    card: WritableSignal<boolean>,
  ): void {
    const waitMs = delayMs(this.viewport.allowsMotion());
    if (this.wavePlay.countCardWait(deltaMs, waitMs)) card.set(true);
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

  /** Returns a new run at a speed, waiting at a wave for its first move. */
  private create(speed: Speed, wave: number): Run {
    return createRun({
      id: ++this.lastId,
      seed: randomSeed(this.random),
      speed,
      wave,
    });
  }

  /** Returns the play of a run's wave in play, its specks strewn from the run's seed. */
  private playOf(run: Run): WavePlay {
    return new WavePlay(this.fieldOf(run), run.seed);
  }

  /** Returns the field of a run's wave in play, laid out on the board's room and tuned as the debug menu says, its ship waiting for the first move. */
  private fieldOf(run: Run): Field {
    return fieldFor(parseWave(this.waveEntry(run.wave)), {
      ...waveStart(run),
      torus: this.torus,
      speed: run.speed,
      held: this.held,
      ...fieldTuning(this.tuningState()),
    });
  }

  /**
   * Returns a wave of the game by its number, from 1; past the last, the
   * last again, numbered on, so a run that clears it goes on.
   */
  private waveEntry(wave: number): WaveEntry {
    const last = this.waves.length;
    const entry = this.waves[Math.min(wave, last) - 1];
    if (!entry) throw new Error(`No wave ${String(wave)}.`);
    return wave > last ? { ...entry, number: wave } : entry;
  }

  /** Puts a new run on the board, at its first wave, laid out before the run is. */
  private begin(run: Run): void {
    this.showField(run);
    this.runState.set(run);
    this.tallyState.set(null);
    this.newBestState.set(false);
    this.broughtHomeState.set([]);
    this.retunedRun = false;
    this.resultOpenState.set(false);
    this.resultClosedState.set(false);
    this.runsState.update((runs) => runs + 1);
    this.announcer.clear();
  }

  /** Lays out the run's wave in play on a new field, with nothing of the last one left. */
  private showField(run: Run): void {
    this.wavePlay = this.playOf(run);
    this.waitingState.set(true);
    this.clearedOpenState.set(false);
    this.chainState.set(1);
  }

  /**
   * Resolves to whether to go ahead, asking a question first: at once with
   * no run under way to lose.
   */
  private async mayLoseRun(
    question: ConfirmRequest = NEW_GAME_QUESTION,
  ): Promise<boolean> {
    if (!this.inProgress()) return true;
    return this.confirm.ask(question);
  }
}
