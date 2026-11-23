// Rounds made by hand, as playRound() will play them, so the view, the
// scene and the shell can play a round of each kind of event, and the
// rules' specs hold fly() to each flight: a flight for each kind of event,
// each on a field 11 deep, its wall drawn as a picture by wallFrom(). A flier works out each path, told which face it
// meets next, and flies to it as the design's "The flight" does, a flat
// changing the sign of one speed, with the aim's own speeds; it counts the
// rally, the turns, the floor bounces, the holds and the bolts by the rules
// it is handed. The design's sketch (docs/rickashay/sketch/sim.mjs) flies
// each of these walls and aims to the same places. A 45° face swaps the
// fuzzball's two speeds, with the signs that send it away.

import { AIMS, type Aim } from "@fz/brick-wall/rules/aims";
import { COLUMNS, RADIUS, SIDE_MARGIN } from "@fz/brick-wall/rules/field";
import {
  cellAt,
  columnOf,
  fieldRowOf,
  wallRowOf,
} from "@fz/brick-wall/rules/grid";
import { wallFrom } from "@fz/brick-wall/rules/level_picture";
import type { Waypoint } from "@fz/brick-wall/rules/track";
import {
  type WallRules,
  isCleared,
  lowerWall,
} from "@fz/brick-wall/rules/wall";
import { clamp, multiplierAt } from "@fz/core/math";
import { strike } from "../rules/bricks/strike";
import { type KindId, type Wall, kindOf } from "../rules/catalog/kinds";
import type {
  EarnedBy,
  Flight,
  FlightEvent,
  Guard,
  Round,
  RoundStart,
  Shield,
  TurnOff,
} from "../rules/flight/events";
import { WALL_LEGEND } from "../rules/levels/legend";
import type { Shot } from "../rules/shot";
import {
  BOUNCE_POINTS,
  FLIGHT_RULES,
  type FlightRules,
  JUMP_POINTS,
  RALLY_MARKS,
  RALLY_STEPS,
  STAND_OFF,
  STRIKE_POINTS,
  bounceRally,
} from "../rules/tuning";

/** Describes a round made by hand: where it starts, its shot, the rules it is flown by, and the round it plays. */
export interface FlightFixture {
  readonly start: RoundStart;
  readonly shot: Shot;
  /** The rules it is flown by: `FLIGHT_RULES`, but where a short flight is to meet a guard, or a fuzzball is to hold fewer floor bounces. */
  readonly rules: FlightRules;
  readonly round: Round;
}

/** A line the fuzzball's middle flies to: a flat's up the field, at an x, or across it, at a y. */
type Line = { readonly x: number } | { readonly y: number };

/** A 45° face's line the fuzzball's middle flies to: x + y = `sum`, or x − y = `difference`. */
type Slant = { readonly sum: number } | { readonly difference: number };

/** The ceiling's flat on a field 11 deep, a radius under it. */
const CEILING = 11 - RADIUS;

/** The side walls' flats, a radius in from each. */
const LEFT_WALL = RADIUS;
const RIGHT_WALL = COLUMNS - RADIUS;

/** The aims the fixtures are shot at: 45°, and the lowest, 8°. */
const AT_45 = 148;
const LOWEST = 0;

/**
 * How the fixtures' walls come down: by the catalog's needed kinds, as
 * they stand, since none holds moss, the one kind that changes between
 * rounds.
 */
export const FIXTURE_WALL_RULES: WallRules<KindId> = {
  needed: (kind) => kindOf(kind).needed,
  betweenRounds: (wall) => wall,
};

/** The events that close a moment, after its bricks, in the order `Flight.events` gives them. */
const CLOSING_ORDER = {
  "bounce-spent": 0,
  "hatches-open": 1,
  bolt: 2,
} as const;

/** An event that closes a moment. */
type Closing = Extract<
  FlightEvent,
  { readonly kind: keyof typeof CLOSING_ORDER }
>;

