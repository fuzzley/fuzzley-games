import {
  Injectable,
  type Provider,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { CertificateLine } from "@fz/brick-wall/app/certificate_line";
import { fastForwardWords } from "@fz/brick-wall/app/fast_forward";
import { waitingRows } from "@fz/brick-wall/app/panels";
import { RunRecords } from "@fz/brick-wall/app/records";
import {
  RoundDriver,
  type RoundDriving,
} from "@fz/brick-wall/app/round_driver";
import type { Aim } from "@fz/brick-wall/rules/aims";
import {
  type PointerRelease,
  STRAIGHT_UP,
} from "@fz/brick-wall/view/aim_settings";
import type { FrameChange } from "@fz/brick-wall/view/rounds_played";
import type { AwayReason } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { ThemeService } from "@fz/ui/theme";
import type { Round, RoundStart } from "../../rules/flight/events";
import { type Guide, guideOf } from "../../rules/flight/guide";
import type { LevelEntry } from "../../rules/levels/levels";
import {
  describeAim,
  describeGuide,
  describeParAndMark,
  describeRows,
} from "../../rules/run/describe";
import type { ReadRound } from "../../rules/run/reported_game";
import type { TakenUp } from "../../rules/run/saved_game";
import { levelOf, openingOf, runRulesOf } from "../../rules/run/run";
import type { LevelTally } from "../../rules/run/scoring";
import { rallyMarkOf } from "../../rules/run/stars";
import { statsRulesOf } from "../../rules/run/stats";
import type { Shot } from "../../rules/shot";
import { FLIGHT_RULES, type FlightRules } from "../../rules/tuning";
import type { Pictures } from "../../scene/pictures";
import { FIELD_ROLES, wallPalette } from "../../view/colors/palette";
import { CALL_MS } from "../../view/effects/timing";
import {
  FLIGHT_PACE,
  type FlightPace,
  type Speeds,
} from "../../view/play/pace";
import {
  type PlayOptions,
  type PlayRules,
  RoundPlay,
} from "../../view/play/round_play";
import type { FlightSoFar, RoundView } from "../../view/run_state";
import type { FieldCommand } from "../../view/steering/controls";
import type { Steer } from "../../view/steering/steering";
import type { ReadyCard } from "../board/board_card.component";
import { DebugService } from "../debug/debug.service";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_LEVELS, GAME_MARKS, PLAY_ROUND } from "../tokens";
import { boardCardOf } from "./cards";
import { PlayedRounds } from "./played_rounds";
import { KEPT_GAME } from "./saved_game.service";
import { RunWords } from "./words";

/** The speeds a reported round is flown to its moment at: a field unit a millisecond throughout, at which a frame's time is the distance it plays. */
const UNIT_A_MS: Speeds = [1000, 1000, 1000, 1000];

/** The pace a reported round is flown to its moment at, as {@link UNIT_A_MS} says, never quickening or dashing. */
const EXACT_PACE: FlightPace = {
  speeds: { normal: UNIT_A_MS, fast: UNIT_A_MS },
  dash: 1,
  fastForward: 1,
};

/** What a flight has played back before its release, as a round is aimed. */
const NOT_FLOWN: FlightSoFar = { rally: 0, held: 0, turns: 0, points: 0 };

/** Describes a guide cast, with the start, the aim and the rules it was cast for. */
interface GuideCast {
  readonly start: RoundStart;
  readonly aim: Aim;
  readonly rules: FlightRules;
  readonly guide: Guide;
}

/** Describes a level's par and rally mark as the announcer last said them. */
interface FiguresSaid {
  readonly par: number;
  readonly mark: number;
}

/** Describes how a frame plays the round, written again each frame. */
type FrameOptions = { -readonly [Key in keyof PlayOptions]: PlayOptions[Key] };

/**
 * Returns the rules' numbers a level's play shows a shot by: the hatches'
 * holds, read afresh each time, since the play outlives every tuning, as
 * the shot in play or next flies on them, the game's own for a line's shot
 * and else as the debug menu tunes them; and a hot shot's floor bounces,
 * which the menu leaves be.
 */
