import { EventLog, type NumberedEvent } from "@fz/core/event_log";
import type { RockKindId, RockSize } from "./catalog/rocks";

/** Names something that happened on the field, for the scene to play. */
export type FieldEventKind =
  /** A rock took a hit and holds. */
  | "hit"
  /** A rock that rings took a hit and holds, so it rang. */
  | "rung"
  /** A rock broke. */
  | "broken"
  /** A broken rock that blasts went off. */
  | "blast";

/** Records something that happened on the field, and where. */
export interface FieldEvent extends NumberedEvent {
  kind: FieldEventKind;
  /** Where it happened, in field units. */
  x: number;
  y: number;
  /** The kind of rock it happened to, for its ink and its sound. */
  rock: RockKindId;
  size: RockSize;
  /** How far a blast reaches, 0 for any other event. */
  reach: number;
}

/**
 * How many events the log keeps: far more than a frame's steps make, a
 * blast reaching a crowd of rocks among them.
 */
export const EVENT_LOG_SIZE = 512;

/** Returns a record for the log's ring, before an event fills it. */
function blankEvent(): FieldEvent {
  return {
    serial: 0,
    kind: "hit",
    x: 0,
    y: 0,
    rock: "stone",
    size: "small",
    reach: 0,
  };
}

/** Keeps the field's latest events, for the scene to play and the shell to hear. */
export class FieldEventLog extends EventLog<FieldEvent> {
  constructor() {
    super(EVENT_LOG_SIZE, blankEvent);
  }

  /** Records an event that happened to a rock. */
  add(
    kind: FieldEventKind,
    x: number,
    y: number,
    rock: RockKindId,
    size: RockSize,
    reach = 0,
  ): void {
    const event = this.next();
    event.kind = kind;
    event.x = x;
    event.y = y;
    event.rock = rock;
    event.size = size;
    event.reach = reach;
  }
}
