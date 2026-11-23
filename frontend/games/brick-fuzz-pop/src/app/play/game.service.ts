import {
  DestroyRef,
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
import { STRAIGHT_UP } from "@fz/brick-wall/view/aim_settings";
import type { FrameChange } from "@fz/brick-wall/view/rounds_played";
import { FIELD_ROLES } from "@fz/brick-wall/view/palette";
import { GameViewportService } from "@fz/game-ui/viewport";
import { ThemeService } from "@fz/ui/theme";
import { type Line, shotOf } from "../../rules/levels/certificate";
import { type LevelEntry, parseLevel } from "../../rules/levels/levels";
import {
  type Crew,
  RULES,
  type Round,
  type RoundRules,
  type RoundStart,
} from "../../rules/round/round";
import { describeRows, describeShot } from "../../rules/run/describe";
import type { PlayedRound, ReadRound } from "../../rules/run/reported_game";
import {
  type LevelCounts,
  RUN_RULES,
  levelOf,
  openingOf,
} from "../../rules/run/run";
import { STATS_RULES } from "../../rules/run/stats";
import type { Pictures } from "../../scene/pictures";
import { type Guide, guideOf } from "../../rules/flight/guide";
import type { Boon, Charge, Shot } from "../../rules/shot";
import { wallPalette } from "../../view/colors/palette";
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
import type { FieldCommand } from "../../view/steering/controls";
import type { Steer } from "../../view/steering/steering";
import { DebugService } from "../debug/debug.service";
import { SettingsService } from "../settings/settings.service";
import { ProgressService } from "../stats/progress.service";
import { StatsService } from "../stats/stats.service";
import { GAME_LEVELS, PLAY_ROUND } from "../tokens";
import { boardCardOf } from "./cards";
import { CertificateLine } from "./line";
import { KEPT_GAME } from "./saved_game.service";
import { ROUND_WORDS, fastForwardWords } from "./words";

/**
 * The pace a reported round is flown to its moment at, a field unit a
 * millisecond at either speed, at which a frame's time is the distance it
 * plays.
 */
const UNIT_A_MS: PlayOptions["pace"]["unitsPerSecond"] = {
  normal: 1000,
  fast: 1000,
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
 * Returns what the run's driver is handed of Brick Fuzz Pop: its levels,
 * the run's rules, the opening of each level, its play of the rounds, its
 * records and words, and the depth the debug menu sets. It must be called
 * in an injection context.
 */
function brickFuzzPopDriving(): RoundDriving<
  LevelCounts,
  LevelEntry,
  RoundStart,
  Round,
  RoundPlay
> {
  const levels = inject(GAME_LEVELS);
  const debug = inject(DebugService);
  return {
    levels,
    rules: RUN_RULES,
    openingOf: (run) => openingOf(run, levelOf(run, levels)),
    playOf: (start) => new RoundPlay(start),
    records: new RunRecords({
      stats: inject(StatsService),
      progress: inject(ProgressService),
      levels,
      rules: RUN_RULES,
      results: STATS_RULES,
      menu: debug,
    }),
    words: ROUND_WORDS,
    depthSet: debug.depth,
  };
}

/**
 * Plays the game, as `RoundDriver` drives a run's rounds, steered as the
 * player steers it, with what is Brick Fuzz Pop's own: a shot's charge and
 * its boon, the friends freed, the drop, which flies the round in the air
 * again from the moment it is pressed, fast-forward and the rest of the
 * settings, the field's palette and pictures, the board's card, and a
 * certificate's line the debug menu plays. It plays on the numbers the
 * debug menu tunes, at the depth it sets.
 *
 * The round's view changes every frame, so no signal holds it; the scene
 * reads it through {@link view}.
 */
@Injectable({ providedIn: "root" })
export class GameService extends RoundDriver<
  LevelCounts,
  LevelEntry,
  RoundStart,
  Shot,
  RoundRules,
  Round,
  RoundPlay,
  Guide,
  ReadRound
> {
  private readonly viewport = inject(GameViewportService);
  private readonly theme = inject(ThemeService);
  private readonly settingsService = inject(SettingsService);
  private readonly stats = inject(StatsService);
  private readonly playRounds = inject(PLAY_ROUND);
  private readonly debug = inject(DebugService);
  private readonly roles = this.theme.roles(FIELD_ROLES);
  private readonly settings = this.settingsService.settings;

  private readonly picturesState = signal<(() => Pictures) | null>(null);
  /** The aim the steering last gave, which the guide shows. */
  private aimedAt = STRAIGHT_UP;
  /** The charge the steering last gave, which the guide shows. */
  private charged: Charge = 0;
  /** The guide last cast, and what it was cast for. */
  private guideCast: GuideCast | null = null;
  /** The certificate's line the level in play plays, if any. */
  private readonly line = new CertificateLine();
  /** How the next frame plays the round, written again each frame. */
  private readonly frame: FrameOptions = {
    pace: paceOf(this.debug.tuning.tuning()),
    speed: "normal",
    fast: false,
    speedUp: true,
    motion: true,
    paused: false,
  };
  /**
   * The round a drop would fly again while it is the round in the air: the
   * last the player let fly, until it is dropped; null for a certificate's
   * line's, as a line's later shots assume the earlier ones flew whole.
   */
  private readonly droppableRound = signal<PlayedRound | null>(null);

  /** The best score of any run, as of the last that ended. */
  readonly best = computed(() => this.stats.stats().best);

  /** The boon each jump of the level in play's wall earns the next shot. */
  readonly levelBoon = computed(() => parseLevel(this.level().data).boon);

  /** How many of the wall's rows wait over the ceiling, as the round aimed or in play started. */
  readonly rowsLeft = computed(() => {
    const { wall, depth } = this.start();
    return waitingRows(wall, depth).length;
  });

  /** Each friend's ink, in the order they were freed, as the round aimed or in play started. */
  readonly friends = computed(() => this.start().crew.friends);

  /**
   * Whether a drop would bring the flight in the air down, paused or not:
   * from its release until it lands or is dropped, but for a certificate's
   * line's.
   */
  readonly droppable = computed(() => {
    const dropping = this.droppableRound();
    return dropping !== null && dropping === this.inAir();
  });

  /** Whether fast-forward is on, every flight played fast, as the settings keep it from flight to flight. */
  readonly fast = computed(() => this.settings().fastForward);

  /** Whether the player wants sound. */
  readonly soundOn = computed(() => this.settings().sound);

  /** Whether the shot being aimed carries the boon a jump earned. */
  readonly lit = computed(
    () => this.phase() === "aiming" && this.start().boon !== null,
  );

  /** How the mouse and fingers aim, as the settings say, for the steering. */
  readonly pointerAiming = computed(() => this.settings().aiming);

  /** The colors the field is drawn in, from the palette on the page, a new value as it changes. */
  readonly palette = computed(() =>
    wallPalette(this.roles(), this.theme.mode()),
  );

  /** What returns a picture of every kind of brick, as the board last handed them on, or null before it has. */
  readonly pictures = this.picturesState.asReadonly();

  /**
   * The card the board shows over the field: Ready as a level waits for its
   * first shot, Paused, Cleared once its card is due, the run's end once
   * its result is put away, or null for none.
   */
  readonly boardCard = computed(() => boardCardOf(this));

  constructor() {
    super(brickFuzzPopDriving());
    // Heard at once rather than through an effect, which runs later, so no
    // frame plays on the old pace.
    inject(DestroyRef).onDestroy(
      this.debug.tuning.onTune(() => {
        this.frame.pace = paceOf(this.debug.tuning.tuning());
      }),
    );
  }

  /**
   * Moves the game on by the time a frame took, steered as the player
   * steers it: says the aim and the charge the keys moved, releases a shot
   * let fly, or the next of a certificate's line while one plays, and plays
   * the round on, taking what it came to into the run.
   */
  tick(deltaMs: number, steer: Readonly<Steer>): void {
    this.aimedAt = steer.aim;
    this.charged = steer.charge;
    if (steer.keyed) this.announcer.say(describeShot(steer, this.boon()));
    const shot = this.line.next(this.run(), this.start());
    if (shot === undefined) {
      if (steer.release) {
        // A copy, as the steer handed is written again each frame.
        const released = this.release(
          { aim: steer.aim, charge: steer.charge },
          rulesOf(this.debug.tuning.tuning()),
        );
        if (released !== null) this.droppableRound.set(released);
      }
    } else if (
      // A line's shot is made only as a round waits for it, so a frame of
      // its flight makes none.
      this.phase() === "aiming" &&
      this.release(shotOf(shot), RULES) !== null
    ) {
      this.droppableRound.set(null);
      this.line.flew();
    }
    this.playFrame(deltaMs);
  }

  /** Returns the round in play as the scene draws it at this moment: one record, written again each frame. */
  view(): RoundView {
    return this.play.view;
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

  /**
   * Takes what returns a picture of every kind of brick, as the board hands
   * them on: the scene's first bake's at once, a later one's once the atlas
   * settles.
   */
  onPictures(pictures: () => Pictures): void {
    this.picturesState.set(pictures);
  }

  /**
   * Does what a key on the board asks: drops the flight, switches
   * fast-forward on or off and says which, reads the wall's lowest rows, or
   * pauses, goes on or starts a run as the keys every run shares ask.
   */
  fieldCommand(command: FieldCommand): void {
    switch (command) {
      case "drop":
        this.drop();
        return;
      case "fast":
        this.fastForward();
        this.announcer.say(fastForwardWords(this.fast()));
        return;
      case "read":
        this.announcer.say(describeRows(this.start()));
        return;
      default:
        this.command(command);
    }
  }

  /**
   * Drops the flight in the air, if {@link droppable}: every fuzzball in
   * the air comes straight down where it is, and those not yet let fly never
   * leave. The rules fly the round again from the same start, shot, level's
   * boon and rules, dropped at the moment the playback has reached, the run
   * takes what that comes to in place of the whole round, and the playback
   * plays on with it; paused, its fuzzballs come down as the run goes on.
   */
  drop(): void {
    const dropping = this.droppableRound();
    if (dropping === null || !this.droppable()) return;
    const { start, shot, rules } = dropping;
    const at = this.play.moment;
    const round = this.playRounds(start, shot, this.levelBoon(), rules, {
      stop: "drop",
      at,
    });
    this.droppableRound.set(null);
    this.play.dropTo(round);
    this.droppedAt(dropping, round, at);
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
    if (lineOn(this.roomDepth) === null) return false;
    if (!(await this.mayLoseRun())) return false;
    // Again, as the room may have changed while the player was asked.
    const depth = this.roomDepth;
    const shots = lineOn(depth);
    if (shots === null) return false;
    this.begin(this.create(level), undefined, { certified: true });
    this.line.start(shots, depth, this.run());
    this.sayLevel();
    return true;
  }

  /**
   * Flies a reported round in play on to the moment reported, as the
   * player's, which a drop may bring down: dropped first where it was.
   */
  protected override flyOn(round: ReadRound, released: PlayedRound): void {
    this.droppableRound.set(released);
    if (round.dropped !== null) {
      this.flyTo(round.dropped);
      this.drop();
    }
    super.flyOn(round, released);
  }

  /** Returns the round a shot plays, through the game's round player, with the level's boon. */
  protected override playRound(
    start: RoundStart,
    shot: Shot,
    rules: RoundRules,
  ): Round {
    return this.playRounds(start, shot, this.levelBoon(), rules);
  }

  /**
   * Returns the guide of the shot the steering last aimed, as the rules
   * cast it on the numbers the debug menu tunes, or null while the setting
   * hides it. A shot aimed as the last was keeps its guide, so a frame
   * casts one only as the aim, the charge or the round changes.
   */
  protected override guideOf(start: RoundStart): Guide | null {
    if (!this.settings().guide) return null;
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

  /** Plays the round on by a frame's time, as the settings, the player and the run say. */
  protected override advancePlay(
    deltaMs: number,
    paused: boolean,
  ): FrameChange<Round> {
    return this.play.advance(deltaMs, this.frameOptions(paused));
  }

  /** Plays the round in the air on by a distance, at a field unit a millisecond, neither fast-forwarded nor sped up. */
  protected override advanceExactly(distance: number): FrameChange<Round> {
    const frame = this.frameOptions(false);
    return this.play.advance(distance, {
      ...frame,
      pace: { ...frame.pace, unitsPerSecond: UNIT_A_MS },
      fast: false,
      speedUp: false,
    });
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
}

/** Returns the providers that hand the saved game `GameService` as the game it keeps. */
export function provideGame(): Provider[] {
  return [{ provide: KEPT_GAME, useExisting: GameService }];
}
