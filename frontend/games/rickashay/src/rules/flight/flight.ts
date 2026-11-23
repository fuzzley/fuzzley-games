// A round's flight, from the release to the landing, worked out whole on the
// round's one clock of @fz/brick-wall/rules/track, as events.ts describes
// it: the one fuzzball flies from its start along its aim's heading, and
// cast() finds what it meets next and how far off. At each moment it turns
// once, as C3 has it: every flat it met mirrors it, then a long 45° face
// it still flies into swaps its two speeds, and a corner's cut swaps them
// only where nothing else turned it. So it keeps to its aim's eight
// headings, by changes of sign and swaps alone, for as long as it flies.
//
// A flight's state is made as it starts, and what the fuzzball meets is
// cast into one record the module keeps, so a cast makes nothing; records
// are made only as events are.

import { AIMS } from "@fz/brick-wall/rules/aims";
import { COLUMNS, RADIUS, SIDE_MARGIN } from "@fz/brick-wall/rules/field";
import { columnOf, fieldRowOf } from "@fz/brick-wall/rules/grid";
import type { Waypoint } from "@fz/brick-wall/rules/track";
import { clamp } from "@fz/core/math";
import type { Wall } from "../catalog/kinds";
import type { Shot } from "../shot";
import type { FlightRules } from "../tuning";
import {
  type CastField,
  type Contacts,
  cast,
  castField,
  createContacts,
} from "./cast";
import type { Flight, FlightEvent, RoundStart, TurnOff } from "./events";
import { type Face, type FaceOwner, SHAPE } from "./faces";

/** Describes a flight flown, and the wall it leaves. */
export interface Flown {
  readonly flight: Flight;
  /** The wall as the flight leaves it, which is the wall it was handed until a strike takes hits. */
  readonly wall: Wall;
}

/** A 45° face, one of the faces. */
type Slant = Extract<Face, { readonly kind: "slant" }>;

/** Which of what a turn met its `off` names, the lowest first: a brick, a hatch's bar, a side wall, the ceiling, the floor. */
const OFF_ORDER: Readonly<Record<TurnOff, number>> = {
  brick: 0,
  bar: 1,
  wall: 2,
  ceiling: 3,
  floor: 4,
};

// What the fuzzball meets is cast into this record, and its faces listed in
// this one, each made once, as no two flights fly at once.
const contacts: Contacts = createContacts();
const faces: Face[] = [];

/**
 * Returns the flight of a round's shot, flown from where the fuzzball
 * waits along its aim until it lands, and the wall it leaves; the wall it
 * is handed it leaves as it was.
 *
 * It throws a `RangeError` for an aim that isn't one of the 657.
 */
export function fly(start: RoundStart, shot: Shot, rules: FlightRules): Flown {
  const heading = AIMS[shot.aim];
  if (heading === undefined) {
    throw new RangeError(`No aim is numbered ${String(shot.aim)}.`);
  }
  return new Flying(start, heading, rules).fly();
}

/** Flies a flight through, keeping its state. */
class Flying {
  private readonly field: CastField;
  private x: number;
  private y = RADIUS;
  private dx: number;
  private dy: number;
  /** Units flown since the release: the moment the fuzzball is at. */
  private at = 0;
  private turns = 0;
  private landed = false;
  private readonly waypoints: Waypoint[];
  private readonly events: FlightEvent[] = [];
  /** The wall cells the moment met, floor up and then left to right, each once. */
  private readonly cells: number[] = [];

  constructor(
    private readonly start: RoundStart,
    [dx, dy]: readonly [number, number],
    private readonly rules: FlightRules,
  ) {
    this.field = castField(start.wall, start.depth);
    this.x = start.x;
    this.dx = dx;
    this.dy = dy;
    this.waypoints = [{ at: 0, x: this.x, y: this.y }];
  }

  /** Flies the flight through and returns it with the wall it leaves. */
  fly(): Flown {
    while (!this.landed) {
      this.flyOn();
    }
    const flight: Flight = {
      track: { ball: 0, role: "player", waypoints: this.waypoints },
      events: this.events,
      held: 0,
      length: this.at,
      rally: 0,
      turns: this.turns,
      marks: [],
      lastStrike: null,
    };
    return { flight, wall: this.start.wall };
  }

  /**
   * Flies the fuzzball on to what it meets next and plays that moment, or,
   * where it would fly past the longest flight first, flies it to there
   * and brings it home.
   */
  private flyOn(): void {
    const home = this.rules.longest;
    const met = cast(
      this.field,
      this.x,
      this.y,
      this.dx,
      this.dy,
      // A portal's eye is passed as air.
      false,
      contacts,
    );
    if (this.at + met.distance > home) {
      this.comeHome(home);
      return;
    }
    this.x = met.x;
    this.y = met.y;
    this.at += met.distance;
    this.meet(met);
  }

