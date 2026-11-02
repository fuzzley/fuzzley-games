import { advanceClock, progressOf } from "@fz/core/clock";
import type { FieldEvent } from "../rules/events";
import { type Field, steerField, stepField } from "../rules/field";
import type { Steer } from "../rules/ship";
import { createFieldClock } from "../rules/stepper";
import type { FieldFrame } from "./frame";

/** Describes the frame the scene is handed, one record whose `alpha` each frame writes again. */
interface Frame extends FieldFrame {
  alpha: number;
}

/**
 * Plays a wave's field: moves it on by the time the board's frames take,
 * steered as the player steers, hands on each event once, and waits out the
 * beat before a card opens over the wave cleared or the run ended.
 *
 * Make one for each wave, so nothing of one wave's play carries to the
 * next.
 */
export class WavePlay {
  /** The time the steps run by, carried from one frame to the next. */
  private readonly clock = createFieldClock();
  /** The frame the scene draws, written again as the field moves on. */
  private readonly shown: Frame;
  /** The serial of the last of the field's events handed on. */
  private heard = 0;
  /** The time since the wave was cleared or the run ended, while a card waits to open, or null. */
  private sinceDone: number | null = null;

  /** Plays a field, its specks strewn from the run's seed. */
  constructor(
    readonly field: Field,
    seed: number,
  ) {
    this.shown = { field, alpha: 0, events: field.events, seed };
  }

  /**
   * Returns the field to draw, as it now stands: one record for the wave,
   * written again as the field moves on, so drawing a frame allocates
   * nothing.
   */
  frame(): FieldFrame {
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
    hear: (event: Readonly<FieldEvent>) => void,
  ): void {
    steerField(this.field, steer);
    const steps = advanceClock(this.clock, deltaMs);
    for (let i = 0; i < steps; i++) stepField(this.field);
    this.shown.alpha = progressOf(this.clock);
    this.field.events.forEachSince(this.heard, hear);
    this.heard = this.field.events.latest;
  }

  /** Starts the wait before a card opens, as the wave is cleared or the run ends. */
  startCardWait(): void {
    this.sinceDone = 0;
  }

  /**
   * Counts a frame's time toward the card's wait, and returns whether the
   * card opens now, which it does once; call it once a frame.
   */
  countCardWait(deltaMs: number, waitMs: number): boolean {
    if (this.sinceDone === null) return false;
    this.sinceDone += deltaMs;
    if (this.sinceDone < waitMs) return false;
    this.sinceDone = null;
    return true;
  }
}
