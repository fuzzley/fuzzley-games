import {
  FieldPlay,
  type FieldRules,
  type PlayFrame,
} from "@fz/core/field_play";
import type { FieldEvent } from "../rules/field/events";
import { type Field, steerField, stepField } from "../rules/field/field";
import type { Steer } from "../rules/ship/ship";
import { createFieldClock } from "../rules/stepper";
import type { Place } from "../rules/torus";
import type { FieldFrame } from "./field/frame";

/** Describes the frame the scene is handed, one record whose `alpha` each frame writes again. */
type Frame = FieldFrame & PlayFrame;

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
  /** Plays a field, its specks strewn from the run's seed, and its constellation where an Endless wave lays it. */
  constructor(
    field: Field,
    seed: number,
    constellation: Readonly<Place> | null = null,
  ) {
    super(field, WAVE_RULES, createFieldClock(), {
      field,
      alpha: 0,
      events: field.events,
      seed,
      constellation,
    });
  }
}
