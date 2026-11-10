import {
  DestroyRef,
  Injectable,
  type WritableSignal,
  computed,
  inject,
  signal,
} from "@angular/core";
import { hasEnded } from "@fz/core/run";
import { RunNumbers } from "@fz/core/run_numbers";
import { GAME_RANDOM } from "@fz/game-ui/random";
import { RunLifecycle, speedQuestion } from "@fz/game-ui/run_lifecycle";
import { GameViewportService } from "@fz/game-ui/viewport";
import type { Viewport } from "@fz/phaser/layout";
import {
  type EndMarks,
  describePause,
  describeResume,
  describeTakenUp,
  describeWave,
} from "../../rules/run/describe";
import { waveToPlay } from "../../rules/waves/endless";
import {
  type Field,
  type PlayerSetup,
  fieldFor,
  reshapeField,
} from "../../rules/field/field";
import { rocksLeft } from "../../rules/rocks/rocks";
import {
  type Run,
  createRun,
  hasClearedAll,
  isInProgress,
  nextWave,
  pause,
  resume,
  waveStart,
} from "../../rules/run/run";
import {
  type SavedGame,
  type TakenUp,
  saveGame,
  takeUpField,
} from "../../rules/run/saved_game";
import { STILL, type Steer, thrustOf } from "../../rules/ship/ship";
import { SPEED_INFO, type Speed } from "../../rules/speed";
import { recordsOf } from "../../rules/run/stats";
import type { Torus } from "../../rules/torus";
import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import {
  type Wave,
  type WaveEntry,
  isEndless,
  opensEndless,
  waveEntryOf,
} from "../../rules/waves/waves";
import { fieldTuning, tuneField } from "../../view/debug_tuning";
import { type BoardSetting, fieldShape } from "../../view/field/field_metrics";
import { constellationAt } from "../../view/field/specks";
import type { FieldFrame } from "../../view/field/frame";
import { RunFrames } from "../../view/run_frames";
import { type RunState, newRunState, withFrame } from "../../view/run_state";
import { WavePlay } from "../../view/wave_play";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_WAVES, TUNING } from "../tokens";
import { HapticsService } from "./haptics.service";

/** The field's shape before the board says what room it has: a square of the short side. */
const FIRST_TORUS: Torus = {
  width: FIELD_SHORT_SIDE,
  height: FIELD_SHORT_SIDE,
};

/**
 * Plays the game: holds the run and the wave in play's field, moves the
 * field on by the time the board's frames take, steered as the player
 * steers, and takes what each frame came to into the run, pauses, goes on
 * and starts waves and runs as the player asks, shapes each field to the
 * board's room, says what happened, buzzes the phone as a ship is lost or a
 * wave cleared, and keeps the records and the sectors reached, but for a
 * run flown on numbers the debug menu tuned.
 *
 * The run and what is its own are one signal, replaced whole as each run
 * begins, which changes only when the field comes to something the run
 * takes: points, a ship, a stray, a clearing, a card. The field changes
 * 120 times a second, so no signal holds it; the scene reads it through
 * {@link frame}, and what the shell shows of it is copied into the run's
 * state only when it changes.
 */
@Injectable({ providedIn: "root" })
export class GameService extends RunLifecycle {
  private readonly viewport = inject(GameViewportService);
  private readonly numbers = new RunNumbers(inject(GAME_RANDOM));
  private readonly waves = inject(GAME_WAVES);
  private readonly stats = inject(StatsService);
  private readonly progress = inject(ProgressService);
  private readonly settings = inject(SettingsService);
  private readonly tuner = inject(TUNING);
  private readonly haptics = inject(HapticsService);

  /** The field's shape for the board's room, which a wave takes as it starts. */
  private torus = FIRST_TORUS;
  /**
   * What the player held as the last frame was handed over, which a new
   * wave's ship takes as held.
   */
  private readonly held: Steer = { ...STILL };
  /** What is the run on the board's own, replaced whole as each run begins. */
  private readonly runState: WritableSignal<RunState>;
  /** The wave in play: its field, stepped in place, and the beat before a card. */
  private wavePlay: WavePlay;
  /** What each frame of the wave in play comes to in the run, and what to say of it. */
  private readonly runFrames = new RunFrames(this.waves);

  /** The run on the board. */
  readonly run = computed(() => this.runState().run);

  /**
   * The number of the wave in play, or the last one cleared, so the wave's
   * entry changes only with it.
   */
  private readonly waveNumber = computed(() => this.run().wave);

