import {
  Injectable,
  type Provider,
  type WritableSignal,
  computed,
  inject,
  signal,
} from "@angular/core";
import { type RunCommand, hasEnded } from "@fz/core/run";
import { RunNumbers } from "@fz/core/run_numbers";
import { GAME_RANDOM } from "@fz/game-ui/random";
import { RunLifecycle } from "@fz/game-ui/run_lifecycle";
import { GameViewportService } from "@fz/game-ui/viewport";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import { levelEntryOf } from "../../rules/levels/levels";
import type { RoundStart } from "../../rules/round/round";
import {
  describeCleared,
  describeEnd,
  describeLevel,
  describePause,
  describeResume,
  describeRound,
  describeRows,
  describeShot,
  describeTakenUp,
} from "../../rules/run/describe";
import {
  type Run,
  afterLanding,
  createRun,
  isInProgress,
  landRound,
  levelOf,
  nextLevel,
  openingOf,
  pause,
  resume,
  startLevel,
  takeDepth,
  takeRound,
} from "../../rules/run/run";
import type { TakenUp } from "../../rules/run/saved_game";
import { levelResultOf } from "../../rules/run/stats";
import type { Pictures } from "../../scene/pictures";
import type { Guide } from "../../scene/stand_ins";
import { FIELD_ROLES, wallPalette } from "../../view/colors/palette";
import {
  type FieldMetrics,
  type FieldShape,
  fieldShape,
  hasRoom,
} from "../../view/field/field_metrics";
import {
  FLIGHT_PACE,
  type PlayOptions,
  RoundPlay,
  type RoundView,
} from "../../view/round_play";
import {
  type RunState,
  newRunState,
  withFrame,
  withNewsSaid,
} from "../../view/run_state";
import type { FieldCommand } from "../../view/steering/controls";
import {
  BY_POINTER,
  type PointerAimings,
  type Steer,
} from "../../view/steering/steering";
import { waitingRows } from "../panels/panels";
import { type Aiming, SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_LEVELS, PLAY_ROUND } from "../tokens";
import { KEPT_GAME, type KeptGame } from "./saved_game.service";

/**
 * The field's shape before the board says what room it has: an upright
 * phone's, which the board's first measure replaces before the scene's
 * first layout.
 */
const FIRST_SHAPE: FieldShape = fieldShape({
  width: 390,
  height: 640,
  pixelRatio: 1,
  insets: NO_INSETS,
});

/** How each kind of pointer aims, by the settings' way of aiming. */
const POINTER_AIMINGS: Readonly<Record<Aiming, PointerAimings>> = {
  byPointer: BY_POINTER,
  pullBack: { mouse: "pullBack", finger: "pullBack" },
  pointAndHold: { mouse: "pointAndHold", finger: "pointAndHold" },
};

/** Describes how a frame plays the round, written again each frame. */
type FrameOptions = { -readonly [Key in keyof PlayOptions]: PlayOptions[Key] };

/**
 * Plays the game: holds the run and where its round stands, plays each
 * round released through the rules and back through the view a frame at a
 * time, takes what it comes to into the run, pauses, goes on and starts
 * levels and runs as the player asks, lays the field out on the board's
 * room between rounds, says what happened, and keeps the records and the
 * levels cleared, but for a run played on numbers the debug menu retuned.
 *
 * The run and what the shell shows beside the field are one signal,
 * replaced whole as each run begins, which changes only as the run or its
 * round does, never at a frame that changes neither. The round's view
 * changes every frame, so no signal holds it; the scene reads it through
 * {@link view}.
 */
@Injectable({ providedIn: "root" })
export class GameService extends RunLifecycle implements KeptGame {
  private readonly viewport = inject(GameViewportService);
  private readonly theme = inject(ThemeService);
  private readonly settingsService = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly progress = inject(ProgressService);
  private readonly levels = inject(GAME_LEVELS);
  private readonly playRound = inject(PLAY_ROUND);
  private readonly numbers = new RunNumbers(inject(GAME_RANDOM));
  private readonly roles = this.theme.roles(FIELD_ROLES);
  private readonly settings = this.settingsService.settings;

