// A round's flight, from the release to the landing, worked out whole on the
// round's one clock of @fz/brick-wall/rules/track, as events.ts describes
// it: the one fuzzball flies from its start along its aim's heading, and
// cast() finds what it meets next and how far off. At each moment it turns
// once, as C3 has it: every flat it met mirrors it, then a long 45° face
// it still flies into swaps its two speeds, and a corner's cut swaps them
// only where nothing else turned it. So it keeps to its aim's eight
// headings, by changes of sign and swaps alone, for as long as it flies.
// It strikes each brick it met at the moment, floor up and then left to
// right, each once, as bricks/strike.ts says, their traits' rules running
// at the moments hooks.ts names. It lands at the floor, unless it holds a
// floor bounce, which it spends turning off the floor as off a flat; it
// earns them as its rally climbs FlightRules' ladder (C5), and as a
// brick's rules give one.
//
// A flight's state is made as it starts, and what the fuzzball meets is
// cast into one record the module keeps, so a cast makes nothing; records
// are made only as events are.

import { AIMS } from "@fz/brick-wall/rules/aims";
import { COLUMNS, RADIUS, SIDE_MARGIN } from "@fz/brick-wall/rules/field";
import {
  CEILINGWARD,
  FLOORWARD,
  LEFT,
  RIGHT,
  columnOf,
  fieldRowOf,
} from "@fz/brick-wall/rules/grid";
import type { Waypoint } from "@fz/brick-wall/rules/track";
import { clamp } from "@fz/core/math";
import { strike, takesStrikes } from "../bricks/strike";
import { type Brick, type Wall, kindOf } from "../catalog/kinds";
import type { Shot } from "../shot";
import { type FlightRules, RALLY_MARKS, bounceRally } from "../tuning";
import {
  type CastField,
  type Contacts,
  cast,
  castField,
  clearBrick,
  createContacts,
} from "./cast";
import type {
  EarnedBy,
  Flight,
  FlightEvent,
  RoundStart,
  TurnOff,
} from "./events";
import { type Face, SHAPE } from "./faces";
import type { Hooks, Struck, TraitRules } from "./hooks";

/** Describes a flight flown, and the wall it leaves. */
export interface Flown {
  readonly flight: Flight;
  /** The wall as the flight leaves it: each brick it broke gone, and each it struck with the hits it has left. */
  readonly wall: Wall;
}

/** A 45° face, one of the faces. */
type Slant = Extract<Face, { readonly kind: "slant" }>;

/** A face that turns a fuzzball and may belong to a brick: a flat, a 45° face or a hatch's bar. */
type TurningFace = Extract<Face, { readonly kind: "flat" | "slant" | "bar" }>;

/** Which of what a turn met its `off` names, the lowest first: a brick, a hatch's bar, a side wall, the ceiling, the floor. */
const OFF_ORDER: Readonly<Record<TurnOff, number>> = {
  brick: 0,
  bar: 1,
  wall: 2,
  ceiling: 3,
  floor: 4,
};

/** The rallies at which a flight marks the moment of its strike. */
const MARKS: readonly number[] = RALLY_MARKS;

// What the fuzzball meets is cast into this record, and its faces listed in
// this one, each made once, as no two flights fly at once.
const contacts: Contacts = createContacts();
const faces: Face[] = [];

/**
 * Returns the flight of a round's shot, flown from where the fuzzball
 * waits along its aim until it lands, by the rules' numbers and the bricks'
 * trait rules, and the wall it leaves; the wall it is handed it leaves as
 * it was.
 *
 * It throws a `RangeError` for an aim that isn't one of the 657.
 */
export function fly(
  start: RoundStart,
  shot: Shot,
  rules: FlightRules,
  traits: TraitRules,
): Flown {
  const heading = AIMS[shot.aim];
  if (heading === undefined) {
    throw new RangeError(`No aim is numbered ${String(shot.aim)}.`);
  }
  return new Flying(start, heading, rules, traits).fly();
}

/** Names the moment a brick's rules run at, which the hooks are made at: none, a brick's at a turn, or an eye's. */
type Moment = "none" | "brick" | "eye";