function playRulesOf(
  debug: DebugService,
  line: CertificateLine<Aim>,
): PlayRules {
  return {
    get hatchHolds() {
      return (line.playing() ? FLIGHT_RULES : debug.rules()).hatchHolds;
    },
    hotBounces: FLIGHT_RULES.hotBounces,
  };
}

/**
 * Returns what the run's driver is handed of Rickashay: its levels, the
 * run's rules by the levels' marks, the opening of each level, its play of
 * the rounds, showing each shot's hatches as the rules it flies on hold
 * them, a line's among them, its records and words, and the depth the
 * debug menu sets. It must be called in an injection context.
 */
function rickashayDriving(
  words: RunWords,
  line: CertificateLine<Aim>,
): RoundDriving<LevelTally, LevelEntry, RoundStart, Round, PlayedRounds> {
  const levels = inject(GAME_LEVELS);
  const marks = inject(GAME_MARKS);
  const debug = inject(DebugService);
  const rules = runRulesOf(levels, marks);
  return {
    levels,
    rules,
    openingOf: (run) => openingOf(run, levelOf(run, levels)),
    playOf: (start) =>
      new PlayedRounds(new RoundPlay(start, playRulesOf(debug, line))),
    records: new RunRecords({
      stats: inject(StatsService),
      progress: inject(ProgressService),
      levels,
      rules,
      results: statsRulesOf(levels, marks),
      menu: debug,
    }),
    words,
    depthSet: debug.depth,
  };
}

/**
 * Plays the game, as `RoundDriver` drives a run's rounds, steered as the
 * player steers it, with what is Rickashay's own: a shot that is an aim
 * alone, flown on the rules' numbers; the guide, cast to the turn the
 * settings ask for; each flight called out at the level's rally mark; the
 * best rally against it; Skip, which lands a flight at once; G and R, which
 * read the guide and the wall's lowest rows; fast-forward and the rest of
 * the settings; the field's palette; and a certificate's or a rally line
 * the debug menu plays. It plays on the numbers the debug menu tunes, at
 * the depth it sets. It says the Ready card's par and rally mark again as
 * another depth changes them before the level's first shot.
 *
 * The round's view changes every frame, so no signal holds it; the scene
 * reads it through {@link view}.
 */
@Injectable({ providedIn: "root" })
export class GameService extends RoundDriver<
  LevelTally,
  LevelEntry,
  RoundStart,
  Shot,
  FlightRules,
  Round,
  PlayedRounds,
  Guide,
  ReadRound