  /**
   * Plays what the fuzzball meets at a moment: it lands on the floor;
   * otherwise it turns once, off everything it met.
   */
  private meet(met: Contacts): void {
    faces.length = 0;
    let floor = false;
    for (let index = 0; index < met.count; index++) {
      const contact = met.met[index];
      if (contact !== undefined) {
        faces.push(contact.face);
        floor ||= contact.face.kind === "floor";
      }
    }
    if (floor) {
      this.land();
      return;
    }
    const off = this.turn();
    if (off !== null) {
      this.turns++;
      const { at, x, y, dx, dy } = this;
      this.events.push({
        at,
        kind: "turn",
        x,
        y,
        dx,
        dy,
        off,
        cells: [...this.cells],
      });
      this.waypoint();
    }
  }

  /**
   * Turns the fuzzball off the faces it met at its moment, as C3 turns it,
   * and returns what it turned off, or null where nothing turned it; and
   * lists the wall cells of the bricks and bars it met in {@link cells}.
   *
   * Every flat mirrors it: a flat up changes the sign of its speed across,
   * and a flat across or a hatch's bar that of its speed up, once however
   * many met it. Then each long 45° face it still flies into swaps
   * its two speeds; and only where nothing has turned it does the first
   * corner's cut it met.
   */
  private turn(): TurnOff | null {
    this.cells.length = 0;
    let flipX = false;
    let flipY = false;
    let off: TurnOff | null = null;
    for (const face of faces) {
      switch (face.kind) {
        case "flat":
          if (face.along === "up") {
            flipX = true;
          } else {
            flipY = true;
          }
          break;
        case "bar":
          flipY = true;
          break;
        case "slant":
        case "floor":
        case "eye":
          break;
      }
      const by = this.offOf(face);
      if (by !== null && (off === null || OFF_ORDER[by] < OFF_ORDER[off])) {
        off = by;
      }
    }
    if (flipX) {
      this.dx = -this.dx;
    }
    if (flipY) {
      this.dy = -this.dy;
    }
    let turned = flipX || flipY;
    let cut: Slant | null = null;
    for (const face of faces) {
      if (face.kind !== "slant") {
        continue;
      }
      if (!face.long) {
        cut ??= face;
      } else if (face.facingX * this.dx + face.facingY * this.dy < 0) {
        this.swap(face);
        turned = true;
      }
    }
    if (!turned && cut !== null) {
      this.swap(cut);
      turned = true;
    }
    return turned ? off : null;
  }

  /**
   * Returns what a face met names as what a turn was off, or null for one
   * that turns nothing, and lists its brick's wall cell in {@link cells}
   * once: a hatch's bar, and the cuts across its ends, are its bar.
   */
  private offOf(face: Face): TurnOff | null {
    const owner: FaceOwner | null =
      face.kind === "floor" || face.kind === "eye" ? null : face.owner;
    if (owner?.kind === "brick") {
      return this.brickMet(owner.cell);
    }
    return owner?.kind ?? null;
  }

  /** Lists a wall cell the moment met in {@link cells}, once, and returns what a turn off it is off: a brick, or a hatch's bar. */
  private brickMet(cell: number): TurnOff {
    if (this.cells.at(-1) !== cell) {
      this.cells.push(cell);
    }
    return this.isHatch(cell) ? "bar" : "brick";
  }

  /** Returns whether a wall cell in the field holds a hatch, still shut. */
  private isHatch(cell: number): boolean {
    const { shapes } = this.field;
    const row = fieldRowOf(this.field, cell);
    return shapes[row * COLUMNS + columnOf(cell)] === SHAPE.hatch;
  }

  /** Swaps the fuzzball's two speeds, with the signs that send it away from a 45° face. */
  private swap({ facingX, facingY }: Slant): void {
    const { dx, dy } = this;
    // Off a face along x + y = c, one that faces right and up or left and
    // down, each speed takes the other's with its sign changed.
    const sign = facingX === facingY ? -1 : 1;
    this.dx = sign * dy;
    this.dy = sign * dx;
  }

  /**
   * Brings the fuzzball home from where it flies at a moment, as the
   * longest flight its guard allows: it flies on to there, and drops
   * straight down to the floor through whatever lies between.
   */
  private comeHome(home: number): void {
    const flown = home - this.at;
    this.x += this.dx * flown;
    this.y += this.dy * flown;
    this.at = home;
    const { at, x, y } = this;
    this.events.push({ at, kind: "guard", x, y, by: "length" });
    this.waypoint();
    this.at += this.y - RADIUS;
    this.land();
  }

  /** Lands the fuzzball on the floor where it is, waiting no nearer a side wall than `SIDE_MARGIN`. */
  private land(): void {
    this.y = RADIUS;
    this.landed = true;
    this.events.push({
      at: this.at,
      kind: "land",
      x: clamp(this.x, SIDE_MARGIN, COLUMNS - SIDE_MARGIN),
    });
    this.waypoint();
  }

  /** Adds the fuzzball's place at the moment to its track, unless the track has a place at that moment already. */
  private waypoint(): void {
    const { at, x, y } = this;
    if (this.waypoints.at(-1)?.at !== at) {
      this.waypoints.push({ at, x, y });
    }
  }
}