  /** The field's shape the board's room last gave, which the field takes between rounds. */
  private room = FIRST_SHAPE;
  private readonly shapeState = signal(FIRST_SHAPE);
  /** Whether the player asked for the flight in the air to play fast, from the bar. */
  private readonly fastAsked = signal(false);
  /** Whether fast-forward is held, as the last frame's steering said. */
  private readonly fastHeld = signal(false);
  private readonly metricsState = signal<FieldMetrics | null>(null);
  private readonly picturesState = signal<(() => Pictures) | null>(null);
  /** How the next frame plays the round, written again each frame. */
  private readonly frame: FrameOptions = {
    pace: FLIGHT_PACE,
    speed: "normal",
    fast: false,
    speedUp: true,
    motion: true,
    paused: false,
  };
  /** Plays every round back, level after level and run after run. */
  private readonly play: RoundPlay;
  /** The run on the board and what is its own, replaced whole as each run begins. */
  private readonly runState: WritableSignal<RunState>;

  /** The run on the board. */
  readonly run = computed(() => this.runState().run);

  /** Where the round aimed, or in play, started. */
  readonly start = computed(() => this.runState().start);

  /** The round in play, from its release until the next is aimed, or null. */
  readonly round = computed(() => this.runState().round);

  /** Where the round stands: aimed, its flight played back, or its wall settling. */
  readonly phase = computed(() => this.runState().phase);

  /** The card over the level's end once its wait has run out, or null. */
  readonly card = computed(() => this.runState().card);

  /**
   * Where the level's next round starts: the round in play's next while one
   * flies or settles, else the round aimed, so the saved game keeps a round
   * as it is released.
   */
  readonly nextStart = computed(() => this.round()?.next ?? this.start());

  /** Whether the run is played on numbers the debug menu retuned, so it keeps no records. */
  readonly tuned = computed(() => this.runState().tuned);

  /** Whether the run's end set a new best score. */
  readonly newBest = computed(() => this.runState().newBest);

  /** The best score of any run, as of the last that ended. */
  readonly best = computed(() => this.stats.stats().best);

  /** Where the run stands. */
  readonly outcome = computed(() => this.run().outcome);

  /** Whether the run has ended, a level lost or the last cleared. */
  readonly ended = computed(() => hasEnded(this.outcome()));

  /** Whether a run is in progress, which a new game would lose: a round played or a level cleared. */
  readonly inProgress = computed(() => isInProgress(this.run()));

  /** Whether the card over an ended run has been put away, leaving the board to look at. */
  readonly resultClosed = computed(() => this.runState().resultClosed);

  /** Whether the card over an ended run is showing. */
  readonly resultOpen = computed(
    () => this.card() === "result" && !this.resultClosed(),
  );

  /** Whether the card over a cleared level is showing. */
  readonly clearedOpen = computed(() => this.card() === "cleared");

  /** The number of the level in play, so what is read of the level changes only with it. */
  private readonly levelNumber = computed(() => this.run().level);

  /** The level in play, or the last one cleared. */
  readonly level = computed(() =>
    levelEntryOf(this.levels, this.levelNumber()),
  );

  /** The boon each jump of the level in play's wall earns the next shot. */
  readonly levelBoon = computed(
    () => levelOf({ level: this.levelNumber() }, this.levels).boon,
  );

  /** The rounds the level in play has played. */
  readonly rounds = computed(() => this.run().rounds);

  /** The level in play's par. */
  readonly par = computed(() => this.run().par);

  /** The run's points so far. */
  readonly score = computed(() => this.run().score);

  /** How many of the wall's rows wait over the ceiling, as the round aimed or in play started. */
  readonly rowsLeft = computed(() => {
    const { wall, depth } = this.start();
    return waitingRows(wall, depth).length;
  });

  /** Each friend's ink, in the order they were freed, as the round aimed or in play started. */
  readonly friends = computed(() => this.start().crew.friends);

  /** Whether a flight is under way, paused or not. */
  readonly flying = computed(() => this.phase() === "flying");

  /** Whether a flight in the air plays fast: asked for from the bar, or held on F. */
  readonly fast = computed(
    () => this.flying() && (this.fastAsked() || this.fastHeld()),
  );

  /** Whether the player wants sound. */
  readonly soundOn = computed(() => this.settings().sound);

  /** Whether the shot being aimed carries the boon a jump earned. */
  readonly lit = computed(
    () => this.phase() === "aiming" && this.start().boon !== null,
  );

  /** How each kind of pointer aims, as the settings say, for the steering. */
  readonly aimings = computed(() => POINTER_AIMINGS[this.settings().aiming]);

  /** The colors the field is drawn in, from the palette on the page, a new value as it changes. */
  readonly palette = computed(() =>
    wallPalette(this.roles(), this.theme.mode()),
  );

