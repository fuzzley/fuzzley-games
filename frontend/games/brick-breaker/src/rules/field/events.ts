import { EventLog, type NumberedEvent } from "@fz/core/event_log";
import type { CapsuleId } from "../catalog/capsules";
import { OWN_INK } from "../paddle/balls";

/** Names something that happened on the field, for the scene to play. */
export type FieldEventKind =
  /** A ball left the paddle. */
  | "launched"
  /** A ball bounced off a wall. */
  | "wall"
  /** A ball bounced off the paddle. */
  | "paddle"
  /** A brick took a hit and holds. */
  | "hit"
  /** A brick broke. */
  | "broken"
  /** A broken brick that blasts went off. */
  | "blast"
  /** A broken brick grew back. */
  | "regrown"
  /** A cage broke and freed a friend, a ball more. */
  | "freed"
  /** A plated brick's underside turned a ball or spent a bolt, and took no hit. */
  | "plated"
  /** The level's last key broke, and every gate opened. */
  | "opened"
  /** A capsule began to fall. */
  | "dropped"
  /** The paddle caught a capsule. */
  | "caught"
  /** A capsule fell past the paddle. */
  | "missed"
  /** The paddle fired a pair of bolts. */
  | "fired"
  /** The net turned a ball back, and went. */
  | "netted"
  /** A ball fell past the floor. */
  | "lost"
  /** The last brick the level needs broke. */
  | "cleared"
  /** The paddle lent a ball it met the seeker. */
  | "seeking"
  /** A ball turned off a bumper, which took no hit. */
  | "bumped"
  /** A ball touched a portal, and came out of its twin, here. */
  | "portalled"
  /** A slider stepped a cell along its row, to here. */
  | "slid";

/** Records something that happened on the field, and where. */
export interface FieldEvent extends NumberedEvent {
  kind: FieldEventKind;
  /** Where it happened, in field units. */
  x: number;
  y: number;
  /** The cell of the brick it happened to, or -1. */
  cell: number;
  /** The capsule it happened to, or null. */
  capsule: CapsuleId | null;
  /**
   * How long the streak was as a brick broke, that brick counted, for its
   * sound's pitch; 0 for any other event.
   *
   * The scene plays an event after the field has moved on, so the event
   * keeps it.
   */
  streak: number;
  /**
   * The way a slider stepped, 1 right or -1 left; 0 for any other event.
   * The event keeps it, as a train may have turned by the time it plays.
   */
  way: number;
  /**
   * The ink a lost ball wore, for its fade; {@link OWN_INK} for any other
   * event.
   *
   * The event keeps it, as the ball's record may be put back in play by the
   * time it plays.
   */
  ink: number;
}

/** How many events the log keeps, far more than a frame's steps make. */
export const EVENT_LOG_SIZE = 256;

/** Returns a record for the log's ring, before an event fills it. */
function blankEvent(): FieldEvent {
  return {
    serial: 0,
    kind: "wall",
    x: 0,
    y: 0,
    cell: -1,
    capsule: null,
    streak: 0,
    way: 0,
    ink: OWN_INK,
  };
}

/** Keeps the field's latest events, for the scene to play and the shell to hear. */
export class FieldEventLog extends EventLog<FieldEvent> {
  constructor() {
    super(EVENT_LOG_SIZE, blankEvent);
  }

  /** Records an event. */
  add(
    kind: FieldEventKind,
    x: number,
    y: number,
    cell = -1,
    capsule: CapsuleId | null = null,
    streak = 0,
    way = 0,
    ink = OWN_INK,
  ): void {
    const event = this.next();
    event.kind = kind;
    event.x = x;
    event.y = y;
    event.cell = cell;
    event.capsule = capsule;
    event.streak = streak;
    event.way = way;
    event.ink = ink;
  }
}
