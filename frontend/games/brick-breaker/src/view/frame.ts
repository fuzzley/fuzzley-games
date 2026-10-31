import type { Ball } from "../rules/balls";
import type { Bolt } from "../rules/bolts";
import type { Brick } from "../rules/bricks";
import type { Falling, InEffect } from "../rules/capsules";
import type { BallKindId } from "../rules/catalog/balls";
import type { EffectKind, PaddleMode } from "../rules/catalog/capsules";
import type { EventLog } from "../rules/events";
import type { FieldState } from "../rules/field";
import type { Paddle } from "../rules/paddle";

export type { FieldEvent, FieldEventKind } from "../rules/events";
export type { Steer } from "../rules/paddle";

/**
 * Describes the field as the view and the scene read it, which they can't
 * change: the rules' `Field` is one.
 */
export interface FieldView {
  readonly state: FieldState;
  /** How tall it is, from the top wall to the floor, in field units. */
  readonly height: number;
  /** A brick for each cell of the grid, row by row, null where there is none. */
  readonly bricks: readonly (Readonly<Brick> | null)[];
  /** How many bricks the level needs broken still. */
  readonly needed: number;
  /** The balls, in play and waiting. */
  readonly balls: readonly Readonly<Ball>[];
  readonly paddle: Readonly<Paddle>;
  /** The capsules falling, and those waiting to fall. */
  readonly falling: readonly Readonly<Falling>[];
  /** The bolts rising, and those waiting to be fired. */
  readonly bolts: readonly Readonly<Bolt>[];
  /** The effects in play, one for each group. */
  readonly effects: Readonly<Record<EffectKind, Readonly<InEffect>>>;
  /** The kind every ball in play is. */
  readonly ballKind: BallKindId;
  /** What the paddle does beyond turning the balls, or null. */
  readonly mode: PaddleMode | null;
  /** Whether a net under the paddle will turn back the next ball that falls. */
  readonly net: boolean;
  /** The bricks broken since the paddle last met a ball. */
  readonly streak: number;
  /** How many steps the field has taken, by which its timers run. */
  readonly steps: number;
}

/** Describes the field's log of events as the scene reads it: from a serial on, never adding to it. */
export type EventsView = Pick<EventLog, "latest" | "forEachSince">;

/** Describes the field between one step and the next. */
export interface FieldFrame {
  /** The field as of its last step. */
  readonly field: FieldView;
  /** How far the field is from its last step to its next, from 0 to 1. */
  readonly alpha: number;
  /**
   * What happened, each event numbered, for the scene to play the new ones
   * once; a new log comes with a new field, and stops what the last set off.
   */
  readonly events: EventsView;
}

/** Returns where a thing is drawn between its last place and its next, `alpha` of the way. */
export function between(last: number, next: number, alpha: number): number {
  return last + (next - last) * alpha;
}