  /** The field's shape, which changes only between rounds. */
  readonly shape = this.shapeState.asReadonly();

  /** Where the field and its panels lie on the canvas, as the scene last laid them out, or null before it has. */
  readonly metrics = this.metricsState.asReadonly();

  /** What returns a picture of every kind of brick, as the scene last baked them, or null before it has. */
  readonly pictures = this.picturesState.asReadonly();

  constructor() {
    super();
    // Made here, once every field above is, so the first run is laid out
    // on the first shape.
    const run = this.create(1);
    const start = openingOf(run, levelOf(run, this.levels));
    this.play = new RoundPlay(start);
    this.runState = signal(newRunState(run, start, false));
  }

  /**
   * Moves the game on by the time a frame took, steered as the player
   * steers it: says the aim and the charge the keys moved, releases a shot
   * let fly, and plays the round on, taking what it came to into the run.
   */
  tick(deltaMs: number, steer: Readonly<Steer>): void {
    this.fastHeld.set(steer.fast);
    if (steer.keyed) this.announcer.say(describeShot(steer));
    if (steer.release) this.release(steer);
    this.playFrame(deltaMs, this.run().outcome === "paused");
  }

  /** Returns the round in play as the scene draws it at this moment: one record, written again each frame. */
  view(): RoundView {
    return this.play.view;
  }

  /** Returns the guide to draw: none until the rules cast one. */
  guide(): Guide | null {
    return null;
  }

  /** Returns where the player's fuzzball waits on the floor, or null while it is in the air. */
  waitingX(): number | null {
    return this.play.waitingX;
  }

  /** Returns whether the player welcomes motion. */
  motion(): boolean {
    return this.viewport.allowsMotion();
  }

  /** Returns whether the player wants sound. */
  sound(): boolean {
    return this.settings().sound;
  }

  /** Takes where the scene laid the field and its panels out on the canvas. */
  onLayout(metrics: FieldMetrics): void {
    this.metricsState.set(metrics);
  }

  /** Takes what returns a picture of every kind of brick, each time the scene bakes them. */
  onPictures(pictures: () => Pictures): void {
    this.picturesState.set(pictures);
  }

  /**
   * Does what a key, a click or a tap on the board asks, as in every run,
   * but Enter, P and a press over a lost run's card put away try the lost
   * level again, as the board's Ended card offers, rather than start a new
   * game.
   */
  override command(command: RunCommand): void {
    if (
      command !== "pause" &&
      this.outcome() === "over" &&
      this.resultClosed()
    ) {
      this.tryAgain();
      return;
    }
    super.command(command);
  }

  /**
   * Does what a key on the board asks: skips the flight, reads the wall's
   * lowest rows, or pauses, goes on or starts a run as the keys every run
   * shares ask.
   */
  fieldCommand(command: FieldCommand): void {
    switch (command) {
      case "skip":
        this.skip();
        return;
      case "read":
        this.announcer.say(describeRows(this.start()));
        return;
      default:
        this.command(command);
    }
  }

  /**
   * Lands the flight in the air at once: at the next frame, or, with the
   * run paused, now, its wall left to settle as the run goes on.
   */
  skip(): void {
    if (this.phase() !== "flying") return;
    this.play.skip();
    if (this.outcome() === "paused") this.playFrame(0, false);
  }

  /** Plays the flight in the air fast, or not, as the bar asks, until the next is released. */
  fastForward(fast: boolean): void {
    this.fastAsked.set(fast);
  }

  /** Turns the sound on or off, and keeps it in the settings. */
  toggleSound(): void {
    this.settingsService.update({ sound: !this.settings().sound });
  }

  /**
   * Takes the room the board lays the field out in: between rounds the
   * field takes its shape at once, the round aimed moved onto its depth, or
   * a level yet to play a round begun again on it; with a round in the air,
   * as the next is aimed. A room that keeps the shape changes nothing.
   */
  setRoom(viewport: Viewport): void {
    if (!hasRoom(viewport)) return;
    const shape = fieldShape(viewport);
    if (isSameShape(shape, this.room)) return;
    this.room = shape;
    const state = this.runState();
    if (state.phase !== "aiming") return;
    const run = this.laidOut(state.run);
    const start = this.onDepth(state.start, run);
    this.aim(start);
    this.runState.set({ ...state, run, start });
  }

