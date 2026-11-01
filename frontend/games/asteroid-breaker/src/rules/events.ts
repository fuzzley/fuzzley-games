import { EventLog, type NumberedEvent } from "@fz/core/event_log";
import type { PickupId } from "./catalog/pickups";
import type { RockKindId, RockSize } from "./catalog/rocks";
import type { Pilot } from "./pilots";

/** Names something that happened at a place on the field, which its event names nothing else of. */
export type PlaceEventKind =
  /** The ship fired a pull of its weapon. */
  | "fired"
  /** The ship started a dash. */
  | "dashed"
  /** A rock touched the shielded ship, and the shield went. */
  | "shielded"
  /** The Nova's ring swept out from the ship. */
  | "nova"
  /** A comet's warning began, at the edge it will come in by. */
  | "warned"
  /** The wave's last rock went, so the wave is cleared. */
  | "cleared";

/** Names something that happened to a rock, which its event names. */
export type RockEventKind =
  /** A rock took a hit and holds. */
  | "hit"
  /** A rock that rings took a hit and holds, so it rang. */
  | "rung"
  /** A rock broke. */
  | "broken"
  /** A broken rock that blasts went off. */
  | "blast";

/** Names something that happened to a pickup, which its event names. */
export type PickupEventKind =
  /** A broken rock let a pickup go. */
  | "dropped"
  /** The ship caught a pickup. */
  | "caught"
  /** A pickup's time ran out before the ship caught it. */
  | "faded";

/** Names something that happened to a pilot, which its event names. */
export type PilotEventKind =
  /** A rock or a comet took the ship, and its pilot bailed out. */
  | "lost"
  /** A stray came in at an edge. */
  | "strayed"
  /** The ship brought a stray home. */
  | "home";

/** Names something that happened on the field, for the scene to play. */
export type FieldEventKind =
  PlaceEventKind | RockEventKind | PickupEventKind | PilotEventKind;

/** Records something that happened on the field, and where. */
export interface FieldEvent extends NumberedEvent {
  kind: FieldEventKind;
  /** Where it happened, in field units. */
  x: number;
  y: number;
  /** The kind of rock it happened to, for its ink and its sound, or null for an event of no rock. */
  rock: RockKindId | null;
  size: RockSize | null;
  /** The pickup it happened to, or null for an event of none. */
  pickup: PickupId | null;
  /** The pilot it happened to, or null for an event of none. */
  pilot: Pilot | null;
  /** How far a blast or the Nova reaches, 0 for any other event. */
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
    rock: null,
    size: null,
    pickup: null,
    pilot: null,
    reach: 0,
  };
}

/** Keeps the field's latest events, for the scene to play and the shell to hear. */
export class FieldEventLog extends EventLog<FieldEvent> {
  constructor() {
    super(EVENT_LOG_SIZE, blankEvent);
  }

  /** Records the Nova's ring, with how far it reaches. */
  add(kind: "nova", x: number, y: number, reach: number): void;
  /** Records an event of nothing but its place. */
  add(kind: Exclude<PlaceEventKind, "nova">, x: number, y: number): void;
  add(kind: PlaceEventKind, x: number, y: number, reach = 0): void {
    this.record(kind, x, y).reach = reach;
  }

  /** Records an event that happened to a rock, with its kind and size and, for a blast, its reach. */
  addRock(
    kind: RockEventKind,
    x: number,
    y: number,
    rock: RockKindId,
    size: RockSize,
    reach = 0,
  ): void {
    const event = this.record(kind, x, y);
    event.rock = rock;
    event.size = size;
    event.reach = reach;
  }

  /** Records an event that happened to a pickup. */
  addPickup(
    kind: PickupEventKind,
    x: number,
    y: number,
    pickup: PickupId,
  ): void {
    this.record(kind, x, y).pickup = pickup;
  }

  /** Records an event that happened to a pilot. */
  addPilot(kind: PilotEventKind, x: number, y: number, pilot: Pilot): void {
    this.record(kind, x, y).pilot = pilot;
  }

  /** Returns the next record, its kind and place filled in and nothing of an older event left in it. */
  private record(kind: FieldEventKind, x: number, y: number): FieldEvent {
    const event = this.next();
    event.kind = kind;
    event.x = x;
    event.y = y;
    event.rock = null;
    event.size = null;
    event.pickup = null;
    event.pilot = null;
    event.reach = 0;
    return event;
  }
}
