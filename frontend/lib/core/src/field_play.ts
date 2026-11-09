import { type Clock, Countdown, advanceClock } from "./clock";
import type { EventLog, NumberedEvent } from "./event_log";

/** Describes how a game's rules move its field on: a frame's steering taken, and a step. */
export interface FieldRules<Field, Steer> {
  /** Takes a frame's steering, which the steps until the next frame follow. */
  readonly steer: (field: Field, steer: Readonly<Steer>) => void;
  /** Moves the field on by one step. */
  readonly step: (field: Field) => void;
}

/** Describes the frame a game's scene is handed: one record, whose `alpha` the play writes again each frame. */
export interface PlayFrame {
  /** How far the field is from its last step to its next, from 0 to 1. */
  alpha: number;
}

/**
 * Plays a game's field: moves it on by the time the board's frames take, in
 * its clock's steps, steered as the player steers, hands on each of its
 * events once, and waits out the beat before a card opens over it.
 *
 * Make one for each field, so nothing of one field's play carries to the
 * next.
 */
export class FieldPlay<
  Field extends { readonly events: EventLog<E> },
  Steer,
  E extends NumberedEvent,
  Frame extends PlayFrame,
> {
  /** The serial of the last of the field's events handed on. */
  private heard = 0;
  /** The wait before a card opens, from when the field's play came to an end. */
  private readonly cardWait = new Countdown();

  /**
   * Plays a field by a game's rules and clock, handing the scene a frame of
   * it.
   *
   * @param shown The frame the scene draws, which holds the field and is
   *   written again as the field moves on, so drawing allocates nothing.
   */
  constructor(
    readonly field: Field,
    private readonly rules: FieldRules<Field, Steer>,
    private readonly clock: Clock,
    private readonly shown: Frame,
  ) {}

  /** Returns the frame to draw, as the field now stands: one record for the field's whole play. */
  frame(): Readonly<Frame> {
    return this.shown;
  }

  /**
   * Steers the field as the player steers it, moves it on by the time a
   * frame took, a step for each step's time the frame holds, and hands
   * `hear` each event since the last frame, once.
   */
  advance(
    deltaMs: number,
    steer: Readonly<Steer>,
    hear: (event: Readonly<E>) => void,
  ): void {
    this.rules.steer(this.field, steer);
    const steps = advanceClock(this.clock, deltaMs);
    for (let i = 0; i < steps; i++) this.rules.step(this.field);
    this.shown.alpha = progressOf(this.clock);
    this.field.events.forEachSince(this.heard, hear);
    this.heard = this.field.events.latest;
  }

  /** Starts the wait before a card opens, as the field's play comes to an end. */
  startCardWait(): void {
    this.cardWait.start();
  }

  /**
   * Counts a frame's time toward the card's wait, and returns whether the
   * card opens now, which it does once; call it once a frame.
   */
  countCardWait(deltaMs: number, waitMs: number): boolean {
    return this.cardWait.count(deltaMs, waitMs);
  }
}

/** Returns how far a clock is from its last step to its next, from 0 to 1. */
function progressOf(clock: Clock): number {
  return clock.carried / clock.stepMs;
}
