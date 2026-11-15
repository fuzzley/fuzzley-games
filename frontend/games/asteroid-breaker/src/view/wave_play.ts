import {
  FieldPlay,
  type FieldRules,
  type PlayFrame,
} from "@fz/core/field_play";
import type { FieldEvent } from "../rules/field/events";
import { type Field, steerField, stepField } from "../rules/field/field";
import { STILL, type Steer } from "../rules/ship/ship";
import { createFieldClock } from "../rules/stepper";
import type { Place } from "../rules/torus";
import { holdMsOf } from "./effects/effects";
import type { FieldFrame } from "./field/frame";
import { PLACE_IDS, type PlaceId } from "./places/places";

/** Describes the frame the scene is handed, one record whose `alpha` each frame writes again. */
type Frame = FieldFrame & PlayFrame;

/** Describes who hears a field's events, each once. */
type Hear = (event: Readonly<FieldEvent>) => void;

/** How the rules move a wave's field on. */
const WAVE_RULES: FieldRules<Field, Steer> = {
  steer: steerField,
  step: stepField,
};

/**
 * Plays a wave's field, as `FieldPlay` plays a field, by the rules and
 * their clock, handing the scene the run's seed and the wave's place with
 * it, and holds the field still where motion is welcome as an event calls
 * for.
 *
 * Make one for each wave, so nothing of one wave's play carries to the
 * next.
 */
export class WavePlay extends FieldPlay<Field, Steer, FieldEvent, Frame> {
  /** How much longer the field holds still, in milliseconds. */
  private heldMs = 0;
  /** Who hears the field's events this frame, as the frame handed them, or null before the first. */
  private hearer: Hear | null = null;
  /** Whether a fire or a dash pressed in a frame that held still is kept for the field's next step. */
  private keeping = false;
  /** The steering handed the field while presses are kept, written each frame. */
  private readonly kept: Steer = { ...STILL };

  /**
   * Plays a field in its sector's place, the first's unless told, its stars
   * strewn from the run's seed, and its constellation where an Endless wave
   * lays it.
   */
  constructor(
    field: Field,
    seed: number,
    constellation: Readonly<Place> | null = null,
    place: PlaceId = PLACE_IDS[0],
  ) {
    super(field, WAVE_RULES, createFieldClock(), {
      field,
      alpha: 0,
      events: field.events,
      seed,
      constellation,
      place,
    });
  }

  /**
   * Moves the field on as `FieldPlay` does, but for the time it still holds
   * still, which passes first; where motion is welcome, an event heard
   * holds it still from the next frame, for as long as `holdMsOf()` says.
   * A fire or a dash pressed while it holds still is kept for its next
   * step, so a tap made and let go within the hold isn't lost.
   */
  override advance(
    deltaMs: number,
    steer: Readonly<Steer>,
    hear: Hear,
    motion = false,
  ): void {
    // A frame of no time, less, or not a number holds none, as the clock
    // takes none from it.
    const held = deltaMs > 0 ? Math.min(this.heldMs, deltaMs) : 0;
    this.heldMs -= held;
    this.hearer = hear;
    const steps = this.field.steps;
    super.advance(
      deltaMs - held,
      this.keep(steer, held > 0),
      motion ? this.hearHeld : hear,
    );
    if (this.field.steps !== steps) this.keeping = false;
  }

  /**
   * Returns the steering to hand the field: as the frame steers it, but,
   * from a frame that held still until the field next steps, with each fire
   * and dash pressed since kept pressed.
   */
  private keep(steer: Readonly<Steer>, holding: boolean): Readonly<Steer> {
    const { kept } = this;
    if (holding && !this.keeping) {
      this.keeping = true;
      kept.fire = false;
      kept.dash = false;
    }
    if (!this.keeping) return steer;
    const { fire, dash } = kept;
    Object.assign(kept, steer);
    kept.fire ||= fire;
    kept.dash ||= dash;
    return kept;
  }

  /** Holds the field still for as long as an event calls for, and hands it on to be heard. */
  private readonly hearHeld = (event: Readonly<FieldEvent>): void => {
    this.heldMs = Math.max(this.heldMs, holdMsOf(event));
    this.hearer?.(event);
  };
}