/** Returns a value a fixture's drawing promises, throwing if the fixture is drawn wrong. */
function sure<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new RangeError("A flight fixture is drawn wrong.");
  }
  return value;
}

/**
 * Flies a fixture's fuzzball from where its round starts along its aim,
 * to each face it is told it meets next, writing the flight's events and
 * its track, and counting what the rules count.
 */
class Flier {
  private x: number;
  private y: number;
  private dx: number;
  private dy: number;
  private at = 0;
  private readonly waypoints: Waypoint[];
  private readonly events: FlightEvent[] = [];
  /** The events that close the moment flown to, written once the flier flies on. */
  private closing: Closing[] = [];
  /** Each wall cell's hits left. */
  private readonly hits: number[];
  private readonly broken = new Set<number>();
  private rally = 0;
  private turns = 0;
  /** The floor bounces it held at its release. */
  private readonly released: number;
  private held: number;
  private holdsLeft: number;
  /** The rungs of the floor bounces' ladder the rally has reached. */
  private rungs = 0;
  /** The floor bounces earned and kept. */
  private kept = 0;
  private strikePoints = 0;
  private readonly marks: number[] = [];
  private lastStrike: number | null = null;

  constructor(
    private readonly start: RoundStart,
    aim: Aim,
    private readonly rules: FlightRules,
  ) {
    const [dx, dy] = sure(AIMS[aim]);
    this.x = start.x;
    this.y = RADIUS;
    this.dx = dx;
    this.dy = dy;
    this.waypoints = [{ at: 0, x: this.x, y: this.y }];
    this.hits = start.wall.bricks.map((brick) => brick?.hits ?? 0);
    this.released = start.hot ? rules.hotBounces : 0;
    this.held = this.released;
    this.holdsLeft = rules.hatchHolds;
  }

  /** Flies on to a line and turns off what met it there, which changes the sign of its speed across the line. */
  turn(line: Line, off: TurnOff, cells: readonly number[] = []): this {
    this.flyTo(line);
    if ("x" in line) {
      this.dx = -this.dx;
    } else {
      this.dy = -this.dy;
    }
    return this.turned(off, cells);
  }

  /**
   * Flies on to a 45° face's line and turns off what met it there, which
   * swaps its two speeds, with the signs that send it away.
   */
  swap(slant: Slant, off: TurnOff, cells: readonly number[]): this {
    const { x, y, dx, dy } = this;
    this.flyFor(
      "sum" in slant
        ? (slant.sum - (x + y)) / (dx + dy)
        : (slant.difference - (x - y)) / (dx - dy),
    );
    return this.swapped("sum" in slant, off, cells);
  }

  /**
   * Turns again where it turned, off a 45° face of a line x + y = c it
   * still flies into, as at the joint of a brick's flat and the cut across
   * its corner: its track gains the place again, at the moment.
   */
  swapAgain(off: TurnOff, cells: readonly number[]): this {
    this.waypoints.push({ at: this.at, x: this.x, y: this.y });
    return this.swapped(true, off, cells);
  }

  /** Flies on to the floor and turns off it, spending a floor bounce it holds. */
  floor(): this {
    if (this.held === 0) {
      throw new RangeError("A flight fixture spends a floor bounce it lacks.");
    }
    this.turn({ y: RADIUS }, "floor");
    this.held--;
    this.closing.push({ at: this.at, kind: "bounce-spent", held: this.held });
    return this;
  }

  /** Strikes a brick it turned off at this moment, and earns the floor bounce its rally or its break gives. */
  strike(cell: number): this {
    const brick = sure(this.start.wall.bricks[cell] ?? undefined);
    const { took, left } = strike(
      sure(this.hits[cell]),
      this.start.hot,
      this.rules,
    );
    this.hits[cell] = left;
    const broke = left === 0;
    if (broke) {
      this.broken.add(cell);
    }
    this.rally++;
    this.strikePoints += STRIKE_POINTS * multiplierAt(this.rally, RALLY_STEPS);
    this.lastStrike = this.at;
    if ((RALLY_MARKS as readonly number[]).includes(this.rally)) {
      this.marks.push(this.at);
    }
    const { at, rally } = this;
    this.events.push({ at, kind: "strike", cell, took, broke, rally });
    if (rally === bounceRally(this.rungs + 1, this.rules)) {
      this.rungs++;
      this.earn("rally");
    }
    if (broke && brick.kind === "spring") {
      this.earn("spring");
    }
    return this;
  }

