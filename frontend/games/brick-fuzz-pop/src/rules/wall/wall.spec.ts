import { lowerWall } from "@fz/brick-wall/rules/wall";
import { keysOf } from "@fz/core/records";
import {
  FLIGHT_FIXTURES,
  type FlightFixture,
} from "../../testing/flight_fixtures";
import { wallFrom } from "../../testing/wall_picture";
import { BRICK_KIND_IDS, brickKind } from "../catalog/bricks";
import { NO_BRICK } from "../levels/legend";
import { WALL_RULES, type Wall, regrow } from "./wall";

const AIR = NO_BRICK.repeat(9);

/** Returns a wall drawn with `wallFrom()` as one row of the legend's characters, standing in a field row. */
function wallOf(row: string, lowestRow = 5): Wall {
  return wallFrom([row], { lowestRow });
}

/** Returns a wall with every brick it holds worn to a number of hits, as a round's strikes leave them. */
function wornTo(wall: Wall, hits: number): Wall {
  return {
    ...wall,
    bricks: wall.bricks.map((brick) =>
      brick === null ? null : { ...brick, hits },
    ),
  };
}

/** Returns the hits each brick of a wall has left, in order, null for no brick. */
function hitsOf(wall: Wall): (number | null)[] {
  return wall.bricks.map((brick) => brick?.hits ?? null);
}

/**
 * Returns the wall a hand-made round's flight leaves, before it comes
 * down: the next round's, standing where the start's stood, with each brick
 * the round didn't break back from the start's.
 */
function flownWall({ start, round }: FlightFixture): Wall {
  const broken = new Set(
    round.flight.events.flatMap((event) =>
      event.kind === "break" ? [event.cell] : [],
    ),
  );
  return {
    bricks: round.next.wall.bricks.map(
      (brick, cell) =>
        brick ?? (broken.has(cell) ? null : (start.wall.bricks[cell] ?? null)),
    ),
    rows: start.wall.rows,
    lowestRow: start.wall.lowestRow,
  };
}

describe("WALL_RULES", () => {
  it.each(BRICK_KIND_IDS)(
    "needs a brick of %s broken only as the catalog marks its kind",
    (kind) => {
      expect(WALL_RULES.needed(kind)).toBe(brickKind(kind).needed);
    },
  );

  it("grows worn moss a hit as the wall comes down", () => {
    const wall = wornTo(wallOf("M...N...."), 1);

    const lowered = lowerWall(wall, 11, WALL_RULES);

    expect([lowered.wall.lowestRow, hitsOf(lowered.wall)]).toEqual([
      4,
      [2, null, null, null, 2, null, null, null, null],
    ]);
  });

  // K2's rounds made by hand, which the view, the scene and the shell are
  // built against, come down as the rules bring the wall down.
  it.each(keysOf(FLIGHT_FIXTURES))(
    "brings the wall down as the hand-made %s round does",
    (name) => {
      const fixture = FLIGHT_FIXTURES[name];
      const { outcome, next } = fixture.round;

      const lowered = lowerWall(
        flownWall(fixture),
        fixture.start.depth,
        WALL_RULES,
      );

      expect(lowered).toMatchObject({
        wall: next.wall,
        rowsDown: outcome.rowsDown,
        jumped: outcome.jumped,
        lost: outcome.result === "lost",
      });
    },
  );
});

describe("regrow", () => {
  it("gives no hit back to a worn brick of a kind that doesn't regrow", () => {
    const worn = wornTo(wallOf("....2...."), 1);

    expect(regrow(worn)).toEqual(worn);
  });

  it("gives worn moss back one hit, however worn", () => {
    const worn = wornTo(wallOf("N...M...o"), 1);

    expect(hitsOf(regrow(worn))).toEqual([
      2,
      null,
      null,
      null,
      2,
      null,
      null,
      null,
      1,
    ]);
  });

  it("grows moss no further than its full hits", () => {
    const wall = wallOf("N...M....");

    expect(regrow(wall)).toBe(wall);
  });

  it("grows moss worn by one back to its full hits", () => {
    const worn = wornTo(wallOf("N........"), 2);

    expect(hitsOf(regrow(worn))[0]).toBe(3);
  });

  it("leaves a wall with no brick as it is", () => {
    const wall = wallOf(AIR);

    expect(regrow(wall)).toBe(wall);
  });

  it("leaves the wall it is handed as it was", () => {
    const worn = wornTo(wallOf("N...M...."), 1);
    const before = structuredClone(worn);

    regrow(worn);

    expect(worn).toStrictEqual(before);
  });
});
