import { EventLog, type NumberedEvent } from "@fz/core/event_log";
import type { PickupId } from "../catalog/pickups";
import type { RockKindId, RockSize } from "../catalog/rocks";
import type { WeaponId } from "../catalog/weapons";
import type { Crew, Pilot } from "../ship/pilots";

/**
 * Names something that happened at a place on the field, its event naming
 * little else: a dash's way, a pull's weapon.
 */
export type PlaceEventKind =
  /** The ship fired a pull of its weapon, which its event names. */
  | "fired"
  /** The ship started a dash. */
  | "dashed"
  /** A rock touched the shielded ship, and the shield went. */
  | "shielded"
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

/**
 * Names something that happened to a pilot, which its event names.
 *
 * A stray caught is one brought home, whether it joined the line or went
 * straight home, and counts where the run counts strays brought home; one
 * of the crew that floats home counts in none of them.
 */
export type PilotEventKind =
  /** A hit with no one in tow ended the run, and the pilot at the controls bailed out home. */
  | "lost"
  /** A hit knocked the last in tow loose, the way the blow came. */
  | "knocked"
  /** The ship caught one knocked loose again, back at the line in tow's end. */
  | "recaught"
  /**
   * One knocked loose floated home, out of the run: its time ran out, the
   * run ended, or the ship caught it with the most in tow.
   */
  | "floated"
  /** A stray came in at an edge. */
  | "strayed"
  /** The ship caught a stray, which joined the line in tow's end. */
  | "joined"
  /** The ship caught a stray with the most in tow, which went straight home. */
  | "home";

/** Names points scored at a place, a break's or a stray's, which its event says. */
export type ScoreEventKind = "scored";

/** Names a spark gathered, at its place, by the pod or a bubble in tow, which its event says. */
export type SparkEventKind = "sparked";

/** Names something that happened to the pilot's static, at the ship, which its event says. */
export type StaticEventKind =
  /** Static came to another step, up or down: the multiplier's, or full. */
  "stepped";

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
  | ScoreEventKind
  | SparkEventKind
  | StaticEventKind;

/** Records something that happened on the field, and where. */
export interface FieldEvent extends NumberedEvent {
  kind: FieldEventKind;
  /** Where it happened, in field units. */
  x: number;
  y: number;
  /**
   * The kind of rock it happened to, for its ink and its sound, or null for an
   * event of no rock.
   */
  rock: RockKindId | null;
  size: RockSize | null;
  /** The pickup it happened to, or null for an event of none. */
  pickup: PickupId | null;
  /** The weapon that fired, for its shot's sound, or null for an event of none. */
  weapon: WeaponId | null;
  /** The pilot it happened to, or who gathered a spark, or null for an event of none. */
  pilot: Pilot | null;
  /** How many ride in tow as an event of a pilot leaves the crew, 0 for any other event. */
  inTow: number;
  /**
   * Whether no one is at the controls as an event of a pilot leaves the
   * crew, the run over: the hit that ended it, and each of the crew knocked
   * loose floating home with it; false for any other event.
   */
  runOver: boolean;
  /** The points it scored before static's multiplier, 0 for an event that scored none. */
  points: number;
  /**
   * Static's multiplier it scored at, a rock's break's among them, 0 for an
   * event that scored none, as a rock a comet smashed.
   */
  times: number;
  /** How far a blast reaches, 0 for any other event. */
  reach: number;
  /**
   * The step static came to as it stepped, 0 for any other event: the
   * multiplier's, from 0 at ×1, and full past them.
   */
  step: number;
  /** Whether static fell to its step rather than rising to it; false for any other event. */
  fell: boolean;
  /**
   * The slot of the rock it happened to, where a hit it holds flashes, or −1
   * for an event of no rock.
   */
  slot: number;
  /**
   * The way it went, a share along each axis: the blow that broke a rock,
   * for the field's kick, the one that knocked one of the crew loose, or
   * the ship as it dashed, for its trail; 0 along both
   * for a blow that came no way, and for any other event.
   */
  wayX: number;
  wayY: number;
}

/**
 * How many events the log keeps: far more than a frame's steps make, a
 * blast reaching a crowd of rocks among them.
 */
export const EVENT_LOG_SIZE = 512;

/**
 * A record of no event, but for its serial, which each event's record
 * starts from, so nothing of an older event is left in it.
 */
const BLANK_EVENT: Readonly<Omit<FieldEvent, "serial">> = Object.freeze({
  kind: "hit",
  x: 0,
  y: 0,
  rock: null,
  size: null,
  pickup: null,
  weapon: null,
  pilot: null,
  inTow: 0,
  runOver: false,
  points: 0,
  times: 0,
  reach: 0,
  step: 0,
  fell: false,
  slot: -1,
  wayX: 0,
  wayY: 0,
});

/** Returns a record for the log's ring, before an event fills it. */
function blankEvent(): FieldEvent {
  return { serial: 0, ...BLANK_EVENT };
}

