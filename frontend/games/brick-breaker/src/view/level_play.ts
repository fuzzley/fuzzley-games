import { FieldPlay, type FieldRules } from "@fz/core/field_play";
import type { FieldEvent } from "../rules/field/events";
import { type Field, serve, steerField, stepField } from "../rules/field/field";
import type { Steer } from "../rules/paddle/paddle";
import { createFieldClock } from "../rules/stepper";
import type { FieldFrame } from "./field/frame";
import { SERVE_MS } from "./effects/timing";

/** Describes the frame the scene is handed, one record whose `alpha` each frame writes again. */
interface Frame extends FieldFrame {
  alpha: number;
}

/** How the rules move a level's field on. */
const LEVEL_RULES: FieldRules<Field, Steer> = {
  steer: steerField,
  step: stepField,
};

/**
 * Plays a level's field, as `FieldPlay` plays a field, by the rules and
 * their clock, and serves again once a lost ball has had its beat.
 *
 * Make one for each level, so nothing of one level's play carries to the
 * next.
 */
export class LevelPlay extends FieldPlay<Field, Steer, FieldEvent, Frame> {
  /** The time the paddle has stood empty since the last ball was lost. */
  private sinceLost = 0;

  constructor(field: Field) {
    super(field, LEVEL_RULES, createFieldClock(), {
      field,
      alpha: 0,
      events: field.events,
    });
  }

  /** Puts the next ball on the paddle once the last one lost has had its beat. */
  serveAfterLoss(deltaMs: number): void {
    if (this.field.state !== "lost") return;
    this.sinceLost += deltaMs;
    if (this.sinceLost < SERVE_MS) return;
    serve(this.field);
    this.sinceLost = 0;
  }
}
