import {
  Injectable,
  type Provider,
  computed,
  inject,
  signal,
} from "@angular/core";
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
import type { AimFrame } from "@fz/brick-wall/view/aiming";
import type { FrameChange } from "@fz/brick-wall/view/rounds_played";
import type { AwayReason } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { ThemeService } from "@fz/ui/theme";
import type { Round, RoundStart } from "../../rules/flight/events";
import { type Guide, guideOf } from "../../rules/flight/guide";
import type { LevelEntry } from "../../rules/levels/levels";
import {
  CALL_WORDS,
  describeGuide,
  describeRows,
} from "../../rules/run/describe";
import type { ReadRound } from "../../rules/run/reported_game";
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
import { type PlayOptions, RoundPlay } from "../../view/play/round_play";
import type { FlightSoFar, RoundView } from "../../view/run_state";
import type { FieldCommand } from "../../view/steering/controls";
import { DebugService } from "../debug/debug.service";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_LEVELS, GAME_MARKS, PLAY_ROUND } from "../tokens";
import { boardCardOf } from "./cards";
import { PlayedRounds } from "./played_rounds";
import { KEPT_GAME } from "./saved_game.service";
import { RunWords, fastForwardWords } from "./words";

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

/** Describes how a frame plays the round, written again each frame. */
type FrameOptions = { -readonly [Key in keyof PlayOptions]: PlayOptions[Key] };

/**
 * Returns what the run's driver is handed of Rickashay: its levels, the
 * run's rules by the levels' marks, the opening of each level, its play of
 * the rounds, its records and words, and the depth the debug menu sets. It
 * must be called in an injection context.
 */
function rickashayDriving(
  words: RunWords,
): RoundDriving<LevelTally, LevelEntry, RoundStart, Round, PlayedRounds> {
  const levels = inject(GAME_LEVELS);
  const marks = inject(GAME_MARKS);
  const debug = inject(DebugService);
  const rules = runRulesOf(levels, marks);
  return {
    levels,
    rules,
    openingOf: (run) => openingOf(run, levelOf(run, levels)),
    playOf: (start) => new PlayedRounds(new RoundPlay(start, FLIGHT_RULES)),
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
 * the settings; and the field's palette.
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
  private readonly roles = this.theme.roles(FIELD_ROLES);
  private readonly settings = this.settingsService.settings;

  /** The aim the steering last gave, which the guide shows. */
  private aimedAt: Aim = STRAIGHT_UP;
  /** The guide last cast, and what it was cast for. */
  private guideCast: GuideCast | null = null;
  /** Whether the flight in the air is landing as the page is hidden, unseen and unheard. */
  private unseen = false;
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
   * The rules' numbers the guide is cast on and the scene draws by, with the
   * turn the guide follows a shot to as the settings ask.
   */
  readonly fieldRules = computed((): FlightRules => ({
    ...FLIGHT_RULES,
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

  /** The pictures of each drawn kind of brick, as the scene last baked them, or null before it has. */
  readonly pictures = this.picturesState.asReadonly();

  /** The colors the field is drawn in, from the palette on the page, a new value as it changes. */
  readonly palette = computed(() =>
    wallPalette(this.roles(), this.theme.mode()),
  );

  constructor() {
    const words = new RunWords(inject(GAME_LEVELS), inject(GAME_MARKS));
    super(rickashayDriving(words));
    words.follow(this.run);
  }

  /**
   * Moves the game on by the time a frame took, aimed as the player aims:
   * releases a shot let fly, on the rules' own numbers, and plays the round
   * on, taking what it came to into the run.
   */
  tick(deltaMs: number, aim: Readonly<AimFrame>): void {
    this.aimedAt = aim.aim;
    if (aim.release) this.release({ aim: aim.aim }, FLIGHT_RULES);
    this.playFrame(deltaMs);
    this.showCall(deltaMs);
  }

  /** Takes the pictures of each drawn kind of brick the scene's atlas baked. */
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
   * the run say, or lands it unseen as the page is hidden.
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
   * Shows the call over the field, and says it, as the frame's flight
   * reached the level's rally mark, and puts it away once it has shown for
   * `CALL_MS`.
   */
  private showCall(deltaMs: number): void {
    if (this.play.news.some(({ kind }) => kind === "called")) {
      this.calls++;
      this.callLeftMs = CALL_MS;
      this.callState.set(this.calls);
      this.announcer.say(CALL_WORDS);
      return;
    }
    if (this.callState() === null) return;
    this.callLeftMs -= deltaMs;
    if (this.callLeftMs <= 0) this.callState.set(null);
  }

  /** Says what the guide shows of the shot being aimed, while one shows. */
  private readGuide(): void {
    const guide = this.guide();
    if (guide === null) return;
    this.announcer.say(describeGuide(this.aimedAt, guide.events, this.start()));
  }

  /** Returns how the next frame plays the round, as the settings, the player and the run say. */
  private frameOptions(paused: boolean): Readonly<PlayOptions> {
    const { frame } = this;
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