> {
  private readonly viewport = inject(GameViewportService);
  private readonly theme = inject(ThemeService);
  private readonly settingsService = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly playRounds = inject(PLAY_ROUND);
  private readonly marks = inject(GAME_MARKS);
  private readonly debug = inject(DebugService);
  private readonly roles = this.theme.roles(FIELD_ROLES);
  private readonly settings = this.settingsService.settings;

  /** The aim the steering last gave, which the guide shows. */
  private aimedAt: Aim = STRAIGHT_UP;
  /** The guide last cast, and what it was cast for. */
  private guideCast: GuideCast | null = null;
  /** Whether the flight in the air is landing as the page is hidden, unseen and unheard. */
  private unseen = false;
  /** The certificate's or rally line the level in play plays, if any. */
  private readonly line: CertificateLine<Aim>;
  /** How the next frame plays the round, written again each frame. */
  private readonly frame: FrameOptions = {
    pace: FLIGHT_PACE,
    speed: "normal",
    fast: false,
    motion: true,
    paused: false,
  };
  private readonly soFarState = signal(NOT_FLOWN);
  /** How many times a flight has been called out, which numbers the call showing. */
  private calls = 0;
  /** How long the call showing has left over the field. */
  private callLeftMs = 0;
  private readonly callState = signal<number | null>(null);
  private readonly picturesState = signal<(() => Pictures) | null>(null);
  /** The words the run is said in, which hold what each frame's flight came to. */
  private readonly runWords: RunWords;
  /** The par and rally mark the announcer last said, as a level began or the Ready card's changed, or null before any level is said. */
  private figuresSaid: FiguresSaid | null = null;

  /** The best score of any run, as of the last that ended. */
  readonly best = computed(() => this.stats.stats().best);

  /** How many of the wall's rows wait over the ceiling, as the round aimed or in play started. */
  readonly rowsLeft = computed(() => {
    const { wall, depth } = this.start();
    return waitingRows(wall, depth).length;
  });

  /** The level in play's rally mark, on the depth it began on: the rally a flight is called out at, and earns its star at. */
  readonly rallyMark = computed(() =>
    rallyMarkOf(this.level().data.id, this.run().depth, this.marks),
  );

  /**
   * What the round in play's flight has played back so far, or, once it
   * has landed, all of it; another value only as it changes.
   */
  readonly soFar = this.soFarState.asReadonly();

  /**
   * The level in play's best rally, as the bar shows it: a flight's counted
   * as it plays back, though the run takes its rally in as it is released.
   */
  readonly bestRally = computed(() => {
    const inAir = this.inAir();
    if (inAir === null) return this.run().tally.bestRally;
    return Math.max(inAir.started.tally.bestRally, this.soFar().rally);
  });

  /** Whether a shot is being aimed in a level under way, which Nudge and Release steer. */
  readonly aiming = computed(() => {
    const outcome = this.outcome();
    return (
      this.phase() === "aiming" &&
      (outcome === "ready" || outcome === "playing")
    );
  });

  /** Whether fast-forward is on, every flight played fast, as the settings keep it from flight to flight. */
  readonly fast = computed(() => this.settings().fastForward);

  /** Whether the player wants sound. */
  readonly soundOn = computed(() => this.settings().sound);

  /** How the mouse and fingers aim, as the settings say, for the steering. */
  readonly pointerAiming = computed(() => this.settings().aiming);

  /** Whether the settings ask for the bar's Release to let the shot fly. */
  readonly releaseByButton = computed(() => this.settings().releaseByButton);

  /** How a pointer's press lets the shot fly, as the settings say, for the steering. */
  readonly pointerRelease = computed((): PointerRelease =>
    this.releaseByButton() ? "byButton" : "onLetGo",
  );

  /**
   * The rules' numbers the guide is cast on and the scene draws by, as the
   * debug menu tunes them, with the turn the guide follows a shot to as the
   * settings ask.
   */
  readonly fieldRules = computed((): FlightRules => ({
    ...this.debug.rules(),
    guideTurns: this.settings().guideTurns,
  }));

  /**
   * The "Rickashay!" call showing over the field, numbered from 1 so each
   * shows afresh, for `CALL_MS` from the frame its flight reached the
   * level's rally mark; or null for none.
   */
  readonly call = this.callState.asReadonly();

  /** The card over the field, or null for none. */
  readonly boardCard = computed(() => boardCardOf(this));

  /** The pictures the scene last baked, each drawn kind of brick's and a floor bounce's spring, or null before it has. */
  readonly pictures = this.picturesState.asReadonly();

  /** The colors the field is drawn in, from the palette on the page, a new value as it changes. */
  readonly palette = computed(() =>
    wallPalette(this.roles(), this.theme.mode()),
  );

  constructor() {
    const words = new RunWords(
      inject(GAME_LEVELS),
      inject(GAME_MARKS),
      FLIGHT_RULES,
    );
    const line = new CertificateLine<Aim>();
    super(rickashayDriving(words, line));
    words.follow(this.run);
    this.runWords = words;
    this.line = line;
    effect(() => {
      const card = this.boardCard();
      if (card?.kind !== "ready") return;
      untracked(() => {
        this.sayChangedFigures(card);
      });
    });
  }

  /**
   * Moves the game on by the time a frame took, aimed as the player aims:
   * says the aim as the keys or the bar's Nudges move it, releases a shot
   * let fly, on the numbers the debug menu tunes, or the next of a line
   * while one plays, and plays the round on, taking what it came to into
   * the run, and saying what its flight came to that the round's end
   * didn't say.
   */
  tick(deltaMs: number, aim: Readonly<Steer>): void {
    this.aimedAt = aim.aim;
    if (aim.keyed) this.announcer.say(describeAim(aim.aim));
    const shot = this.line.next(this.run(), this.start());
    if (shot === undefined) {
      if (aim.release) this.release({ aim: aim.aim }, this.debug.rules());
    } else if (
      // A line's shot is made only as a round waits for it, so a frame of
      // its flight makes none.
      this.phase() === "aiming" &&
      this.release({ aim: shot }, FLIGHT_RULES) !== null
    ) {
      this.line.flew();
    }
    this.playFrame(deltaMs);
    const heard = this.runWords.takeHeld();
    if (heard !== null) this.announcer.say(heard);
    this.showCall(deltaMs);
  }

  /** Takes the pictures the scene's atlas baked: each drawn kind of brick's and a floor bounce's spring. */
  onPictures(pictures: () => Pictures): void {
    this.picturesState.set(pictures);
  }

  /** Returns the round in play as the scene draws it at this moment: one record, written again each frame. */
  view(): RoundView {
    return this.play.view;
  }

  /** Returns whether the player welcomes motion. */
  motion(): boolean {
    return this.viewport.allowsMotion();
  }

  /** Returns whether the player wants sound. */
  sound(): boolean {
    return this.settings().sound;
  }

  /**
   * Does what a key on the board asks: switches fast-forward on or off and
   * says which, skips the flight, reads the guide or the wall's lowest
   * rows, or pauses, goes on or starts a run as the keys every run shares
   * ask.
   */
  fieldCommand(command: FieldCommand): void {
    switch (command) {
      case "fast":
        this.fastForward();
        this.announcer.say(fastForwardWords(this.fast()));
        return;
      case "skip":
        this.landAtOnce();
        return;
      case "readGuide":
        this.readGuide();
        return;
      case "readRows":
        this.announcer.say(describeRows(this.start()));
        return;
      default:
        this.command(command);
    }
  }

  /** Switches fast-forward on or off, and keeps it in the settings. */
  fastForward(): void {
    this.settingsService.update({
      fastForward: !this.settings().fastForward,
    });
  }

  /** Turns the sound on or off, and keeps it in the settings. */
  toggleSound(): void {
    this.settingsService.update({ sound: !this.settings().sound });
  }

  /**
   * Plays a line of shots, a certificate's or a rally line: starts a run at
   * a level, by its number, asking first if one is in progress, kept off
   * the record, and lets the line's shots fly, one as each round is aimed,
   * on the rules' own numbers whatever the debug menu has retuned. The line
   * is the one `lineOn` gives for the field's depth; with none, nothing is
   * asked and no run begins. The line stops should the field take another
   * depth, and as the next level or another run begins. Resolves to
   * whether one began.
   */
  async playLine(
    level: number,
    lineOn: (depth: number) => readonly Aim[] | null,
  ): Promise<boolean> {
    if (lineOn(this.roomDepth) === null) return false;
    if (!(await this.mayLoseRun())) return false;
    // Again, as the room may have changed while the player was asked.
    const depth = this.roomDepth;
    const shots = lineOn(depth);
    if (shots === null) return false;
    // The line first, so the level's play shows its first shot's hatches.
    const run = this.create(level);
    this.line.start(shots, depth, run);
    this.begin(run, undefined, { certified: true });
    this.sayLevel();
    return true;
  }

  /**
   * Pauses the level in play as the player looks away from the room, as
   * every wall game's does, but lands a flight the hidden page leaves in
   * the air unseen and unheard, so nothing of it plays as the page is shown
   * again.
   */
  override lookAway(reason: AwayReason): void {
    this.unseen = reason === "hidden";
    try {
      super.lookAway(reason);
    } finally {
      this.unseen = false;
    }
  }

  /**
   * Says the level in play as it begins, and keeps the par and rally mark
   * it said, so the Ready card's are said again only as they change.
   */
  protected override sayLevel(): void {
    super.sayLevel();
    this.figuresSaid = { par: this.run().par, mark: this.rallyMark() };
  }

  /**
   * Takes up a run storage kept, or a bug report did, as every wall game
   * does, its level not said, so the Ready card's par and rally mark are
   * said again only once a level is.
   */
  override takeUp(kept: TakenUp): void {
    super.takeUp(kept);
    this.figuresSaid = null;
  }

  /**
   * Returns the round a shot plays, through the game's round player, and
   * has its flight called out at the level's rally mark.
   */
  protected override playRound(
    start: RoundStart,
    shot: Shot,
    rules: FlightRules,
  ): Round {
    this.play.callAt(this.rallyMark());
    return this.playRounds(start, shot, rules);
  }

  /**
   * Returns the guide of the shot the steering last aimed, as the rules
   * cast it to the turn the settings ask for. A shot aimed as the last was,
   * from the same start, keeps its guide, so a frame casts one only as the
   * aim, the start, the hot shot or the rules change.
   */
  protected override guideOf(start: RoundStart): Guide {
    const rules = this.fieldRules();
    const cast = this.guideCast;
    if (
      cast?.start === start &&
      cast.aim === this.aimedAt &&
      cast.rules === rules
    ) {
      return cast.guide;
    }
    const guide = guideOf(start, { aim: this.aimedAt }, rules);
    this.guideCast = { start, aim: this.aimedAt, rules, guide };
    return guide;
  }

  /**
   * Plays the round on by a frame's time, as the settings, the player and
   * the run say, or lands it unseen as the page is hidden, and holds the
   * words of what its flight came to, for the round's end to say first or
   * the frame to say after.
   */
  protected override advancePlay(
    deltaMs: number,
    paused: boolean,
  ): FrameChange<Round> {
    const options = this.frameOptions(paused);
    const change = this.unseen
      ? this.play.landUnseen(options)
      : this.play.advance(deltaMs, options);
    this.soFarState.set(this.play.soFar);
    this.runWords.hold(this.play.news);
    return change;
  }

  /** Plays the round in the air on by a distance, at a field unit a millisecond, neither fast-forwarded nor quickening. */
  protected override advanceExactly(distance: number): FrameChange<Round> {
    const frame = this.frameOptions(false);
    const change = this.play.advance(distance, {
      ...frame,
      pace: EXACT_PACE,
      fast: false,
    });
    this.soFarState.set(this.play.soFar);
    return change;
  }

  /**
   * Shows the call over the field as the frame's flight reached the
   * level's rally mark, and puts it away once it has shown for `CALL_MS`.
   */
  private showCall(deltaMs: number): void {
    if (this.play.news.some(({ kind }) => kind === "called")) {
      this.calls++;
      this.callLeftMs = CALL_MS;
      this.callState.set(this.calls);
      return;
    }
    if (this.callState() === null) return;
    this.callLeftMs -= deltaMs;
    if (this.callLeftMs <= 0) this.callState.set(null);
  }

  /**
   * Says the Ready card's par and rally mark where they are no longer those
   * said as its level began, or since, as the field takes another depth
   * before the level's first shot, once for each change: none are said
   * before a level is, as on a page just opened or a run taken up.
   */
  private sayChangedFigures({ par, mark }: ReadyCard): void {
    const said = this.figuresSaid;
    if (said === null || (said.par === par && said.mark === mark)) return;
    this.announcer.say(describeParAndMark(par, mark));
    this.figuresSaid = { par, mark };
  }

  /** Says what the guide shows of the shot being aimed, while one shows. */
  private readGuide(): void {
    const guide = this.guide();
    if (guide === null) return;
    this.announcer.say(describeGuide(this.aimedAt, guide.events, this.start()));
  }

  /** Returns how the next frame plays the round, as the settings, the debug menu's pace, the player and the run say. */
  private frameOptions(paused: boolean): Readonly<PlayOptions> {
    const { frame } = this;
    frame.pace = this.debug.pace();
    frame.speed = this.settings().flightSpeed;
    frame.fast = this.fast();
    frame.motion = this.viewport.allowsMotion();
    frame.paused = paused;
    return frame;
  }
}

/** Returns the providers that hand the saved game `GameService` as the game it keeps. */
export function provideGame(): Provider[] {
  return [{ provide: KEPT_GAME, useExisting: GameService }];
}