  /** Turns off a brick at this moment without striking it. */
  shielded(cell: number, by: Shield): this {
    this.events.push({ at: this.at, kind: "shielded", cell, by });
    return this;
  }

  /** Is held up by the first hatch's bar it turned off at this moment, the hatches all opening at the last hold. */
  hold(cell: number): this {
    this.holdsLeft--;
    const { at, holdsLeft: left } = this;
    this.events.push({ at, kind: "hold", cell, left });
    if (left === 0) {
      this.closing.push({ at, kind: "hatches-open" });
    }
    return this;
  }

  /** Flies on to a portal's eye's edge, and comes out at the same place in its twin's, flying the same way. */
  teleport(edge: Line, from: number, to: number): this {
    this.flyTo(edge);
    this.x += columnOf(to) - columnOf(from);
    this.y += wallRowOf(to) - wallRowOf(from);
    this.waypoints.push({ at: this.at, x: this.x, y: this.y });
    this.events.push({ at: this.at, kind: "teleport", from, to });
    return this;
  }

  /** Flies on to the bored distance past its last strike, or its release, yawns there, and drops home. */
  bored(): this {
    this.flyFor((this.lastStrike ?? 0) + this.rules.bored - this.at);
    this.events.push({ at: this.at, kind: "bored", x: this.x, y: this.y });
    return this.dropHome();
  }

  /**
   * Is brought home by its guard, and drops home: where it is, after its
   * turns running with no flight between them, or flown on to the longest
   * flight.
   */
  guard(by: Guard): this {
    if (by === "length") {
      this.flyFor(this.rules.longest - this.at);
    } else {
      this.flush();
    }
    const { at, x, y } = this;
    this.events.push({ at, kind: "guard", x, y, by });
    return this.dropHome();
  }

  /** Flies on to the floor, and lands there. */
  land(): this {
    this.flyTo({ y: RADIUS });
    return this.landed();
  }

