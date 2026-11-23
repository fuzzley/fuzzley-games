import {
  type Signal,
  type WritableSignal,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import type { RunEnd } from "@fz/brick-wall/app/result";
import {
  afterLanding,
  createRun,
  isInProgress,
  landRound,
  levelsCleared,
  nextLevel,
  pause,
  resume,
  startLevel,
  takeDepth,
  takeRound,
} from "@fz/brick-wall/rules/run";
import {
  type FieldMetrics,
  type FieldShape,
  fieldShape,
  hasRoom,
} from "@fz/brick-wall/view/field_metrics";
import { type RunCommand, hasEnded } from "@fz/core/run";
import { RunNumbers } from "@fz/core/run_numbers";
import type { AwayReason } from "@fz/game-ui/play_room";
import { GAME_RANDOM } from "@fz/game-ui/random";
import { RunLifecycle } from "@fz/game-ui/run_lifecycle";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { type LevelEntry, levelEntryOf } from "../../rules/levels/levels";
import type { Round, RoundRules, RoundStart } from "../../rules/round/round";
import type {
  PlayedGame,
  PlayedRound,
  ReadRound,
  ReplayedGame,
} from "../../rules/run/reported_game";
import { RUN_RULES, type Run } from "../../rules/run/run";
import type { TakenUp } from "../../rules/run/saved_game";
import type { Guide } from "../../rules/flight/guide";
import type { Shot } from "../../rules/shot";
import type { PlayOptions, RoundPlay } from "../../view/round_play";
import {
  type RunState,
  newRunState,
  withFrame,
  withNewsSaid,
} from "../../view/run_state";
import type { RunStart } from "../debug/debug.service";
import type { KeptGame } from "./saved_game.service";
import type { RunRecords } from "./records";

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

/** Holds what the run's driver says as the run goes: each the words for one moment of it. */
export interface RoundWords {
  /** Returns what is said as a round's wall comes to rest, from where the round aimed next starts. */
  readonly round: (round: Round, aimed: RoundStart) => string;
  /** Returns what is said as a level begins. */
  readonly level: (level: LevelEntry) => string;
  /** Returns what is said as a level is cleared. */
  readonly cleared: (run: Run) => string;
  /** Returns what is said as a run ends, and whether it set a new best. */
  readonly end: (run: Run, newBest: boolean) => string;
  /** Returns what is said as a run pauses, its score the bar's. */
  readonly pause: (run: Run) => string;
  /** Returns what is said as a paused run goes on. */
  readonly resume: () => string;
  /** Returns what is said as a run storage kept is taken up, paused. */
  readonly takenUp: (run: Run, level: LevelEntry) => string;
}

/** Holds what the run's driver is handed: what does not change as it plays. */
export interface RoundDriving {
  /** The levels a run is played through, in order. */
  readonly levels: readonly LevelEntry[];
  /** Returns where a level's first round starts, on the depth a run gives. */
  readonly openingOf: (run: Pick<Run, "level" | "depth">) => RoundStart;
  /** Returns the play of every round, its first aimed from where it starts: called once, as the driver is made. */
  readonly playOf: (start: RoundStart) => RoundPlay;
  /** Keeps the records as each flight lands. */
  readonly records: RunRecords;
  /** What is said as the run goes. */
  readonly words: RoundWords;
  /** The field's depth the debug menu sets over the room's, or null for the room's own. */
  readonly depthSet: Signal<number | null>;
}

/**
 * Drives a run's rounds: holds the run and where its round stands, releases
 * each shot through the rules once the board is drawn and plays it back
 * through the view a frame at a time, lands a flight at once as the page is
 * hidden, takes what it comes to into the run and the records as it lands,
 * pauses and starts runs as the player asks, goes on and starts the next
 * level once the board is drawn, lays the field out on the board's room
 * between rounds, and says what happened.
 *
 * It records the level in play's rounds, in memory only, which a bug
 * report takes and plays again.
 *
 * The run and what the shell shows beside the field are one signal,
 * replaced whole as each run begins, which changes only as the run or its
 * round does, never at a frame that changes neither.
 *
 * The game's service extends it, handing it what does not change as it
 * plays, and how a round is played and cast and how a frame plays it.
 */
export abstract class RoundDriver extends RunLifecycle implements KeptGame {
  private readonly numbers = new RunNumbers(inject(GAME_RANDOM));
  /** The levels a run is played through, in order. */
  protected readonly levels: readonly LevelEntry[];
  /** Plays every round back, level after level and run after run. */
  protected readonly play: RoundPlay;
  private readonly openingOf: RoundDriving["openingOf"];
  private readonly records: RunRecords;
  private readonly words: RoundWords;
  private readonly depthSet: Signal<number | null>;

  /** The board's canvas as it last measured it, or null before it has. */
  private canvas: Viewport | null = null;
  /**
   * The field's shape the board's canvas and the debug menu's depth last
   * gave, which the field takes between rounds.
   */
  private room = FIRST_SHAPE;
  private readonly shapeState = signal(FIRST_SHAPE);
  private readonly metricsState = signal<FieldMetrics | null>(null);
  /**
   * The level in play's rounds released since the game began recording
   * them, as the level began or a run was taken up, in order, the round in
   * play's last, which a bug report plays again; kept in memory only.
   */
  private levelRounds: PlayedRound[] = [];
  /** The round last released, as it was, until another is or it is dropped. */
  private readonly released = signal<PlayedRound | null>(null);
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
   * as it is released, and again as it is dropped.
   */
  readonly nextStart = computed(() => this.round()?.next ?? this.start());

  /** Whether the run keeps no records, as the debug menu took it off the record. */
  readonly tuned: Signal<boolean>;

  /** Whether the run's end set a new best score. */
  readonly newBest = computed(() => this.runState().newBest);

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

  /**
   * The round whose flight is being played back, which the run took in as
   * it was released, but the bar counts only as it plays; else null.
   */
  private readonly flight = computed(() => {
    const { round, phase } = this.runState();
    return phase === "flying" ? round : null;
  });

  /**
   * The rounds the level in play has played, as the bar counts them: a
   * round as its flight lands, though the run counts it as it is released.
   */
  readonly rounds = computed(() =>
    this.flight() === null ? this.run().rounds : this.run().rounds - 1,
  );

  /** The level in play's par. */
  readonly par = computed(() => this.run().par);

  /**
   * The run's points so far, as the bar shows them: each break's as the
   * flight plays it back, and the rest, a jump's and the stars', as it
   * lands, though the run scores the round as it is released.
   */
  readonly score = computed(() => {
    const flight = this.flight();
    const { run, scored } = this.runState();
    return flight === null
      ? run.score
      : run.score - flight.outcome.points + scored;
  });

  /** Whether a flight is under way, paused or not. */
  readonly flying = computed(() => this.phase() === "flying");

  /**
   * The round in the air as it was released, and as it was dropped once it
   * is, while its flight is under way; else null.
   */
  protected readonly inAir = computed(() =>
    this.flying() ? this.released() : null,
  );

  /** The field's shape, which changes only between rounds. */
  readonly shape = this.shapeState.asReadonly();

  /** Where the field and its panels lie on the canvas, as the scene last laid them out, or null before it has. */
  readonly metrics = this.metricsState.asReadonly();

  /** How the run ended, for its result card, or null while it goes on. */
  readonly runEnd = computed((): RunEnd | null => {
    const run = this.run();
    if (run.outcome !== "over" && run.outcome !== "won") return null;
    return {
      outcome: run.outcome,
      firstLevel: run.firstLevel,
      level: run.level,
      levelName: this.level().data.name,
      score: run.score,
      cleared: levelsCleared(run),
      stars: run.stars,
    };
  });

  protected constructor(driving: RoundDriving) {
    super();
    this.levels = driving.levels;
    this.openingOf = driving.openingOf;
    this.records = driving.records;
    this.words = driving.words;
    this.depthSet = driving.depthSet;
    this.tuned = driving.records.offRecord;
    // Made here, once every field above is, so the first run is laid out
    // on the first shape.
    const run = this.create(1);
    const start = this.openingOf(run);
    this.play = driving.playOf(start);
    this.runState = signal(newRunState(run, start));
    effect(() => {
      this.depthSet();
      untracked(() => {
        this.reshape();
      });
    });
  }

  /**
   * Returns the round a shot plays from where it starts, on the rules
   * handed, as the game's rules play it.
   */
  protected abstract playRound(
    start: RoundStart,
    shot: Shot,
    rules: RoundRules,
  ): Round;

  /**
   * Returns the guide of the shot the player aims from where the round
   * aimed starts, or null where the game shows none; asked only while a
   * shot can be let fly.
   */
  protected abstract guideOf(start: RoundStart): Guide | null;

  /** Returns how the next frame plays the round, as the game's settings and the player say, paused or not. */
  protected abstract frameOptions(paused: boolean): Readonly<PlayOptions>;

  /**
   * Returns how a frame plays a flight at a field unit a millisecond,
   * neither fast-forwarded nor sped up, so the frame's time is the distance
   * it plays.
   */
  protected abstract exactFrameOptions(): Readonly<PlayOptions>;

  /** The depth the board's room now gives the field, which a round aimed takes between rounds. */
  protected get roomDepth(): number {
    return this.room.depth;
  }

  /**
   * Returns the guide of the shot the player aims, while one can be let
   * fly: the round aimed, its level waiting for the first shot or under
   * way; else null.
   */
  guide(): Guide | null {
    const { outcome } = this.run();
    if (
      this.phase() !== "aiming" ||
      (outcome !== "ready" && outcome !== "playing")
    ) {
      return null;
    }
    return this.guideOf(this.start());
  }

  /** Takes where the scene laid the field and its panels out on the canvas. */
  onLayout(metrics: FieldMetrics): void {
    this.metricsState.set(metrics);
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
   * Takes the room the board lays the field out in, which shapes the field
   * with the debug menu's depth: between rounds at once, the round aimed
   * moved onto its depth, or a level yet to play a round begun again on it;
   * with a round in the air, as the next is aimed. A room that keeps the
   * shape changes nothing, and one with no area is ignored.
   */
  setRoom(viewport: Viewport): void {
    if (!hasRoom(viewport)) return;
    this.canvas = viewport;
    this.reshape();
  }

  /**
   * Shapes the field as the board's canvas and the debug menu's depth now
   * say, as {@link setRoom} does.
   */
  private reshape(): void {
    if (this.canvas === null) return;
    const shape = fieldShape(this.canvas, this.depthSet());
    if (isSameShape(shape, this.room)) return;
    this.room = shape;
    const state = this.runState();
    if (state.phase !== "aiming") return;
    const run = this.laidOut(state.run);
    const start = this.onDepth(state.start, run);
    this.aim(start);
    this.runState.set({ ...state, run, start });
  }

  /**
   * Pauses the level in play as the player looks away from the room, a
   * flight in the air paused where it is; but as the page is hidden, which
   * may never be seen again, lands the round in the air at once first, as
   * it would have flown, so its records are kept with the saved game.
   */
  lookAway(reason: AwayReason): void {
    if (reason === "hidden") this.landAtOnce();
    this.pause();
  }

  /** Pauses the level in play, a round in the air or not, and says so. */
  pause(): void {
    const state = this.runState();
    const run = pause(state.run);
    if (run === state.run) return;
    this.runState.set({ ...state, run });
    // The score the bar shows, which a flight in the air may not have
    // played all of back yet.
    this.announcer.say(this.words.pause({ ...run, score: this.score() }));
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
    this.announcer.say(this.words.resume());
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
    const run = nextLevel(state.run, this.room.depth, this.levels, RUN_RULES);
    const start = this.openingOf(run);
    this.levelRounds = [];
    this.aim(start);
    this.runState.set({
      ...state,
      run,
      start,
      round: null,
      phase: "aiming",
      scored: 0,
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
   * Returns the game as it stands, as a bug report takes it: the run, where
   * the round aimed or in play starts, and the level's rounds since the
   * game began recording them, from the game itself, never storage.
   */
  report(): PlayedGame {
    const { run, start, round } = this.runState();
    return {
      run,
      start,
      rounds: [...this.levelRounds],
      inPlay: round !== null,
      moment: this.play.moment,
      tuned: this.tuned(),
    };
  }

  /**
   * Takes up a run storage kept, paused, its next round moved onto the
   * field's depth, or its level begun again on it if no round was played,
   * marks the levels it cleared cleared, and says so.
   */
  takeUp({ run, start, tuned }: TakenUp): void {
    this.numbers.takeUp(run.id);
    const laid = this.laidOut(run);
    this.begin(laid, this.onDepth(start, laid), { kept: tuned });
    this.records.takenUp(laid);
    this.announcer.say(this.words.takenUp(laid, this.level()));
  }

  /**
   * Takes up a game a bug report kept, on the depth the debug menu now
   * sets: off the record, the run and where its round starts taken up as a
   * saved game is, the rounds its level played on the way recorded, and its
   * round in play, if any, released again from where it started, flown to
   * the moment reported and paused. Set the debug menu's depth first, and
   * ask the player first where a run in progress would be lost.
   *
   * A round in play is flown only once the board is drawn.
   */
  takeUpReplayed({ game, rounds, round }: ReplayedGame): void {
    // At once, rather than as the depth's effect runs, so the run is taken
    // up on it.
    this.reshape();
    this.takeUp({ ...game, tuned: true });
    this.levelRounds = [...rounds];
    if (round !== null) this.flyReported(round);
  }

  /**
   * Flies a reported round in play, just released again, on to the moment
   * reported: a game whose play can change a flight on the way, as a drop
   * does, flies it to that change first.
   */
  protected flyOn(round: ReadRound, _released: PlayedRound): void {
    this.flyTo(round.moment);
  }

  /**
   * Releases a reported round in play again from the start aimed, the run
   * taken up going on, flies it on to the moment reported ({@link flyOn}),
   * then pauses the run there, or leaves a level it ended to open its card.
   */
  private flyReported(round: ReadRound): void {
    const state = this.runState();
    this.runState.set({ ...state, run: resume(state.run) });
    const released = this.release(round.shot, round.rules);
    if (released !== null) this.flyOn(round, released);
    this.pause();
  }

  /**
   * Plays the round in the air on to a moment of its flight in one frame,
   * at a field unit a millisecond, neither fast-forwarded nor sped up, so
   * the frame's time is the distance to the moment, played back unrounded:
   * at the flight's own pace, a time worked out from the distance and
   * turned back into one can miss the moment by a rounding.
   */
  protected flyTo(moment: number): void {
    this.advance(
      moment - this.play.moment,
      false,
      landInPlay,
      this.exactFrameOptions(),
    );
  }

  /**
   * Releases the round aimed at a shot, if the board is drawn and its level
   * waits for the first shot or is under way: the rules play it whole, on
   * the rules handed, the run takes it in, counted in the records as it
   * plays its first round, and the view starts playing its flight back.
   * Returns the round as it was released, or null where the shot didn't
   * fly.
   */
  protected release(
    { aim, charge }: Readonly<Shot>,
    rules: RoundRules,
  ): PlayedRound | null {
    const state = this.runState();
    if (!this.drawn() || state.phase !== "aiming") return null;
    const started = startLevel(state.run);
    if (started.outcome !== "playing") return null;
    // A copy, as the steer handed is written again each frame.
    const shot: Shot = { aim, charge };
    const round = this.playRound(state.start, shot, rules);
    const run = takeRound(started, round.outcome, RUN_RULES);
    this.records.started(state.run);
    const released: PlayedRound = {
      started,
      start: state.start,
      shot,
      rules,
      dropped: null,
    };
    this.levelRounds.push(released);
    this.released.set(released);
    this.play.release(round);
    // The run and the round in one value, so the saved game, which keeps
    // the round's next start, never reads one without the other.
    this.runState.set({ ...state, run, round, phase: "flying" });
    return released;
  }

  /**
   * Puts a round flown again from the start of the round in the air in its
   * place, dropped at a moment: the run takes it in, in place of the whole
   * round, from the run as it stood once the round in the air was released
   * (`released`), left paused if it was, and the record a bug report plays
   * again marks that round dropped there. Call it as the game's play plays
   * on with the round dropped.
   */
  protected droppedAt(released: PlayedRound, round: Round, at: number): void {
    const last = this.levelRounds.length - 1;
    this.levelRounds = this.levelRounds.map((each, index) =>
      index === last ? { ...each, dropped: at } : each,
    );
    this.released.set({ ...released, dropped: at });
    const state = this.runState();
    const taken = takeRound(released.started, round.outcome, RUN_RULES);
    const run = state.run.outcome === "paused" ? pause(taken) : taken;
    // The run and the round in one value, as at the release, so the saved
    // game writes the round dropped with the run that took it in.
    this.runState.set({ ...state, run, round });
  }

  /**
   * Lands the round in the air at once, whatever the run's stage: its
   * flight skipped to its end at a frame of no time, and the run, with the
   * records, as {@link afterLanding} lands it, a paused run left paused
   * but where its level ends.
   */
  private landAtOnce(): void {
    if (!this.flying()) return;
    this.play.skip();
    this.advance(0, false, (run) => afterLanding(run, RUN_RULES));
  }

  /**
   * Plays the round on by a frame's time and takes in what the frame came
   * to, as {@link advance} does, as the settings, the player and the run
   * say: held still while the run is paused.
   */
  protected playFrame(deltaMs: number): void {
    this.advance(deltaMs, this.run().outcome === "paused");
  }

  /**
   * Plays the round on by a frame's time and takes in what the frame came
   * to: the run landed as the flight ends, while it is under way, or as
   * the move handed lands it, with what the landing brings to the records,
   * the next round aimed as an ongoing round's wall comes to rest, the card
   * that opened, and the words for all of it. The frame plays as the
   * settings, the player and the run say, unless handed how.
   */
  private advance(
    deltaMs: number,
    paused: boolean,
    land: (run: Run) => Run = landInPlay,
    options: Readonly<PlayOptions> = this.frameOptions(paused),
  ): void {
    const change = this.play.advance(deltaMs, options);
    const before = this.runState();
    const run =
      this.play.phase !== "flying" && before.run.ending !== null
        ? land(before.run)
        : before.run;
    let state = before;
    if (run !== before.run) {
      state = { ...before, run, newBest: this.records.landed(run) };
    }
    const { settled } = change;
    if (settled !== null && settled.outcome.result === "on") {
      this.aim(this.onDepth(settled.next, run));
    }
    const taken = withFrame(
      state,
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
    // Most frames have nothing to say, and make no list of words.
    if (state.news.length === 0 && state.card === cardBefore) return state;
    const words: string[] = [];
    for (const news of state.news) {
      if (news.kind === "ended") {
        // A round that leaves the level on is said of the next as it is
        // aimed, on the depth the field takes as the words are said, which
        // the room may have changed while the round flew.
        words.push(this.words.round(news.round, state.start));
      }
    }
    if (state.card !== cardBefore) words.push(...this.cardWords(state));
    if (words.length > 0) this.announcer.say(words.join(" "));
    return withNewsSaid(state);
  }

  /** Returns what is said as a level's card opens: the level cleared, the run's end, or both. */
  private cardWords({ run, card, newBest }: RunState): string[] {
    const cleared = run.outcome === "over" ? [] : [this.words.cleared(run)];
    return card === "result"
      ? [...cleared, this.words.end(run, newBest)]
      : cleared;
  }

  /** Returns a run on the depth the board's room now gives, as the rules lay it out ({@link takeDepth}). */
  private laidOut(run: Run): Run {
    return takeDepth(run, this.room.depth, this.levels, RUN_RULES);
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
      ? this.openingOf({ level: run.level, depth })
      : { ...start, depth };
  }

  /** Says the level in play as it begins. */
  protected sayLevel(): void {
    this.announcer.say(this.words.level(this.level()));
  }

  /** Returns a new run at a level, waiting on the board's depth for its first shot. */
  protected create(level: number): Run {
    const { id } = this.numbers.next();
    return createRun(
      { id, level, depth: this.room.depth },
      this.levels,
      RUN_RULES,
    );
  }

  /**
   * Puts a run on the board, its state replaced whole, so nothing of the
   * last run's reaches it, its round aimed from where it starts, and tells
   * the records how it begins: a new run, by whether its level is open, or
   * as handed. The last run's round not yet landed in it lands in the
   * records first, as it would have flown, as nothing can change it once
   * the run is left, so the level it clears is open to the new run.
   */
  protected begin(
    run: Run,
    start: RoundStart = this.openingOf(run),
    keeping?: RunStart,
  ): void {
    this.records.left(this.runState().run);
    this.aim(start);
    this.levelRounds = [];
    this.records.began(run, keeping);
    this.runState.set(newRunState(run, start));
    this.began();
  }
}

/** Returns the run with its round in flight landed, as the run's rules land it while its level plays. */
function landInPlay(run: Run): Run {
  return landRound(run, RUN_RULES);
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
