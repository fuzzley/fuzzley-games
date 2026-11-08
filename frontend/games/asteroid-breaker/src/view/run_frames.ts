import type { FieldEvent } from "../rules/field/events";
import {
  type WaveTally,
  chainMultiplier,
  tallyOf,
} from "../rules/field/scoring";
import { rocksLeft } from "../rules/rocks/rocks";
import {
  type EndMarks,
  describeCleared,
  describeEnd,
  describeEvent,
  describeWave,
} from "../rules/run/describe";
import { type Run, catchUp, startWave } from "../rules/run/run";
import type { Pilot } from "../rules/ship/pilots";
import type { Steer } from "../rules/ship/ship";
import { type WaveEntry, waveEntryOf } from "../rules/waves/waves";
import { clearedDelayMs, resultDelayMs } from "./effects/timing";
import type { WavePlay } from "./wave_play";

/**
 * Describes what a frame of a wave's play changed, which the shell takes
 * into the run it holds and what it shows beside it.
 */
export interface FrameChange {
  /** The run as the frame changed it, or null for a frame that changed nothing of it. */
  readonly run: Run | null;
  /**
   * Whether the wave's field has moved since its first move, as of this
   * frame, so the run is flown on the numbers in use.
   */
  readonly moved: boolean;
  /**
   * Whether the frame was the first move of the run's first wave, which
   * begins the run.
   */
  readonly begun: boolean;
  /** The pilots of the strays the frame brought home, in the order they came. */
  readonly cameHome: readonly Pilot[];
  /**
   * How many times a break scores, by the chain the wave in play counts: 1
   * once the wave isn't under way. Null for a frame of a wave cleared,
   * ended or paused, which leaves the chain as it was.
   */
  readonly chain: number | null;
  /** How the wave's points added up, for its card, if the frame cleared it; else null. */
  readonly tally: WaveTally | null;
  /**
   * The card the frame opens, its wait run since the wave was cleared or the
   * run ended: the Cleared card or the result; else null.
   */
  readonly opens: "cleared" | "result" | null;
}

/** Describes the record each frame's change is written to: a writable {@link FrameChange}. */
type Change = { -readonly [Key in keyof FrameChange]: FrameChange[Key] };

/**
 * Takes each frame of a wave's play into its run: plays the wave on,
 * starting it at the player's first move, catches the run up with what its
 * field came to, waits out the beat before a card opens, and gathers what
 * to say of it.
 */
export class RunFrames {
  /** What the frames call to be said, gathered as each is worked out, and said at its end. */
  private readonly said: string[] = [];
  /** The run a frame ended, whose end is said with what it set, or null. */
  private ended: Run | null = null;
  /** The pilots of the strays the frame brought home, gathered as it is heard. */
  private readonly cameHome: Pilot[] = [];
  /** What the last frame changed: one record, written again each frame. */
  private readonly change: Change = {
    run: null,
    moved: false,
    begun: false,
    cameHome: this.cameHome,
    chain: null,
    tally: null,
    opens: null,
  };

  /**
   * Takes the frames of runs on the game's waves, which name the wave a run
   * begins, is cleared or ends on.
   */
  constructor(private readonly waves: readonly WaveEntry[]) {}

  /**
   * Moves the wave in play on by the time a frame took, steered as the
   * player steers it, starting it at the player's first move, and returns
   * what the frame changed: one record, written again each frame. With the
   * wave cleared or the run ended, the frame counts toward the wait before
   * the card over it, none where motion is unwelcome; a paused wave stays
   * as it is.
   */
  advance(
    play: WavePlay,
    run: Run,
    deltaMs: number,
    steer: Readonly<Steer>,
    motion: boolean,
  ): FrameChange {
    const { change } = this;
    change.run = null;
    change.moved = false;
    change.begun = false;
    this.cameHome.length = 0;
    change.chain = null;
    change.tally = null;
    change.opens = null;
    switch (run.outcome) {
      case "ready":
      case "playing":
        this.playOn(play, run, deltaMs, steer);
        break;
      case "cleared":
        if (play.countCardWait(deltaMs, clearedDelayMs(motion))) {
          change.opens = "cleared";
        }
        break;
      case "over":
        if (play.countCardWait(deltaMs, resultDelayMs(motion))) {
          change.opens = "result";
        }
        break;
      case "paused":
        break;
    }
    return change;
  }

  /**
   * Returns what the frames since it was last called gathered to be said,
   * all at once, or null for nothing, and forgets it; call it once a frame.
   * A run's end is said last, with what it set, which the shell's records
   * know only once they have taken the frame in.
   */
  news(marks: EndMarks): string | null {
    if (this.ended !== null) {
      const { ended } = this;
      this.said.push(describeEnd(ended, this.entryOf(ended.wave), marks));
      this.ended = null;
    }
    if (this.said.length === 0) return null;
    const news = this.said.join(" ");
    this.said.length = 0;
    return news;
  }

  /**
   * Steps the field by a frame's time, hears what happened, starts the wave
   * at the first move, takes what its field came to into the run, and shows
   * the chain the wave in play counts.
   */
  private playOn(
    play: WavePlay,
    run: Run,
    deltaMs: number,
    steer: Readonly<Steer>,
  ): void {
    const { field } = play;
    const { change } = this;
    play.advance(deltaMs, steer, this.hear);
    change.moved = field.steps > 0;
    let started = run;
    if (change.moved && run.outcome === "ready") {
      started = this.start(play, run);
    }
    this.takeIn(play, started, catchUp(started, field));
    const after = change.run ?? run;
    change.chain = after.outcome === "playing" ? chainMultiplier(field) : 1;
  }

  /**
   * Starts the wave waiting for the first move, and returns the run under
   * way; at the run's first wave, it begins the run and gathers which wave
   * it is to say, as going on to a later wave says it.
   */
  private start(play: WavePlay, run: Run): Run {
    const started = startWave(run);
    this.change.run = started;
    if (started.wave === started.firstWave) {
      this.change.begun = true;
      const entry = this.entryOf(started.wave);
      this.said.push(describeWave(entry, rocksLeft(play.field)));
    }
    return started;
  }

  /**
   * Hears an event of the field, and gathers what to say of it and the
   * strays brought home. Made once, so hearing makes nothing.
   */
  private readonly hear = (event: Readonly<FieldEvent>): void => {
    if (event.kind === "home" && event.pilot !== null) {
      this.cameHome.push(event.pilot);
    }
    const said = describeEvent(event);
    if (said !== null) this.said.push(said);
  };

  /**
   * Takes the run the field brought it to and, as the run ends or the wave
   * is cleared, starts the wait before the card over it: a clearing is said
   * at once, with its tally, and an end once the shell's records say what it
   * set. Each comes once, as no frame plays a field past them.
   */
  private takeIn(play: WavePlay, before: Run, after: Run): void {
    if (after === before) return;
    this.change.run = after;
    if (after.outcome === "over") {
      play.startCardWait();
      this.ended = after;
    } else if (after.outcome === "cleared") {
      play.startCardWait();
      this.change.tally = tallyOf(play.field);
      const cleared = this.entryOf(after.wave);
      const next = this.entryOf(after.wave + 1);
      this.said.push(describeCleared(after, cleared, next));
    }
  }

  /**
   * Returns a wave of the game by its number, from 1; past the last, one of
   * Endless's.
   */
  private entryOf(wave: number): WaveEntry {
    return waveEntryOf(this.waves, wave);
  }
}