  /** Pauses the level in play, a round in the air or not, and says so. */
  pause(): void {
    const state = this.runState();
    const run = pause(state.run);
    if (run === state.run) return;
    this.runState.set({ ...state, run });
    this.announcer.say(describePause(run));
  }

  /**
   * Goes on with a paused level, once the board is drawn, and says so: one
   * with no round played waits again for the first shot.
   */
  resume(): void {
    if (!this.drawn()) return;
    const state = this.runState();
    const run = resume(state.run);
    if (run === state.run) return;
    this.runState.set({ ...state, run });
    this.announcer.say(describeResume());
  }

  /** Goes on to the level after the one just cleared, as Go on, Enter or a press on the board asks. */
  protected override nextStage(): void {
    this.nextLevel();
  }

  /**
   * Goes on to the level after the one just cleared, once its card is
   * showing and the board is drawn, laid out on the board's room to wait
   * for the first shot, and says which it is.
   */
  nextLevel(): void {
    const state = this.runState();
    if (state.card !== "cleared" || !this.drawn()) return;
    const run = nextLevel(state.run, this.room.depth, this.levels);
    const start = openingOf(run, levelOf(run, this.levels));
    this.aim(start);
    this.runState.set({
      ...state,
      run,
      start,
      round: null,
      phase: "aiming",
      card: null,
    });
    this.sayLevel();
  }

  /**
   * Starts a new run at the level the last one started at, asking first if
   * one is in progress, and resolves to whether it did.
   */
  async newGame(): Promise<boolean> {
    return this.startAt(this.run().firstLevel);
  }

  /**
   * Starts a new run at a level, by its number, asking first if one is in
   * progress, and resolves to whether it did.
   */
  async startAt(level: number): Promise<boolean> {
    if (!(await this.mayLoseRun())) return false;
    this.begin(this.create(level));
    this.sayLevel();
    return true;
  }

  /** Starts a new run at the level a lost run reached, as its cards offer. */
  tryAgain(): void {
    const run = this.run();
    if (run.outcome !== "over") return;
    this.begin(this.create(run.level));
    this.sayLevel();
  }

  /** Puts away the card over an ended run, leaving the board to look at. */
  closeResult(): void {
    if (!this.resultOpen()) return;
    this.runState.update((state) => ({ ...state, resultClosed: true }));
  }

  /**
   * Takes up a run storage kept, paused, its next round moved onto the
   * field's depth, or its level begun again on it if no round was played,
   * and says so.
   */
  takeUp({ run, start, tuned }: TakenUp): void {
    this.numbers.takeUp(run.id);
    const laid = this.laidOut(run);
    this.begin(laid, this.onDepth(start, laid), tuned);
    this.announcer.say(describeTakenUp(laid, this.level()));
  }

  /**
   * Releases the round aimed, if its level waits for the first shot or is
   * under way: the rules play it whole, the run takes it in, its records
   * kept as the run will stand once it lands, and the view starts playing
   * its flight back.
   */
  private release({ aim, charge }: Readonly<Steer>): void {
    const state = this.runState();
    if (state.phase !== "aiming") return;
    const started = startLevel(state.run);
    if (started.outcome !== "playing") return;
    const round = this.playRound(
      state.start,
      { aim, charge },
      this.levelBoon(),
    );
    const run = takeRound(started, round.outcome);
    const newBest = this.keepRecords(state.run, run, state.tuned);
    this.play.release(round);
    this.fastAsked.set(false);
    // The run and the round in one value, so the saved game, which keeps
    // the round's next start, never reads one without the other.
    this.runState.set({
      ...state,
      run,
      round,
      phase: "flying",
      newBest,
    });
  }

  /**
   * Plays the round on by a frame's time and takes in what the frame came
   * to: the run landed as the flight ends, while it is under way, the next
   * round aimed as an ongoing round's wall comes to rest, the card that
   * opened, and the words for all of it.
   */
  private playFrame(deltaMs: number, paused: boolean): void {
    const change = this.play.advance(deltaMs, this.frameOptions(paused));
    const before = this.runState();
    const run =
      this.play.phase !== "flying" && before.run.ending !== null
        ? landRound(before.run)
        : before.run;
    const { settled } = change;
    if (settled !== null && settled.outcome.result === "on") {
      this.aim(this.onDepth(settled.next, run));
    }
    const taken = withFrame(
      run === before.run ? before : { ...before, run },
      this.play,
      // The last level's Cleared card is the run's result.
      change.opens === "cleared" && run.outcome === "won"
        ? { ...change, opens: "result" }
        : change,
    );
    const after = this.say(taken, before.card);
    if (after !== before) this.runState.set(after);
  }

