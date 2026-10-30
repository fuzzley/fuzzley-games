import type { FieldEvent } from "../rules/events";
import { type Field, serve, steerField, stepField } from "../rules/field";
import type { Steer } from "../rules/paddle";
import { advanceClock, createClock, progressOf } from "../rules/stepper";
import type { FieldFrame } from "./frame";
import { SERVE_MS } from "./timing";

/** Describes the frame the scene is handed, one record whose `alpha` each frame writes again. */
interface Frame extends FieldFrame {
  alpha: number;
}

/**
 * Plays a level's field: moves it on by the time the board's frames take,
 * steered as the player steers, hands on each event once, serves again once
 * a lost ball has had its beat, and waits out the beat before a card opens
 * over the level cleared or the run ended.
 *
 * Make one for each level, so nothing of one level's play carries to the
 * next.
 */
export class LevelPlay {
  /** The time the steps run by, carried from one frame to the next. */
  private readonly clock = createClock();
  /** The frame the scene draws, written again as the field moves on. */
  private readonly shown: Frame;
  /** The serial of the last of the field's events handed on. */
  private heard = 0;
  /** The time the paddle has stood empty since the last ball was lost. */
  private sinceLost = 0;
  /** The time since the level was cleared or the run ended, while a card waits to open, or null. */
  private sinceDone: number | null = null;

  constructor(readonly field: Field) {
    this.shown = { field, alpha: 0, events: field.events };
  }

  /**
   * Returns the field to draw, as it now stands: one record for the level,
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

  /** Puts the next ball on the paddle once the last one lost has had its beat. */
  serveAfterLoss(deltaMs: number): void {
    if (this.field.state !== "lost") return;
    this.sinceLost += deltaMs;
    if (this.sinceLost < SERVE_MS) return;
    serve(this.field);
    this.sinceLost = 0;
  }

  /** Starts the wait before a card opens, as the level is cleared or the run ends. */
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