  /** The wave in play, or the last one cleared. */
  readonly wave = computed(() => this.waveEntry(this.waveNumber()));

  /** The run's speed, which changes only as a new run begins. */
  readonly speed = computed(() => this.run().speed);

  /** The run's points so far. */
  readonly score = computed(() => this.run().score);

  /** Who flies the run's ships and who waits at home, as the field last left them. */
  readonly crew = computed(() => this.run().crew);

  /** How many ships the run has, the one in play among them, as the field last left the crew. */
  readonly ships = computed(() => this.crew().flying.length);

  /**
   * How many times a break scores, by the chain the wave in play counts: 1
   * once the chain's time is up, and whenever no wave is in play.
   */
  readonly chain = computed(() => this.runState().chain);

  /** The best score at the run's speed, as of the last run that ended. */
  readonly best = computed(() => this.stats.stats().speeds[this.speed()].best);

  /** Whether the run just ended set a new best score at its speed. */
  readonly newBest = computed(() => this.runState().newBest);

  /**
   * The pilots of the strays the run has brought home, in the order they
   * came, for the result card.
   */
  readonly broughtHome = computed(() => this.runState().broughtHome);

  /** The wave after the one in play, or the last one cleared, which the run goes on to. */
  private readonly waveAfter = computed(() =>
    this.waveEntry(this.waveNumber() + 1),
  );

  /**
   * Whether the wave in play, or the last one cleared, is the last
   * sector's last, after which Endless begins.
   */
  readonly beforeEndless = computed(() =>
    opensEndless(this.wave(), this.waveAfter()),
  );

  /**
   * Whether the run has cleared every written wave, from the first, as the
   * records keep it: never for a run flown on tuned numbers, as no new best
   * is.
   */
  readonly clearedAll = computed(() => this.runState().clearedAll);

  /** What the run's end set, which is said of it as it ends. */
  private readonly endMarks = computed((): EndMarks => ({
    newBest: this.newBest(),
    clearedAll: this.clearedAll(),
  }));

  /** The sector the run started in, which trying again starts at. */
  readonly firstSector = computed(
    () => this.waveEntry(this.run().firstWave).sector,
  );

  /** Where the run stands. */
  readonly outcome = computed(() => this.run().outcome);

  /** Whether the run has ended, its ships run out. */
  readonly ended = computed(() => hasEnded(this.run().outcome));

  /**
   * Whether a run is in progress, which a new game would lose: a wave under
   * way, paused or just cleared, or one waiting for its first move after a
   * wave cleared.
   */
  readonly inProgress = computed(() => isInProgress(this.run()));

  /**
   * Whether the card over a cleared wave is showing, which opens once its
   * last shards have flown.
   */
  readonly clearedOpen = computed(() => this.runState().clearedOpen);

  /**
   * How the last wave cleared added up, for its card, or null until a wave
   * of this run is cleared.
   */
  readonly tally = computed(() => this.runState().tally);

  /**
   * Whether the card over an ended run is showing, which opens once the
   * last ship's burst has faded.
   */
  readonly resultOpen = computed(() => this.runState().resultOpen);

  /**
   * Whether the card over an ended run has been put away, leaving the board
   * to look at, from which another run starts at a key.
   */
  readonly resultClosed = computed(() => this.runState().resultClosed);

  constructor() {
    super();
    // Made here, once every field above is, so no field's place among them
    // decides what the first run's field is laid out with.
    const run = this.create(this.settings.settings().speed, 1);
    this.wavePlay = this.playOf(run);
    this.runState = signal(newRunState(run));
    inject(DestroyRef).onDestroy(
      this.tuner.onTune(() => {
        this.retune();
      }),
    );
  }

