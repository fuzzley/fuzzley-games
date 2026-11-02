import { FieldPlay, type FieldRules } from "@fz/core/field_play";
import type { FieldEvent } from "../rules/events";
import { type Field, steerField, stepField } from "../rules/field";
import type { Steer } from "../rules/ship";
import { createFieldClock } from "../rules/stepper";
import type { FieldFrame } from "./frame";

/** Describes the frame the scene is handed, one record whose `alpha` each frame writes again. */
interface Frame extends FieldFrame {
  alpha: number;
}

/** How the rules move a wave's field on. */
const WAVE_RULES: FieldRules<Field, Steer> = {
  steer: steerField,
  step: stepField,
};

/**
 * Plays a wave's field, as `FieldPlay` plays a field, by the rules and
 * their clock, handing the scene the run's seed with it.
 *
 * Make one for each wave, so nothing of one wave's play carries to the
 * next.
 */
export class WavePlay extends FieldPlay<Field, Steer, FieldEvent, Frame> {
  /** Plays a field, its specks strewn from the run's seed. */
  constructor(field: Field, seed: number) {
    super(field, WAVE_RULES, createFieldClock(), {
      field,
      alpha: 0,
      events: field.events,
      seed,
    });
  }
}
