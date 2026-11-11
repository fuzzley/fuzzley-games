import {
  DestroyRef,
  Injectable,
  type Provider,
  type WritableSignal,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { type RunCommand, hasEnded } from "@fz/core/run";
import { RunNumbers } from "@fz/core/run_numbers";
import { GAME_RANDOM } from "@fz/game-ui/random";
import { RunLifecycle } from "@fz/game-ui/run_lifecycle";
import { GameViewportService } from "@fz/game-ui/viewport";
import { NO_INSETS } from "@fz/phaser/insets";
import type { Viewport } from "@fz/phaser/layout";
import { ThemeService } from "@fz/ui/theme";
import { kindIntroducedAt } from "../../rules/catalog/bricks";
import {
  type CertifiedShot,
  type Line,
  shotOf,
} from "../../rules/levels/certificate";
import { levelEntryOf } from "../../rules/levels/levels";
import {
  type Crew,
  RULES,
  type RoundRules,
  type RoundStart,
} from "../../rules/round/round";
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
  levelsCleared,
  nextLevel,
  openingOf,
  pause,
  resume,
  startLevel,
  takeDepth,
  takeRound,
} from "../../rules/run/run";
import type { TakenUp } from "../../rules/run/saved_game";
import { tallyOf } from "../../rules/run/scoring";
import { levelResultOf } from "../../rules/run/stats";
import type { Pictures } from "../../scene/pictures";
import { type Guide, guideOf } from "../../rules/flight/guide";
import type { Aim, Boon, Charge, Shot } from "../../rules/shot";
import { FIELD_ROLES, wallPalette } from "../../view/colors/palette";
import {
  type FieldMetrics,
  type FieldShape,
  fieldShape,
  hasRoom,
} from "../../view/field/field_metrics";
import {
  type TunedNumbers,
  paceOf,
  rulesOf,
} from "../../view/debug/debug_tuning";
import {
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
  STRAIGHT_UP,
} from "../../view/steering/aiming";
import type { Steer } from "../../view/steering/steering";
import type { BoardCard } from "../board/board_card.component";
import { DebugService, type RunStart } from "../debug/debug.service";
import { waitingRows } from "../panels/panels";
import type { RunEnd } from "../result/result.component";
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

/** Describes a guide cast, with the start, the numbers and the shot it was cast for. */
interface GuideCast {
  readonly start: RoundStart;
  readonly numbers: TunedNumbers;
  readonly aim: Aim;
  readonly charge: Charge;
  readonly guide: Guide;
}

/** Describes how a frame plays the round, written again each frame. */
type FrameOptions = { -readonly [Key in keyof PlayOptions]: PlayOptions[Key] };

