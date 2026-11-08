import { Countdown } from "@fz/core/clock";
import {
  FieldPlay,
  type FieldRules,
  type PlayFrame,
} from "@fz/core/field_play";
import type { FieldEvent } from "../rules/field/events";
import { type Field, serve, steerField, stepField } from "../rules/field/field";
import type { Steer } from "../rules/paddle/paddle";
import { createFieldClock } from "../rules/stepper";
import { SERVE_MS } from "./effects/timing";
import type { FieldFrame } from "./field/frame";

/** Describes the frame the scene is handed, one record whose `alpha` each frame writes again. */
type Frame = FieldFrame & PlayFrame;

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
  /** The beat the paddle stands empty for once the last ball is lost. */
  private readonly beforeServe = new Countdown();

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
    if (!this.beforeServe.running) this.beforeServe.start();
    if (this.beforeServe.count(deltaMs, SERVE_MS)) serve(this.field);
  }
}