/** Flies a flight through, keeping its state, and is the hooks its bricks' rules change it by. */
class Flying implements Hooks {
  private readonly field: CastField;
  private x: number;
  private y = RADIUS;
  private dx: number;
  private dy: number;
  /** Units flown since the release: the moment the fuzzball is at. */
  private at = 0;
  /** Whether a portal's eye takes the fuzzball: not from crossing into one until it next turns. */
  private eyes = true;
  private turns = 0;
  private rally = 0;
  /** The floor bounces it was released with. */
  private readonly released: number;
  /** The floor bounces it holds. */
  private held: number;
  /** The rungs of the floor bounces' ladder its rally has reached. */
  private rungs = 0;
  /** The moment the bricks' rules run at, if they run. */
  private moment: Moment = "none";
  private readonly marks: number[] = [];
  private lastStrike: number | null = null;
  private landed = false;
  private readonly waypoints: Waypoint[];
  private readonly events: FlightEvent[] = [];
  /** Each wall cell's hits left. */
  private readonly hits: Float64Array;
  /** Whether each wall cell's brick is broken: 1 once it is. */
  private readonly broken: Uint8Array;
  /** The wall cells the moment met, floor up and then left to right, each once. */
  private readonly cells: number[] = [];
  /** The sides of each of {@link cells} that its faces the moment met lie along, as `FieldFace` bits. */
  private readonly sides: number[] = [];
  /** The sides of each of {@link cells} that its faces that turned the fuzzball lie along, or -1 where none of them did. */
  private readonly turning: number[] = [];