  /** Says what a state's news and a card just opened call for, all at once, and returns the state with the news said. */
  private say(state: RunState, cardBefore: RunState["card"]): RunState {
    const words: string[] = [];
    for (const news of state.news) {
      if (news.kind === "ended") {
        words.push(describeRound(news.round.outcome, news.round.next));
      }
    }
    if (state.card !== cardBefore) words.push(...this.cardWords(state));
    if (words.length > 0) this.announcer.say(words.join(" "));
    return withNewsSaid(state);
  }

  /** Returns what is said as a level's card opens: the level cleared, the run's end, or both. */
  private cardWords({ run, card, newBest }: RunState): string[] {
    const cleared = run.outcome === "over" ? [] : [describeCleared(run)];
    return card === "result"
      ? [...cleared, describeEnd(run, newBest)]
      : cleared;
  }

  /**
   * Keeps what a round released brings to the records, as the run will
   * stand once it lands, but for a run on retuned numbers: a run started at
   * its first round, a level cleared and the levels it opens, and the run's
   * end, returning whether that set a new best.
   */
  private keepRecords(before: Run, taken: Run, tuned: boolean): boolean {
    if (tuned) return false;
    if (!isInProgress(before)) this.stats.recordStart();
    const landed = afterLanding(taken);
    const result = levelResultOf(landed);
    if (result !== null) {
      const { id } = levelEntryOf(this.levels, landed.level).data;
      this.stats.recordLevel(id, result);
      this.progress.recordCleared(id);
    }
    return hasEnded(landed.outcome) && this.stats.recordEnd(landed);
  }

  /** Returns how the next frame plays the round, as the settings, the player and the run say. */
  private frameOptions(paused: boolean): Readonly<PlayOptions> {
    const { frame } = this;
    const { flightSpeed, speedUpLongFlights } = this.settings();
    frame.speed = flightSpeed;
    frame.fast = this.fast();
    frame.speedUp = speedUpLongFlights;
    frame.motion = this.viewport.allowsMotion();
    frame.paused = paused;
    return frame;
  }

  /** Returns a run on the depth the board's room now gives, as the rules lay it out ({@link takeDepth}). */
  private laidOut(run: Run): Run {
    return takeDepth(run, this.room.depth, this.levels);
  }

  /** Aims a round on the field as the board's room now shapes it. */
  private aim(start: RoundStart): void {
    this.shapeState.set(this.room);
    this.play.aim(start);
  }

  /**
   * Returns where a round starts on the depth the board's room now gives:
   * a level with no round played laid out afresh on it, any other start's
   * wall kept where it stands from the floor.
   */
  private onDepth(start: RoundStart, run: Run): RoundStart {
    const { depth } = this.room;
    if (start.depth === depth) return start;
    return run.rounds === 0
      ? openingOf({ depth }, levelOf(run, this.levels))
      : { ...start, depth };
  }

  /** Says the level in play as it begins, with its boon. */
  private sayLevel(): void {
    this.announcer.say(describeLevel(this.level(), this.levelBoon()));
  }

  /** Returns a new run at a level, waiting on the board's depth for its first shot. */
  private create(level: number): Run {
    const { id } = this.numbers.next();
    return createRun({ id, level, depth: this.room.depth }, this.levels);
  }

  /**
   * Puts a run on the board, its state replaced whole, so nothing of the
   * last run's reaches it, its round aimed from where it starts.
   */
  private begin(
    run: Run,
    start: RoundStart = openingOf(run, levelOf(run, this.levels)),
    tuned = false,
  ): void {
    this.aim(start);
    this.fastAsked.set(false);
    this.runState.set(newRunState(run, start, tuned));
    this.began();
  }
}

/** Returns whether two shapes of field are alike in every measure. */
function isSameShape(a: FieldShape, b: FieldShape): boolean {
  return (
    a.unit === b.unit &&
    a.depth === b.depth &&
    a.band === b.band &&
    a.lintel === b.lintel &&
    a.panels === b.panels &&
    a.pixelRatio === b.pixelRatio
  );
}

/** Returns the providers that hand the saved game `GameService` as the game it keeps. */
export function provideGame(): Provider[] {
  return [{ provide: KEPT_GAME, useExisting: GameService }];
}