/** Writes the way a blow came into an event, a share along each axis, or none for a blow of no length. */
function setWay(event: FieldEvent, alongX: number, alongY: number): void {
  const along = Math.hypot(alongX, alongY);
  if (along === 0) return;
  event.wayX = alongX / along;
  event.wayY = alongY / along;
}

/** Keeps the field's latest events, for the scene to play and the shell to hear. */
export class FieldEventLog extends EventLog<FieldEvent> {
  constructor() {
    super(EVENT_LOG_SIZE, blankEvent);
  }

  /** Records an event of nothing but its place. */
  add(
    kind: Exclude<PlaceEventKind, "dashed" | "fired">,
    x: number,
    y: number,
  ): void {
    this.record(kind, x, y);
  }

  /** Records a pull of fire, at the ship's place, with the weapon that fired it. */
  addFired(x: number, y: number, weapon: WeaponId): void {
    this.record("fired", x, y).weapon = weapon;
  }

  /** Records the ship starting a dash, at its place, and the way it heads, in radians. */
  addDash(x: number, y: number, heading: number): void {
    const event = this.record("dashed", x, y);
    event.wayX = Math.cos(heading);
    event.wayY = Math.sin(heading);
  }

  /**
   * Records an event that happened to a rock but its break, at its place, with
   * its kind, size and slot and, for a blast, its reach.
   */
  addRock(
    kind: Exclude<RockEventKind, "broken">,
    rock: LoggedRock,
    reach = 0,
  ): void {
    this.recordRock(kind, rock).reach = reach;
  }

  /**
   * Records a rock broken, at its place, with its kind, size and slot,
   * static's multiplier it scored at, 0 for one that scored nothing, and
   * the way the blow came: `alongX` and `alongY`, of any length, or both 0
   * for none.
   */
  addBreak(
    rock: LoggedRock,
    times: number,
    alongX: number,
    alongY: number,
  ): void {
    const event = this.recordRock("broken", rock);
    event.times = times;
    setWay(event, alongX, alongY);
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

  /** Records an event that happened to a pilot but a knock, and how many ride in tow as it leaves the crew. */
  addPilot(
    kind: Exclude<PilotEventKind, "knocked">,
    x: number,
    y: number,
    pilot: Pilot,
    crew: Crew,
  ): void {
    this.recordPilot(kind, x, y, pilot, crew);
  }

  /**
   * Records one of the crew knocked loose, at the ship, with how many ride
   * in tow as it leaves the crew and the way the blow came: `alongX` and
   * `alongY`, of any length, or both 0 for none.
   */
  addKnocked(
    x: number,
    y: number,
    pilot: Pilot,
    crew: Crew,
    alongX: number,
    alongY: number,
  ): void {
    const event = this.recordPilot("knocked", x, y, pilot, crew);
    setWay(event, alongX, alongY);
  }

  /** Records points scored at a place, before static's multiplier, and the multiplier. */
  addScore(x: number, y: number, points: number, times: number): void {
    const event = this.record("scored", x, y);
    event.points = points;
    event.times = times;
  }

  /**
   * Records a spark gathered, at its place, with the pilot who gathered it,
   * at the controls or in tow, its points before static's multiplier, and
   * the multiplier.
   */
  addSpark(
    x: number,
    y: number,
    pilot: Pilot,
    points: number,
    times: number,
  ): void {
    const event = this.record("sparked", x, y);
    event.pilot = pilot;
    event.points = points;
    event.times = times;
  }

  /** Records static coming to another step, at the ship, and whether it fell to it. */
  addStep(x: number, y: number, step: number, fell: boolean): void {
    const event = this.record("stepped", x, y);
    event.step = step;
    event.fell = fell;
  }

  /**
   * Returns the next record for an event of a pilot, its kind, place and
   * pilot, how many ride in tow and whether the run is over filled in.
   */
  private recordPilot(
    kind: PilotEventKind,
    x: number,
    y: number,
    pilot: Pilot,
    crew: Crew,
  ): FieldEvent {
    const event = this.record(kind, x, y);
    event.pilot = pilot;
    event.inTow = crew.tow.length;
    event.runOver = crew.pilot === null;
    return event;
  }

  /**
   * Returns the next record for an event of a rock, its kind and the rock's
   * place, kind, size and slot filled in.
   */
  private recordRock(kind: RockEventKind, rock: LoggedRock): FieldEvent {
    const event = this.record(kind, rock.x, rock.y);
    event.rock = rock.kind;
    event.size = rock.size;
    event.slot = rock.slot;
    return event;
  }

  /**
   * Returns the next record, its kind and place filled in and nothing of an
   * older event left in it.
   */
  private record(kind: FieldEventKind, x: number, y: number): FieldEvent {
    const event = Object.assign(this.next(), BLANK_EVENT);
    event.kind = kind;
    event.x = x;
    event.y = y;
    return event;
  }
}
