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
  | "home"
  /** The crew gained a ship, by points or an Extra ship, and its pilot flies it. */
  | "gained";

/** Names points scored at a place, a break's or a stray's, which its event says. */
export type ScoreEventKind = "scored";

/** Describes a rock as its events record it, as the rocks' slots hold it. */
export interface LoggedRock {
  readonly x: number;
  readonly y: number;
  readonly kind: RockKindId;
  readonly size: RockSize;
  /** Its slot among the field's, which the scene draws it in. */
  readonly slot: number;
}

/** Names something that happened on the field, for the scene to play. */
export type FieldEventKind =
  | PlaceEventKind
  | RockEventKind
  | PickupEventKind
  | PilotEventKind
  | ScoreEventKind;

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
  /** The points it scored before the chain's multiplier, 0 for an event that scored none. */
  points: number;
  /** The chain's multiplier it scored at, 0 for an event that scored none. */
  times: number;
  /** How far a blast or the Nova reaches, 0 for any other event. */
  reach: number;
  /** The count a broken rock is in its chain, 0 for one smashed, which counts in none, and for any other event. */
  chain: number;
  /** The slot of the rock it happened to, where a hit it holds flashes, or −1 for an event of no rock. */
  slot: number;
  /**
   * The way it went, a share along each axis: the blow that broke a rock,
   * for the field's kick, or the ship as it dashed, for its trail; 0 along
   * both for a blow that came no way, and for any other event.
   */
  wayX: number;
  wayY: number;
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
    points: 0,
    times: 0,
    reach: 0,
    chain: 0,
    slot: -1,
    wayX: 0,
    wayY: 0,
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
  add(
    kind: Exclude<PlaceEventKind, "nova" | "dashed">,
    x: number,
    y: number,
  ): void;
  add(kind: PlaceEventKind, x: number, y: number, reach = 0): void {
    this.record(kind, x, y).reach = reach;
  }

  /** Records the ship starting a dash, at its place, and the way it heads, in radians. */
  addDash(x: number, y: number, heading: number): void {
    const event = this.record("dashed", x, y);
    event.wayX = Math.cos(heading);
    event.wayY = Math.sin(heading);
  }

  /** Records an event that happened to a rock but its break, at its place, with its kind, size and slot and, for a blast, its reach. */
  addRock(
    kind: Exclude<RockEventKind, "broken">,
    rock: LoggedRock,
    reach = 0,
  ): void {
    this.recordRock(kind, rock).reach = reach;
  }

  /**
   * Records a rock broken, at its place, with its kind, size and slot, the
   * count it is in its chain, and the way the blow came: `alongX` and
   * `alongY`, of any length, or both 0 for none.
   */
  addBreak(
    rock: LoggedRock,
    chain: number,
    alongX: number,
    alongY: number,
  ): void {
    const event = this.recordRock("broken", rock);
    event.chain = chain;
    const along = Math.hypot(alongX, alongY);
    if (along === 0) return;
    event.wayX = alongX / along;
    event.wayY = alongY / along;
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

  /** Records points scored at a place, before the chain's multiplier, and the multiplier. */
  addScore(x: number, y: number, points: number, times: number): void {
    const event = this.record("scored", x, y);
    event.points = points;
    event.times = times;
  }

  /** Returns the next record for an event of a rock, its kind and the rock's place, kind, size and slot filled in. */
  private recordRock(kind: RockEventKind, rock: LoggedRock): FieldEvent {
    const event = this.record(kind, rock.x, rock.y);
    event.rock = rock.kind;
    event.size = rock.size;
    event.slot = rock.slot;
    return event;
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
    event.points = 0;
    event.times = 0;
    event.reach = 0;
    event.chain = 0;
    event.slot = -1;
    event.wayX = 0;
    event.wayY = 0;
    return event;
  }
}