  /**
   * Returns the round the flight plays: what it came to, counted as it
   * flew, and where the next round starts, the wall it leaves come down by
   * `lowerWall()`, the fuzzball waiting where it landed, the shot hot if
   * the wall jumped.
   */
  round(): Round {
    this.flush();
    const { wall, depth } = this.start;
    const after: Wall = {
      ...wall,
      bricks: wall.bricks.map((brick, cell) =>
        brick === null || this.broken.has(cell)
          ? null
          : { ...brick, hits: sure(this.hits[cell]) },
      ),
    };
    const lowered = lowerWall(after, depth, FIXTURE_WALL_RULES);
    const landing = sure(this.events.at(-1));
    if (landing.kind !== "land") {
      throw new RangeError("A flight fixture never lands.");
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
    return {
      flight,
      outcome: {
        rally: this.rally,
        broken: this.broken.size,
        earned: this.kept,
        jumped: lowered.jumped,
        rowsDown: lowered.rowsDown,
        result: isCleared(after, FIXTURE_WALL_RULES)
          ? "cleared"
          : lowered.lost
            ? "lost"
            : "on",
        points:
          this.strikePoints +
          BOUNCE_POINTS * this.kept +
          (lowered.jumped ? JUMP_POINTS : 0),
      },
      next: { wall: lowered.wall, depth, x: landing.x, hot: lowered.jumped },
    };
  }

  /** Earns a floor bounce, kept if it holds fewer than the most. */
  private earn(by: EarnedBy): void {
    const kept = this.held < this.rules.mostBounces;
    if (kept) {
      this.held++;
      this.kept++;
    }
    const { at, held } = this;
    this.events.push({ at, kind: "bounce-earned", by, held, kept });
  }

  /** Swaps its two speeds off a 45° face along x + y = c, or x − y = c, and turns. */
  private swapped(
    alongSum: boolean,
    off: TurnOff,
    cells: readonly number[],
  ): this {
    const { dx, dy } = this;
    [this.dx, this.dy] = alongSum ? [-dy, -dx] : [dy, dx];
    return this.turned(off, cells);
  }

  /** Counts a turn off what met it, at its new heading, and draws a bolt at the turn the rules name while a lock is shut. */
  private turned(off: TurnOff, cells: readonly number[]): this {
    this.turns++;
    const { at, x, y, dx, dy } = this;
    this.events.push({ at, kind: "turn", x, y, dx, dy, off, cells });
    const drawn = this.turns / this.rules.boltTurns;
    if (Number.isInteger(drawn) && this.lockShut(drawn - 1)) {
      this.closing.push({ at, kind: "bolt", drawn });
    }
    return this;
  }

  /** Returns whether a lock in the field has more bolts than were drawn, so one is still shut. */
  private lockShut(drawn: number): boolean {
    const { wall, depth } = this.start;
    return wall.bricks.some(
      (brick, cell) =>
        brick?.kind === "lock" &&
        !this.broken.has(cell) &&
        fieldRowOf(wall, cell) < depth &&
        brick.tint > drawn,
    );
  }

  /** Flies on to a line, setting its middle on it. */
  private flyTo(line: Line): void {
    const t =
      "x" in line ? (line.x - this.x) / this.dx : (line.y - this.y) / this.dy;
    this.flyFor(t);
    if ("x" in line) {
      this.x = line.x;
    } else {
      this.y = line.y;
    }
    sure(this.waypoints.pop());
    this.waypoints.push({ at: this.at, x: this.x, y: this.y });
  }

  /** Flies on for a length along its heading, closing the moment it leaves. */
  private flyFor(t: number): void {
    if (!(t > 0)) {
      throw new RangeError("A flight fixture flies to a place behind it.");
    }
    this.flush();
    this.at += t;
    this.x += this.dx * t;
    this.y += this.dy * t;
    this.waypoints.push({ at: this.at, x: this.x, y: this.y });
  }

  /** Drops straight down to the floor from where it is, and lands. */
  private dropHome(): this {
    this.dx = 0;
    this.dy = -1;
    return this.land();
  }

  /** Lands where it is, on the floor, waiting no nearer a side wall than `SIDE_MARGIN`. */
  private landed(): this {
    const x = clamp(this.x, SIDE_MARGIN, COLUMNS - SIDE_MARGIN);
    this.events.push({ at: this.at, kind: "land", x });
    return this;
  }

  /** Writes the events that close the moment, in their order. */
  private flush(): void {
    this.events.push(
      ...this.closing.sort(
        (a, b) => CLOSING_ORDER[a.kind] - CLOSING_ORDER[b.kind],
      ),
    );
    this.closing = [];
  }
}

/** Returns where a round starts on a field 11 deep, its wall drawn as a picture whose lowest row stands in a field row. */
function startOn(
  picture: readonly string[],
  lowestRow: number,
  { x = 4.5, hot = false }: { x?: number; hot?: boolean } = {},
): RoundStart {
  return {
    wall: wallFrom(picture, WALL_LEGEND, { lowestRow }),
    depth: 11,
    x,
    hot,
  };
}

/** Returns a fixture flown from a start along an aim, by the rules, as a flier is told to fly it. */
function flown(
  start: RoundStart,
  aim: Aim,
  fly: (flier: Flier, cell: (column: number, row: number) => number) => Flier,
  rules: FlightRules = FLIGHT_RULES,
): FlightFixture {
  const cell = (column: number, row: number): number =>
    cellAt(start.wall, column, row);
  const round = fly(new Flier(start, aim, rules), cell).round();
  return { start, shot: { aim }, rules, round };
}

/**
 * Flies a shot at 45° from the floor's middle off the right wall, up under
 * the brick at column 8 of row 5, and turns it off its lower face to land
 * at x = 4, telling the flier what the brick does.
 */
function offTheCorner(
  start: RoundStart,
  met: (flier: Flier, cell: number) => Flier,
): FlightFixture {
  return flown(start, AT_45, (flier, cell) =>
    met(
      flier
        .turn({ x: RIGHT_WALL }, "wall")
        .turn({ y: 5 - RADIUS }, "brick", [cell(8, 5)]),
      cell(8, 5),
    ).land(),
  );
}

/**
 * Flies a shot at 45° from x = 4.75 off the right wall to the brick at
 * column 8 of row 5, down to the floor, where it spends a floor bounce,
 * off the left wall to the brick at column 1 of row 5, and down to land at
 * x = 5.75, telling the flier what each brick does.
 */
function bothCorners(
  start: RoundStart,
  first: (flier: Flier, cell: number) => Flier,
  second: (flier: Flier, cell: number) => Flier,
  rules: FlightRules = FLIGHT_RULES,
): FlightFixture {
  return flown(
    start,
    AT_45,
    (flier, cell) =>
      second(
        first(
          flier
            .turn({ x: RIGHT_WALL }, "wall")
            .turn({ y: 5 - RADIUS }, "brick", [cell(8, 5)]),
          cell(8, 5),
        )
          .floor()
          .turn({ x: LEFT_WALL }, "wall")
          .turn({ y: 5 - RADIUS }, "brick", [cell(1, 5)]),
        cell(1, 5),
      ).land(),
    rules,
  );
}

/** A plain shot wears a tough brick, which holds, and turns off its face. */
function plain(): FlightFixture {
  return offTheCorner(
    startOn(
      ["ooooooooo", "ooooooooo", ".........", ".........", "o.......2"],
      5,
    ),
    (flier, cell) => flier.strike(cell),
  );
}

/** The aim at 60°, steeper than 45°, so a 45° face it meets sends it off shallow. */
const AT_60 = 208;

/**
 * Flies a shot at 60° from where its start puts the fuzzball to the face
 * of the brick at column 4 of row 5 it meets first, told how it turns off
 * it and what the brick does, then off the left wall to land.
 */
function offTheLeft(
  start: RoundStart,
  met: (flier: Flier, cell: number) => Flier,
): FlightFixture {
  return flown(start, AT_60, (flier, cell) =>
    met(flier, cell(4, 5)).turn({ x: LEFT_WALL }, "wall").land(),
  );
}

/**
 * A shot meets the cut across a tough brick's floorward left corner, which
 * swaps its two speeds and sends it back down shallow, and strikes it.
 */
function corner(): FlightFixture {
  return offTheLeft(
    startOn(["ooooooooo", ".........", ".........", "....2...."], 5, {
      x: 1.3,
    }),
    (flier, cell) =>
      flier.swap({ sum: 4 + 5 - RADIUS }, "brick", [cell]).strike(cell),
  );
}

/**
 * A shot meets the long face of a ramp whose right angle sits in its
 * cell's ceilingward right corner, which sends it back down shallow; the
 * bricks the level needs wait over the jump line, so the wall jumps.
 */
function ramp(): FlightFixture {
  return offTheLeft(
    startOn(["ooooooooo", ".........", ".........", "....7...."], 5, {
      x: 1.5,
    }),
    (flier, cell) =>
      flier.swap({ sum: 4 + 5 + 1 - STAND_OFF }, "brick", [cell]),
  );
}

/** The aim at 120°, as steep as {@link AT_60} the other way. */
const AT_120 = 448;

/**
 * A shot at 120° from x = 7.7 meets a gem's floorward right face, which
 * swaps its two speeds and sends it down shallow the other way, and breaks
 * it, then turns off the right wall to land; the bricks the level needs
 * wait over the jump line, so the wall jumps.
 */
function gem(): FlightFixture {
  return flown(
    startOn(["ooooooooo", ".........", ".........", "....G...."], 5, {
      x: 7.7,
    }),
    AT_120,
    (flier, cell) =>
      flier
        .swap({ difference: 4.5 - 5.5 + 0.5 + STAND_OFF }, "brick", [
          cell(4, 5),
        ])
        .strike(cell(4, 5))
        .turn({ x: RIGHT_WALL }, "wall")
        .land(),
  );
}

/** A plain shot breaks the last brick the level needs, beside steel it doesn't: cleared. */
function cleared(): FlightFixture {
  return offTheCorner(
    startOn(["##.....##", ".........", "#.......o"], 5),
    (flier, cell) => flier.strike(cell),
  );
}

/** A plain shot wears a brick while the wall's lowest row stands a row over the floor: its step loses the level. */
function lost(): FlightFixture {
  return offTheCorner(
    startOn(
      [
        "ooooooooo",
        "........2",
        ".........",
        ".........",
        ".........",
        "ooo......",
      ],
      1,
    ),
    (flier, cell) => flier.strike(cell),
  );
}

/** A plain shot breaks the one brick the level needs under the jump line: the wall jumps, and the next shot is hot. */
function jumped(): FlightFixture {
  return offTheCorner(
    startOn(["ooooooooo", ".........", ".........", "........o"], 5),
    (flier, cell) => flier.strike(cell),
  );
}

/** A plain shot turns off a plated brick's plate, which takes nothing. */
function shielded(): FlightFixture {
  return offTheCorner(
    startOn(["ooooooooo", "ooooooooo", ".........", "........v"], 5),
    (flier, cell) => flier.shielded(cell, "plate"),
  );
}

/**
 * A shot at 45° from x = 4.75 climbs the alley by the right wall, striking
 * the column of tough bricks beside it six times, runs along the attic
 * over the top course, striking it four times and earning a floor bounce
 * at its tenth strike, comes down off the left wall to spend it on the
 * floor, and strikes the column from under it before it lands.
 */
function rally(): FlightFixture {
  const start = startOn(
    [
      "....3333.",
      ".......3.",
      ".......3.",
      ".......3.",
      ".......3.",
      ".......3.",
    ],
    4,
    { x: 4.75 },
  );
  return flown(start, AT_45, (flier, cell) => {
    flier.turn({ x: RIGHT_WALL }, "wall");
    for (const row of [4, 5, 6, 7, 8, 9]) {
      flier
        .turn({ x: 8 + RADIUS }, "brick", [cell(7, row)])
        .strike(cell(7, row))
        .turn({ x: RIGHT_WALL }, "wall");
    }
    for (const column of [7, 6, 5, 4]) {
      flier
        .turn({ y: CEILING }, "ceiling")
        .turn({ y: 10 + RADIUS }, "brick", [cell(column, 9)])
        .strike(cell(column, 9));
    }
    return flier
      .turn({ y: CEILING }, "ceiling")
      .turn({ x: LEFT_WALL }, "wall")
      .floor()
      .turn({ x: RIGHT_WALL }, "wall")
      .turn({ y: 4 - RADIUS }, "brick", [cell(7, 4)])
      .strike(cell(7, 4))
      .land();
  });
}

/** A plain shot breaks a spring brick, earning a floor bounce, which it spends on the floor before it strikes a brick and lands. */
function spring(): FlightFixture {
  return bothCorners(
    startOn(["ooooooooo", "ooooooooo", ".o......S"], 5, { x: 4.75 }),
    (flier, cell) => flier.strike(cell),
    (flier, cell) => flier.strike(cell),
  );
}

/** A hot shot breaks a tough brick of two with a strike, spends the floor bounce it left with, and breaks another. */
function hot(): FlightFixture {
  return bothCorners(
    startOn(["ooooooooo", "ooooooooo", ".2......2"], 5, { x: 4.75, hot: true }),
    (flier, cell) => flier.strike(cell),
    (flier, cell) => flier.strike(cell),
  );
}

/**
 * A hot shot turns off a lock of a bolt still shut, spends its floor
 * bounce, slides the bolt back at its fourth turn, off the left wall, and
 * breaks the other lock of a bolt, now open.
 */
function bolt(): FlightFixture {
  return bothCorners(
    startOn(["ooooooooo", "ooooooooo", ".x......x"], 5, { x: 4.75, hot: true }),
    (flier, cell) => flier.shielded(cell, "lock"),
    (flier, cell) => flier.strike(cell),
  );
}

/**
 * A hot shot, by rules that let a fuzzball hold one floor bounce, breaks a
 * spring brick while it holds its own, so the spring's is lost, though
 * announced; it spends its own on the floor and breaks a brick.
 */
function capped(): FlightFixture {
  return bothCorners(
    startOn(["ooooooooo", "ooooooooo", ".o......S"], 5, { x: 4.75, hot: true }),
    (flier, cell) => flier.strike(cell),
    (flier, cell) => flier.strike(cell),
    { ...FLIGHT_RULES, mostBounces: 1 },
  );
}

/**
 * A shot at the lowest aim turns off the right wall, the left and the
 * right, and fourth off a lock of a bolt at the foot of row 4, where the
 * left wall would be, still shut as that turn draws its bolt; then, off
 * the side walls three times more, it is bored and drops home.
 */
function lockMet(): FlightFixture {
  return flown(startOn(["x........"], 4), LOWEST, (flier, cell) =>
    sideTurns(flier, 3)
      .turn({ x: 1 + RADIUS }, "brick", [cell(0, 4)])
      .shielded(cell(0, 4), "lock")
      .turn({ x: RIGHT_WALL }, "wall")
      .turn({ x: LEFT_WALL }, "wall")
      .turn({ x: RIGHT_WALL }, "wall")
      .bored(),
  );
}

/**
 * A shot at 45° from x = 4.75 rises through a floor of hatches in row 7,
 * is held up three times between them and the ceiling, the hatches opening
 * at the third, and falls through them to land, never striking; the brick
 * the level needs waits over the ceiling, so the wall jumps.
 */
function hatch(): FlightFixture {
  const start = startOn(
    ["o........", ".........", ".........", ".........", "========="],
    7,
    { x: 4.75 },
  );
  const bar = { y: 8 + RADIUS };
  return flown(start, AT_45, (flier, cell) =>
    flier
      .turn({ x: RIGHT_WALL }, "wall")
      .turn({ y: CEILING }, "ceiling")
      .turn({ x: LEFT_WALL }, "wall")
      .turn(bar, "bar", [cell(0, 7)])
      .hold(cell(0, 7))
      .turn({ y: CEILING }, "ceiling")
      .turn(bar, "bar", [cell(5, 7)])
      .hold(cell(5, 7))
      .turn({ y: CEILING }, "ceiling")
      .turn({ x: RIGHT_WALL }, "wall")
      .turn(bar, "bar", [cell(6, 7)])
      .hold(cell(6, 7))
      .turn({ y: CEILING }, "ceiling")
      .turn({ x: LEFT_WALL }, "wall")
      .land(),
  );
}

/**
 * A shot at 45° from the floor's middle crosses into a portal's eye in
 * row 2, comes out of its twin's in row 5, flying the same way, and turns
 * off the ceiling and both walls to land, never striking; the brick the
 * level needs waits over the ceiling, so the wall jumps and the portals
 * sink.
 */
function teleport(): FlightFixture {
  const start = startOn(
    [
      "o........",
      ".........",
      ".........",
      ".........",
      ".........",
      ".........",
      "..@......",
      ".........",
      ".........",
      "......@..",
    ],
    2,
  );
  return flown(start, AT_45, (flier, cell) =>
    flier
      .teleport({ y: 2 + RADIUS }, cell(6, 2), cell(2, 5))
      .turn({ y: CEILING }, "ceiling")
      .turn({ x: RIGHT_WALL }, "wall")
      .turn({ x: LEFT_WALL }, "wall")
      .land(),
  );
}

/** The wall of the shots at the lowest aim: two rows by the ceiling, which the shot never reaches. */
const HIGH_WALL = ["ooooooooo", "ooooooooo"];

/**
 * A shot at the lowest aim rattles up between the side walls, seven turns,
 * strikes nothing, and yawns at the bored distance, then drops home.
 */
function bored(): FlightFixture {
  return flown(startOn(HIGH_WALL, 9), LOWEST, (flier) =>
    sideTurns(flier, 7).bored(),
  );
}

/**
 * The shot of {@link bored}, flown by rules that bring a flight home at 50
 * units, so its guard meets it after six turns, before it would have been
 * bored.
 */
function guard(): FlightFixture {
  return flown(
    startOn(HIGH_WALL, 9),
    LOWEST,
    (flier) => sideTurns(flier, 6).guard("length"),
    { ...FLIGHT_RULES, longest: 50 },
  );
}

/** The aim at 30°, shallower than 45°. */
const AT_30 = 88;

/**
 * A shot at 30° flies into the joint of a steel brick's floorward flat and
 * the cut across its floorward left corner, at x = 4 in row 2: the flat
 * turns it, and it still flies into the cut, which turns it again where it
 * is; by rules that bring a flight home after two turns running with no
 * flight between them, its guard drops it home from there.
 */
function turnsGuard(): FlightFixture {
  const [dx, dy] = sure(AIMS[AT_30]);
  const start = startOn(
    [
      "ooooooooo",
      "ooooooooo",
      ...Array<string>(6).fill("........."),
      "....#....",
    ],
    2,
    { x: 4 - (dx * (2 - 2 * RADIUS)) / dy },
  );
  return flown(
    start,
    AT_30,
    (flier, cell) =>
      flier
        .turn({ y: 2 - RADIUS }, "brick", [cell(4, 2)])
        .swapAgain("brick", [cell(4, 2)])
        .guard("turns"),
    { ...FLIGHT_RULES, stillTurns: 2 },
  );
}

/** Returns a flier at the lowest aim turned off the side walls a number of times, the right first. */
function sideTurns(flier: Flier, turns: number): Flier {
  for (let turn = 0; turn < turns; turn++) {
    flier.turn({ x: turn % 2 === 0 ? RIGHT_WALL : LEFT_WALL }, "wall");
  }
  return flier;
}

/**
 * Rounds made by hand, by what each shows: a plain shot; a level cleared,
 * one lost and a wall's jump; a plated face; a long rally, its floor
 * bounce earned and spent; a spring brick's; a hot shot's; a floor bounce
 * lost at the most a fuzzball holds; a lock's bolt; a lock met at the turn
 * that draws its bolt; the hatches' holds; a portal; a bored fuzzball's
 * yawn; a guard at the longest flight, and one at turns in place; a
 * brick's cut corner; a ramp's long face; and a gem's.
 */
export const FLIGHT_FIXTURES = {
  plain: plain(),
  cleared: cleared(),
  lost: lost(),
  jumped: jumped(),
  shielded: shielded(),
  rally: rally(),
  spring: spring(),
  hot: hot(),
  capped: capped(),
  bolt: bolt(),
  lockMet: lockMet(),
  hatch: hatch(),
  teleport: teleport(),
  bored: bored(),
  guard: guard(),
  turnsGuard: turnsGuard(),
  corner: corner(),
  ramp: ramp(),
  gem: gem(),
} as const satisfies Readonly<Record<string, FlightFixture>>;

/** A fixture's name, such as "rally". */
export type FixtureName = keyof typeof FLIGHT_FIXTURES;
