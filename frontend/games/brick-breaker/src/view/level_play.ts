import { Countdown } from "@fz/core/clock";
import {
  FieldPlay,
  type FieldRules,
  type PlayFrame,
} from "@fz/core/field_play";
import type { FieldEvent } from "../rules/field/events";
import { type Field, serve, steerField, stepField } from "../rules/field/field";
import {
  type ServeGuide,
  createServeGuide,
  serveGuide,
} from "../rules/field/guide";
import { createFieldClock } from "../rules/stepper";
import { SERVE_MS } from "./effects/timing";
import type { FieldFrame } from "./field/frame";
import type { PlayerSteer } from "./steering/steering";

/** Describes the frame the scene is handed: one record whose `alpha` and `guide` each frame writes again. */
interface Frame extends FieldFrame, PlayFrame {
  readonly field: Field;
  alpha: number;
  guide: Readonly<ServeGuide> | null;
}

/** How the rules move a level's field on. */
const LEVEL_RULES: FieldRules<Field, PlayerSteer> = {
  steer: steerField,
  step: stepField,
};

/**
 * Plays a level's field, as `FieldPlay` plays a field, by the rules and
 * their clock, hands the scene the serve's guide while it shows, and serves
 * again once a lost ball has had its beat.
 *
 * Make one for each level, so nothing of one level's play carries to the
 * next.
 */
export class LevelPlay extends FieldPlay<
  Field,
  PlayerSteer,
  FieldEvent,
  Frame
> {
  /** The beat the paddle stands empty for once the last ball is lost. */
  private readonly beforeServe = new Countdown();
  /** The frame the scene draws, whose guide the play writes. */
  private readonly written: Frame;
  /** The serve's guide, made with the play and written again each frame it shows. */
  private readonly guide = createServeGuide();

  constructor(field: Field) {
    const written: Frame = {
      field,
      alpha: 0,
      events: field.events,
      guide: null,
    };
    super(field, LEVEL_RULES, createFieldClock(), written);
    this.written = written;
  }

  /**
   * Steers and steps the field as `FieldPlay` does, then hands the scene
   * the serve's guide as the field now stands, while the steering says it
   * shows and the field serves, or none.
   */
  override advance(
    deltaMs: number,
    steer: Readonly<PlayerSteer>,
    hear: (event: Readonly<FieldEvent>) => void,
  ): void {
    super.advance(deltaMs, steer, hear);
    const shows = steer.showsGuide === true && this.field.state === "serve";
    if (shows) serveGuide(this.field, this.guide);
    this.written.guide = shows ? this.guide : null;
  }

  /** Puts the next ball on the paddle once the last one lost has had its beat. */
  serveAfterLoss(deltaMs: number): void {
    if (this.field.state !== "lost") return;
    if (!this.beforeServe.running) this.beforeServe.start();
    if (this.beforeServe.count(deltaMs, SERVE_MS)) serve(this.field);
  }
}