/**
 * Plays the game: holds the run and where its round stands, plays each
 * round released through the rules and back through the view a frame at a
 * time, takes what it comes to into the run, pauses, goes on and starts
 * levels and runs as the player asks, lays the field out on the board's
 * room between rounds, says what happened, and keeps the records and the
 * levels cleared, but for a run the debug menu takes off the record. It
 * plays on the numbers the debug menu tunes, at the depth it sets.
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
  private readonly debug = inject(DebugService);
  private readonly numbers = new RunNumbers(inject(GAME_RANDOM));
  private readonly roles = this.theme.roles(FIELD_ROLES);
  private readonly settings = this.settingsService.settings;

  /** The board's canvas as it last measured it, or null before it has. */
  private canvas: Viewport | null = null;
  /**
   * The field's shape the board's canvas and the debug menu's depth last
   * gave, which the field takes between rounds.
   */
  private room = FIRST_SHAPE;
  private readonly shapeState = signal(FIRST_SHAPE);
  /** Whether the player asked for the flight in the air to play fast, from the bar. */
  private readonly fastAsked = signal(false);
  /** Whether fast-forward is held, as the last frame's steering said. */
  private readonly fastHeld = signal(false);
  private readonly metricsState = signal<FieldMetrics | null>(null);
  private readonly picturesState = signal<(() => Pictures) | null>(null);
  /** The aim the steering last gave, which the guide shows. */
  private aimedAt = STRAIGHT_UP;
  /** The charge the steering last gave, which the guide shows. */
  private charged: Charge = 0;
  /** The guide last cast, and what it was cast for. */
  private guideCast: GuideCast | null = null;
  /** The shots of a certificate's line still to fly, in order, while the level in play plays one. */
  private lineShots: Line = [];
  /** The field's depth the line playing was found on. */
  private lineDepth = 0;
  /** How the next frame plays the round, written again each frame. */
  private readonly frame: FrameOptions = {
    pace: paceOf(this.debug.tuning.tuning()),
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

  /** Whether the run keeps no records, as the debug menu took it off the record. */
  readonly tuned = this.debug.runOffRecord;

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

  /** What returns a picture of every kind of brick, as the board last handed them on, or null before it has. */
  readonly pictures = this.picturesState.asReadonly();

  /**
   * The card the board shows over the field: Ready as a level waits for its
   * first shot, Paused, Cleared once its card is due, the run's end once
   * its result is put away, or null for none.
   */
  readonly boardCard = computed((): BoardCard | null => {
    const run = this.run();
    if (this.ended() && this.resultClosed()) {
      return run.outcome === "won"
        ? { kind: "ended", outcome: "won", score: run.score }
        : {
            kind: "ended",
            outcome: "over",
            level: run.level,
            name: this.level().data.name,
            score: run.score,
          };
    }
    if (this.card() === "cleared") {
      return {
        kind: "cleared",
        level: run.level,
        rounds: run.rounds,
        par: run.par,
        tally: tallyOf(run),
        score: run.score,
        friends: this.nextStart().crew.friends,
      };
    }
    switch (run.outcome) {
      case "ready":
        return {
          kind: "ready",
          level: run.level,
          name: this.level().data.name,
          boon: this.levelBoon(),
          newKind: kindIntroducedAt(run.level),
        };
      case "paused":
        return { kind: "paused", score: this.score() };
      default:
        return null;
    }
  });

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

  constructor() {
    super();
    // Made here, once every field above is, so the first run is laid out
    // on the first shape.
    const run = this.create(1);
    const start = openingOf(run, levelOf(run, this.levels));
    this.play = new RoundPlay(start);
    this.runState = signal(newRunState(run, start));
    // Heard at once rather than through an effect, which runs later, so no
    // frame plays on the old pace.
    inject(DestroyRef).onDestroy(
      this.debug.tuning.onTune(() => {
        this.frame.pace = paceOf(this.debug.tuning.tuning());
      }),
    );
    effect(() => {
      this.debug.depth();
      untracked(() => {
        this.reshape();
      });
    });
  }

  /**
   * Moves the game on by the time a frame took, steered as the player
   * steers it: says the aim and the charge the keys moved, releases a shot
   * let fly, or the next of a certificate's line while one plays, and plays
   * the round on, taking what it came to into the run.
   */
  tick(deltaMs: number, steer: Readonly<Steer>): void {
    this.fastHeld.set(steer.fast);
    this.aimedAt = steer.aim;
    this.charged = steer.charge;
    if (steer.keyed) this.announcer.say(describeShot(steer, this.boon()));
    const shot = this.lineShot();
    if (shot === undefined) {
      if (steer.release) {
        this.release(steer, rulesOf(this.debug.tuning.tuning()));
      }
    } else if (this.release(shotOf(shot), RULES)) {
      this.lineShots = this.lineShots.slice(1);
    }
    this.playFrame(deltaMs, this.run().outcome === "paused");
  }

  /** Returns the round in play as the scene draws it at this moment: one record, written again each frame. */
  view(): RoundView {
    return this.play.view;
  }

  /**
   * Returns the guide of the shot the steering last aimed, as the rules
   * cast it on the numbers the debug menu tunes, or null while the setting
   * hides it or no shot can be let fly. A shot aimed as the last was keeps
   * its guide, so a frame casts one only as the aim, the charge or the
   * round changes.
   */
  guide(): Guide | null {
    const { outcome } = this.run();
    if (
      !this.settings().guide ||
      this.phase() !== "aiming" ||
      (outcome !== "ready" && outcome !== "playing")
    ) {
      return null;
    }
    const start = this.start();
    const numbers = this.debug.tuning.tuning();
    const cast = this.guideCast;
    if (
      cast?.start === start &&
      cast.numbers === numbers &&
      cast.aim === this.aimedAt &&
      cast.charge === this.charged
    ) {
      return cast.guide;
    }
    const guide = guideOf(
      start,
      { aim: this.aimedAt, charge: this.charged },
      numbers.guidePastTurn,
      rulesOf(numbers),
    );
    this.guideCast = {
      start,
      numbers,
      aim: this.aimedAt,
      charge: this.charged,
      guide,
    };
    return guide;
  }

  /** Returns where the player's fuzzball waits on the floor, or null while it is in the air. */
  waitingX(): number | null {
    return this.play.waitingX;
  }

  /**
   * Returns the boon the waiting fuzzball carries: the round aimed's while
   * it aims, the next round's once the flight has landed, and none while
   * it flies.
   */
  boon(): Boon | null {
    return this.flying() ? null : this.nextStart().boon;
  }

  /** Returns the crew of the round aimed or in play. */
  crew(): Crew {
    return this.start().crew;
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

  /**
   * Takes what returns a picture of every kind of brick, as the board hands
   * them on: the scene's first bake's at once, a later one's once the atlas
   * settles.
   */
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
    const shape = fieldShape(this.canvas, this.debug.depth());
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
    // The score the bar shows, which a flight in the air may not have
    // played all of back yet.
    this.announcer.say(describePause({ ...run, score: this.score() }));
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
    this.lineShots = [];
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
   * Plays a certificate's line: starts a run at a level, by its number,
   * asking first if one is in progress, kept off the record, and lets the
   * line's shots fly, one as each round is aimed, on the rules' own numbers
   * whatever the debug menu has retuned. The line is the one `lineOn`
   * gives for the field's depth; with none, nothing is asked and no run
   * begins. The line stops should the field take another depth, and as
   * the next level or another run begins. Resolves to whether one began.
   */
  async playLine(
    level: number,
    lineOn: (depth: number) => Line | null,
  ): Promise<boolean> {
    if (lineOn(this.room.depth) === null) return false;
    if (!(await this.mayLoseRun())) return false;
    // Again, as the room may have changed while the player was asked.
    const { depth } = this.room;
    const shots = lineOn(depth);
    if (shots === null) return false;
    this.begin(this.create(level), undefined, { certified: true });
    this.lineShots = shots;
    this.lineDepth = depth;
    this.sayLevel();
    return true;
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
    this.begin(laid, this.onDepth(start, laid), { kept: tuned });
    this.announcer.say(describeTakenUp(laid, this.level()));
  }

  /**
   * Releases the round aimed at a shot, if its level waits for the first
   * shot or is under way: the rules play it whole, on the numbers handed,
   * the run takes it in, its records kept as the run will stand once it
   * lands, and the view starts playing its flight back. Returns whether
   * the shot flew.
   */
  private release({ aim, charge }: Readonly<Shot>, rules: RoundRules): boolean {
    const state = this.runState();
    if (state.phase !== "aiming") return false;
    const started = startLevel(state.run);
    if (started.outcome !== "playing") return false;
    const round = this.playRound(
      state.start,
      { aim, charge },
      this.levelBoon(),
      rules,
    );
    const run = takeRound(started, round.outcome);
    const landed = afterLanding(run);
    const newBest = this.keepRecords(state.run, landed);
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
    return true;
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
        const { outcome, next } = news.round;
        // A round that leaves the level on is said of the next as it is
        // aimed, on the depth the field takes as the words are said, which
        // the room may have changed while the round flew.
        words.push(
          describeRound(outcome, outcome.result === "on" ? state.start : next),
        );
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
   * Keeps what a round released brings to the records, from the run as it
   * will stand once it lands, but for a run off the record: a run started
   * at its first round, a level cleared and the levels it opens, and the
   * run's end, returning whether that set a new best.
   */
  private keepRecords(before: Run, landed: Run): boolean {
    if (this.debug.runOffRecord()) return false;
    if (!isInProgress(before)) this.stats.recordStart();
    const result = levelResultOf(landed);
    if (result !== null) {
      const { id } = levelEntryOf(this.levels, landed.level).data;
      this.stats.recordLevel(id, result);
      this.progress.recordCleared(id);
    }
    return hasEnded(landed.outcome) && this.stats.recordEnd(landed);
  }

  /**
   * Returns the next shot of the certificate's line the level in play
   * plays, if any, the line dropped once the field takes a depth it wasn't
   * found on, as its shots would miss there.
   */
  private lineShot(): CertifiedShot | undefined {
    if (this.start().depth !== this.lineDepth) this.lineShots = [];
    return this.lineShots[0];
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
   * last run's reaches it, its round aimed from where it starts, and tells
   * the debug menu how it begins: a new run, by whether its level is open,
   * or one storage kept, by whether it was off the record.
   */
  private begin(
    run: Run,
    start: RoundStart = openingOf(run, levelOf(run, this.levels)),
    keeping: RunStart = { locked: !this.progress.isOpen(run.level) },
  ): void {
    this.aim(start);
    this.fastAsked.set(false);
    this.lineShots = [];
    this.debug.startRun(keeping);
    this.runState.set(newRunState(run, start));
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