  constructor(
    private readonly start: RoundStart,
    [dx, dy]: readonly [number, number],
    private readonly rules: FlightRules,
    private readonly traits: TraitRules,
  ) {
    const { bricks } = start.wall;
    this.field = castField(start.wall, start.depth);
    this.hits = Float64Array.from(bricks, (brick) => brick?.hits ?? 0);
    this.broken = new Uint8Array(bricks.length);
    this.released = start.hot ? rules.hotBounces : 0;
    this.held = this.released;
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
      held: this.released,
      length: this.at,
      rally: this.rally,
      turns: this.turns,
      marks: this.marks,
      lastStrike: this.lastStrike,
    };
    return { flight, wall: this.wallLeft() };
  }

  /** Returns the wall as the flight leaves it: each brick it broke gone, and each it struck with the hits it has left. */
  private wallLeft(): Wall {
    const { wall } = this.start;
    return {
      ...wall,
      bricks: wall.bricks.map((brick, cell) => {
        if (brick === null || this.broken[cell] === 1) {
          return null;
        }
        const hits = this.hits[cell] ?? brick.hits;
        return hits === brick.hits ? brick : { ...brick, hits };
      }),
    };
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
      this.eyes,
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
   * Plays what the fuzzball meets at a moment: it lands on the floor,
   * unless it holds a floor bounce, which it spends there after the
   * moment's bricks; otherwise it turns once, off everything it met, and
   * meets each brick there; and it crosses into a portal's eye, passing
   * every eye as air from then until it next turns.
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
    if (floor && this.held === 0) {
      this.land();
      return;
    }
    const off = this.turn();
    if (off !== null) {
      this.turns++;
      this.eyes = true;
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
    for (let index = 0; index < this.cells.length; index++) {
      const cell = this.cells[index] ?? 0;
      const brick = this.start.wall.bricks[cell];
      const turning = this.turning[index] ?? -1;
      if (brick !== null && brick !== undefined) {
        this.meetBrick(
          cell,
          brick,
          turning < 0 ? (this.sides[index] ?? 0) : turning,
        );
      }
    }
    if (floor) {
      this.held--;
      this.events.push({ at: this.at, kind: "bounce-spent", held: this.held });
    }
    for (const face of faces) {
      if (face.kind === "eye") {
        this.enter(face.owner.cell);
      }
    }
  }

  /**
   * Meets a brick in a wall cell at a turn, on the sides given: strikes
   * it, if its kind breaks, unless its rules shield it, and breaks it once
   * it has no hits left; then runs its rules for meeting it.
   */
  private meetBrick(cell: number, brick: Brick, sides: number): void {
    const { traits } = kindOf(brick.kind);
    if (takesStrikes(brick.kind)) {
      const struck: Struck = { cell, brick, sides, shield: null };
      for (const trait of traits) {
        this.traits[trait.kind].struck?.(struck);
      }
      if (struck.shield === null) {
        this.strike(cell, brick);
      } else {
        const { at } = this;
        this.events.push({ at, kind: "shielded", cell, by: struck.shield });
      }
    }
    this.moment = "brick";
    for (const trait of traits) {
      this.traits[trait.kind].met?.(this, cell, brick);
    }
    this.moment = "none";
  }

  /** Strikes the brick in a wall cell, taking its hits and counting the rally, and breaks it once it has none left. */
  private strike(cell: number, brick: Brick): void {
    const { took, left } = strike(
      this.hits[cell] ?? 0,
      this.start.hot,
      this.rules,
    );
    this.hits[cell] = left;
    this.rally++;
    this.lastStrike = this.at;
    if (MARKS.includes(this.rally)) {
      this.marks.push(this.at);
    }
    const broke = left === 0;
    const { at, rally } = this;
    this.events.push({ at, kind: "strike", cell, took, broke, rally });
    if (rally >= bounceRally(this.rungs + 1, this.rules)) {
      this.rungs++;
      this.earnBounce("rally");
    }
    if (broke) {
      this.broken[cell] = 1;
      clearBrick(this.field, cell);
      this.moment = "brick";
      for (const trait of kindOf(brick.kind).traits) {
        this.traits[trait.kind].broken?.(this, cell, brick);
      }
      this.moment = "none";
    }
  }

  earn(): void {
    if (this.moment !== "brick") {
      throw new Error(
        "A floor bounce is earned only as a brick breaks or is met.",
      );
    }
    this.earnBounce("spring");
  }

  /**
   * Earns the flight a floor bounce, which the fuzzball keeps if it holds
   * fewer than the most and loses if not, announced either way.
   */
  private earnBounce(by: EarnedBy): void {
    const kept = this.held < this.rules.mostBounces;
    if (kept) {
      this.held++;
    }
    const { at, held } = this;
    this.events.push({ at, kind: "bounce-earned", by, held, kept });
  }

  /**
   * Crosses the fuzzball's middle into the eye of the brick in a wall
   * cell, running its rules for it, and passes every eye as air until it
   * next turns.
   */
  private enter(cell: number): void {
    this.eyes = false;
    const brick = this.start.wall.bricks[cell];
    if (brick !== null && brick !== undefined) {
      this.moment = "eye";
      for (const trait of kindOf(brick.kind).traits) {
        this.traits[trait.kind].entered?.(this, cell, brick);
      }
      this.moment = "none";
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
    this.sides.length = 0;
    this.turning.length = 0;
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
        case "floor":
          flipY = true;
          break;
        case "slant":
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
        this.turnedOff(face, face.owner.cell);
        turned = true;
      }
    }
    if (!turned && cut !== null) {
      this.swap(cut);
      this.turnedOff(cut, cut.owner.cell);
      turned = true;
    }
    return turned ? off : null;
  }

  /**
   * Returns what a face met names as what a turn was off, or null for one
   * that turns nothing, and lists its brick's wall cell in {@link cells}
   * once, with the sides it met it on: a hatch's bar, and the cuts across
   * its ends, are its bar.
   */
  private offOf(face: Face): TurnOff | null {
    switch (face.kind) {
      case "floor":
        return "floor";
      case "eye":
        return null;
      case "flat":
        return face.owner.kind === "brick"
          ? this.brickMet(face, face.owner.cell)
          : face.owner.kind;
      case "slant":
      case "bar":
        return this.brickMet(face, face.owner.cell);
    }
  }

  /**
   * Lists the wall cell of a brick whose face the moment met in
   * {@link cells}, once, with the sides it met it on, and returns what a
   * turn off it is off: a brick, or a hatch's bar.
   */
  private brickMet(face: TurningFace, cell: number): TurnOff {
    const last = this.cells.length - 1;
    if (this.cells[last] === cell) {
      this.sides[last] = (this.sides[last] ?? 0) | sidesOf(face);
    } else {
      this.cells.push(cell);
      this.sides.push(sidesOf(face));
      this.turning.push(-1);
    }
    if (face.kind !== "slant") {
      // A flat or a bar met always turns the fuzzball.
      this.turnedOff(face, cell);
    }
    return this.isHatch(cell) ? "bar" : "brick";
  }

  /** Notes that a face of the brick in a wall cell the moment met turned the fuzzball, with the sides it lies along. */
  private turnedOff(face: TurningFace, cell: number): void {
    const index = this.cells.indexOf(cell);
    this.turning[index] = Math.max(this.turning[index] ?? 0, 0) | sidesOf(face);
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

/**
 * Returns the sides of its brick's cell a face lies along, as `FieldFace`
 * bits: a flat's, or a bar's along its cell's top; both of a cut corner's;
 * and none of a long 45° face.
 */
function sidesOf(face: TurningFace): number {
  switch (face.kind) {
    case "flat":
      if (face.along === "across") {
        return face.facing > 0 ? CEILINGWARD : FLOORWARD;
      }
      return face.facing > 0 ? RIGHT : LEFT;
    case "slant":
      return face.long
        ? 0
        : (face.facingX > 0 ? RIGHT : LEFT) |
            (face.facingY > 0 ? CEILINGWARD : FLOORWARD);
    case "bar":
      return CEILINGWARD;
  }
}