  /**
   * Moves the field on by the time a frame took, steered as the player
   * steers it, starting the wave at the player's first move, takes what it
   * came to into the run and the records, buzzing the phone as it calls
   * for; or, with the wave cleared or the run ended, opens the card it waits
   * for once its time has run. A paused wave stays as it is.
   */
  tick(deltaMs: number, steer: Readonly<Steer>): void {
    Object.assign(this.held, steer);
    const before = this.runState();
    const change = this.runFrames.advance(
      this.wavePlay,
      before.run,
      deltaMs,
      steer,
      this.viewport.allowsMotion(),
    );
    let after = withFrame(before, change, this.tuner.retuned());
    if (change.run !== null) after = this.keep(before.run, after);
    if (after !== before) this.runState.set(after);
    if (change.buzz !== null) this.haptics.buzz(change.buzz);
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

  /**
   * Returns whether the ship in play thrusts while its wave plays on, as
   * the field last stepped, which the thrust's hum follows: not while the
   * wave waits, is paused or is over.
   */
  thrusting(): boolean {
    const { ship } = this.wavePlay.field;
    return this.outcome() === "playing" && ship !== null && thrustOf(ship) > 0;
  }

  /**
   * Pauses the wave in play, stretched to the board's room if that changed
   * in play, and says so.
   */
  pause(): void {
    const before = this.run();
    const after = pause(before);
    if (after === before) return;
    reshapeField(this.wavePlay.field, this.torus);
    this.setRun(after);
    this.announcer.say(describePause(after));
  }

  /**
   * Goes on with a paused wave, once the board is drawn, and says so: one
   * taken up before its first move waits for it again.
   */
  resume(): void {
    if (!this.drawn()) return;
    const before = this.run();
    const after = resume(before, this.wavePlay.field);
    if (after === before) return;
    this.setRun(after);
    this.announcer.say(describeResume());
  }

  /**
   * Goes on to the wave after the one just cleared, as a flight key, Enter
   * or a press on the field asks.
   */
  protected override nextStage(): void {
    this.nextWave();
  }

  /**
   * Goes on to the wave after the one just cleared, once its card is
   * showing and the board is drawn, laid out on the board's room to wait
   * for the first move, and says which it is.
   */
  nextWave(): void {
    const state = this.runState();
    const before = state.run;
    if (before.outcome !== "cleared" || !state.clearedOpen || !this.drawn()) {
      return;
    }
    const after = nextWave(before);
    this.wavePlay = this.playOf(after);
    const next: RunState = {
      ...state,
      run: after,
      chain: 1,
      clearedOpen: false,
    };
    this.runState.set(this.keep(before, next));
    const rocks = rocksLeft(this.wavePlay.field);
    this.announcer.say(describeWave(this.wave(), rocks));
  }

  /**
   * Starts a new run at the wave the last one started at, asking first if
   * one is under way, and resolves to whether it did.
   */
  async newGame(): Promise<boolean> {
    return this.startAt(this.run().firstWave);
  }

  /**
   * Starts a new run at a wave, asking first if one is under way, and
   * resolves to whether it did.
   */
  async startAt(wave: number): Promise<boolean> {
    if (!(await this.mayLoseRun())) return false;
    this.begin(newRunState(this.create(this.run().speed, wave)));
    return true;
  }

  /**
   * Starts a new run at a speed, at the wave the last one started at, and
   * keeps the speed in the settings, asking first if a run is under way, and
   * resolves to whether it did.
   */
  async changeSpeed(speed: Speed): Promise<boolean> {
    const question = speedQuestion(SPEED_INFO[speed].name);
    if (!(await this.mayLoseRun(question))) return false;
    this.settings.update({ speed });
    this.begin(newRunState(this.create(speed, this.run().firstWave)));
    return true;
  }

  /** Starts a new run at the wave an ended run started at, as its card offers. */
  tryAgain(): void {
    const run = this.run();
    if (hasEnded(run.outcome)) {
      this.begin(newRunState(this.create(run.speed, run.firstWave)));
    }
  }

  /**
   * Returns the run under way and its wave's field as storage keeps them,
   * or null for a run with nothing to keep.
   */
  saved(): SavedGame | null {
    const { run, broughtHome, tuned } = this.runState();
    return saveGame(run, this.wavePlay.field, this.waves, {
      broughtHome,
      tuned,
    });
  }

  /**
   * Takes up a run where storage kept it, paused, and says so: its field as
   * it was, fitted to the board's room, as a pause is, or a wave kept as not
   * yet begun laid out afresh, waiting for its first move.
   */
  takeUp({ run, field, broughtHome, tuned }: TakenUp): void {
    this.numbers.takeUp(run.id);
    const clearedAll = !tuned && hasClearedAll(run, this.waves.length);
    const state: RunState = {
      ...newRunState(run),
      tuned,
      broughtHome,
      clearedAll,
    };
    const taken = field
      ? takeUpField(this.waveOf(run), this.playerSetup(), field, run)
      : undefined;
    this.begin(this.keep(null, state), taken);
    if (taken) reshapeField(taken, this.torus);
    this.announcer.say(describeTakenUp(run, this.wave()));
  }

  /**
   * Takes the room the board lays the field out in, which the next wave is
   * shaped for. A wave yet to begin is laid out again at once, a paused one
   * stretched to it, and one in play stretched as it pauses; a room that
   * keeps the field's shape changes nothing.
   */
  setRoom(viewport: Viewport, board: BoardSetting): void {
    const torus = fieldShape(viewport, board, this.torus);
    const { width, height } = this.torus;
    if (torus.width === width && torus.height === height) return;
    this.torus = torus;
    const run = this.run();
    if (this.yetToBegin()) {
      this.wavePlay = this.playOf(run);
    } else if (run.outcome === "paused") {
      reshapeField(this.wavePlay.field, torus);
    }
  }

  /** Puts away the card over an ended run, leaving the board to look at. */
  closeResult(): void {
    this.runState.update((state) => ({
      ...state,
      resultOpen: false,
      resultClosed: true,
    }));
  }

  /**
   * Keeps what the change from the run before, or from none for a run taken
   * up, to a run's state brings to the records and the sectors reached, but
   * for a run flown on numbers the debug menu tuned, and returns the state
   * marked with whether the run cleared every written wave and whether its
   * end set a new best.
   */
  private keep(before: Run | null, state: RunState): RunState {
    if (state.tuned) return state;
    const records = recordsOf(before, state.run, this.waves);
    this.progress.record(records);
    const newBest = this.stats.record(records);
    return {
      ...state,
      clearedAll: state.clearedAll || records.clearedAll,
      newBest: records.ended === null ? state.newBest : newBest,
    };
  }

  /**
   * Has the wave in play take the numbers the debug menu tuned: one yet to
   * begin is laid out again with them, as the rocks' speed bears on a fair
   * start, and one under way takes them at once.
   */
  private retune(): void {
    if (this.yetToBegin()) {
      this.wavePlay = this.playOf(this.run());
    } else {
      tuneField(this.wavePlay.field, this.tuner.tuning());
    }
  }

  /** Puts the run on the board as it changed, keeping the rest of its state. */
  private setRun(run: Run): void {
    this.runState.update((state) => ({ ...state, run }));
  }

  /** Says what the frame gathered, all at once, a run's end with what it set. */
  private sayNews(): void {
    const news = this.runFrames.news(this.endMarks());
    if (news !== null) this.announcer.say(news);
  }

  /** Returns a new run at a speed, waiting at a wave for its first move. */
  private create(speed: Speed, wave: number): Run {
    return createRun({ ...this.numbers.next(), speed, wave });
  }

  /**
   * Returns the play of a run's wave in play, on its field as laid out, its
   * specks strewn from the run's seed and, in Endless, its constellation
   * laid among them.
   */
  private playOf(run: Run, field: Field = this.fieldOf(run)): WavePlay {
    const constellation = isEndless(this.waveEntry(run.wave))
      ? constellationAt(run.seed, run.wave)
      : null;
    return new WavePlay(field, run.seed, constellation);
  }

  /**
   * Returns the field of a run's wave in play, laid out on the board's room
   * and tuned as the debug menu says, its ship waiting for the first move.
   */
  private fieldOf(run: Run): Field {
    return fieldFor(this.waveOf(run), {
      ...waveStart(run),
      ...this.playerSetup(),
      torus: this.torus,
      speed: run.speed,
    });
  }

  /**
   * Returns how a wave's field is set up beyond what its wave, its run and
   * its size say: what the player holds, and the numbers the debug menu
   * tunes.
   */
  private playerSetup(): PlayerSetup {
    return { held: this.held, ...fieldTuning(this.tuner.tuning()) };
  }

  /**
   * Returns a wave of the game by its number, from 1; past the last, one of
   * Endless's, so a run that clears it goes on.
   */
  private waveEntry(wave: number): WaveEntry {
    return waveEntryOf(this.waves, wave);
  }

  /** Returns a run's wave in play, ready to play: an Endless one made from the run's seed. */
  private waveOf(run: Run): Wave {
    return waveToPlay(this.waveEntry(run.wave), run.seed);
  }

  /**
   * Puts a new run on the board, its state replaced whole, so nothing of the
   * last run's reaches it, at its wave laid out, or on a field kept for it,
   * before the run is.
   */
  private begin(state: RunState, field: Field = this.fieldOf(state.run)): void {
    this.wavePlay = this.playOf(state.run, field);
    this.runState.set(state);
    this.began();
  }

  /**
   * Returns whether the wave in play is yet to begin, its field not moved:
   * waiting for its first move, or taken up paused before it.
   */
  private yetToBegin(): boolean {
    return this.wavePlay.field.steps === 0;
  }
}
