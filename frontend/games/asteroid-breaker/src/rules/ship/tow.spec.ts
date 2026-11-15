import { TURN } from "../angles";
import { type Torus, distance } from "../torus";
import { MOST_CREW, TOW_HOOK, TOW_LINK } from "../tuning";
import type { Crew, Pilot } from "./pilots";
import { STILL, type Ship, createShip } from "./ship";
import {
  type LineField,
  type TowLink,
  createTow,
  hasRoomInTow,
  joinLine,
  layTow,
  settleTow,
  stepTow,
  trailLink,
} from "./tow";

const FIELD: Torus = { width: 40, height: 40 };

/** Describes a line in tow as the specs move it: its ship and its crew changed as a spec says. */
interface Towed {
  readonly tow: readonly TowLink[];
  crew: Crew;
  readonly ship: Ship;
  readonly torus: Torus;
}

/** The way from the ship's middle to its first link, straight out behind it. */
const FIRST_BEHIND = TOW_HOOK + TOW_LINK;

/**
 * Returns a line in tow behind a ship at a place, its nose up unless turned,
 * the crew in tow as given, laid straight out behind it.
 */
function towBehind(
  x: number,
  y: number,
  tow: readonly Pilot[] = [1, 2],
  angle = (3 * TURN) / 4,
): Towed {
  const ship = { ...createShip(x, y, STILL), waiting: false, angle };
  const field: Towed = {
    tow: createTow(),
    crew: { pilot: 0, tow, home: [], lastGiven: 6 },
    ship,
    torus: FIELD,
  };
  layTow(field);
  return field;
}

/**
 * Returns a line in tow as {@link towBehind} lays it behind a ship at
 * (20, 10), its field letting as many ride as given.
 */
function lineBehind(
  tow: readonly Pilot[],
  mostInTow: number,
): Towed & LineField {
  return { ...towBehind(20, 10, tow), towing: { mostInTow } };
}

/** Returns where a link is, rounded so a spec can compare it. */
function placeOf({ x, y }: TowLink): [number, number] {
  return [round(x), round(y)];
}

/** Returns where a link was a step ago, rounded as {@link placeOf} rounds. */
function lastPlaceOf({ lastX, lastY }: TowLink): [number, number] {
  return [round(lastX), round(lastY)];
}

/** Returns a number to a millionth, as a place is compared. */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Returns the links of those in tow, in the line's order. */
function riding(field: Pick<Towed, "tow" | "crew">): TowLink[] {
  return field.tow.slice(0, field.crew.tow.length);
}

describe("createTow", () => {
  it("makes a link for each of the most that ride in tow", () => {
    expect(createTow()).toHaveLength(MOST_CREW - 1);
  });
});

describe("layTow", () => {
  it("lays those in tow straight out behind the ship, a link apart from the hook back", () => {
    const field = towBehind(20, 10, [1, 2, 3]);

    expect(riding(field).map(placeOf)).toEqual([
      [20, round(10 + FIRST_BEHIND)],
      [20, round(10 + FIRST_BEHIND + TOW_LINK)],
      [20, round(10 + FIRST_BEHIND + 2 * TOW_LINK)],
    ]);
  });

  it("lays each link where it was a step ago too, so it isn't drawn coming from elsewhere", () => {
    const field = towBehind(20, 10);

    expect(riding(field).map(lastPlaceOf)).toEqual(riding(field).map(placeOf));
  });

  it("wraps a link laid past an edge to the far side", () => {
    const field = towBehind(20, 39);

    expect(placeOf(field.tow[0]!)).toEqual([20, round(39 + FIRST_BEHIND - 40)]);
  });

  it("lays the line the way the ship's tail points", () => {
    const field = towBehind(20, 20, [1], 0);

    expect(placeOf(field.tow[0]!)).toEqual([round(20 - FIRST_BEHIND), 20]);
  });

  it("leaves the links past those in tow as they are", () => {
    const field = towBehind(20, 10, [1]);

    expect(field.tow.slice(1)).toEqual(createTow().slice(1));
  });

  it("leaves the line as it is with no ship", () => {
    const field = { ...towBehind(20, 10), ship: null };
    const before = field.tow.map(placeOf);

    layTow(field);

    expect(field.tow.map(placeOf)).toEqual(before);
  });
});

describe("trailLink", () => {
  it("lays one who joins the line a link behind the last, the way the line runs", () => {
    const field = towBehind(20, 10, [1]);
    field.crew = { ...field.crew, tow: [1, 2] };

    trailLink(field, 1);

    expect(placeOf(field.tow[1]!)).toEqual([
      20,
      round(10 + FIRST_BEHIND + TOW_LINK),
    ]);
  });

  it("lays one who joins a line the ship has turned on along the line, clear of the ship", () => {
    const field = towBehind(20, 10, [1]);
    field.ship.angle = TURN / 4;
    stepTow(field);
    field.crew = { ...field.crew, tow: [1, 2] };

    trailLink(field, 1);

    const [first, second] = field.tow;
    expect(placeOf(second!)).toEqual([20, round(first!.y + TOW_LINK)]);
  });

  it("lays the first to join an empty line a link behind the hook, the way the ship's tail points", () => {
    const field = towBehind(20, 10, []);
    field.crew = { ...field.crew, tow: [1] };

    trailLink(field, 0);

    expect(placeOf(field.tow[0]!)).toEqual([20, round(10 + FIRST_BEHIND)]);
  });

  it("lays one who joins where it was a step ago too", () => {
    const field = towBehind(20, 10, [1]);
    field.crew = { ...field.crew, tow: [1, 2] };

    trailLink(field, 1);

    expect(lastPlaceOf(field.tow[1]!)).toEqual(placeOf(field.tow[1]!));
  });

  it("leaves the line as it is with no ship", () => {
    const field = { ...towBehind(20, 10, [1]), ship: null };
    field.crew = { ...field.crew, tow: [1, 2] };
    const before = field.tow.map(placeOf);

    trailLink(field, 1);

    expect(field.tow.map(placeOf)).toEqual(before);
  });

  it("throws for a link past those the field made", () => {
    const field = towBehind(20, 10);

    expect(() => {
      trailLink(field, MOST_CREW - 1);
    }).toThrow(RangeError);
  });
});

describe("hasRoomInTow", () => {
  it.each([
    ["has room while fewer ride than the field lets", [1, 2], true],
    ["has none once as many ride as the field lets", [1, 2, 3], false],
  ])("%s", (_, tow, room) => {
    expect(hasRoomInTow(lineBehind(tow, 3))).toBe(room);
  });

  it("has none past the links the line was made with, whatever the field lets", () => {
    const field = lineBehind([1, 2], MOST_CREW + 2);
    const short = { ...field, tow: field.tow.slice(0, 2) };

    expect(hasRoomInTow(short)).toBe(false);
  });
});

describe("joinLine", () => {
  it("has a pilot join the line's end, laid a link behind the last", () => {
    const field = lineBehind([1], 3);

    joinLine(field, 5);

    expect([field.crew.tow, placeOf(field.tow[1]!)]).toEqual([
      [1, 5],
      [20, round(10 + FIRST_BEHIND + TOW_LINK)],
    ]);
  });

  it("throws for a line with no room", () => {
    const field = lineBehind([1], 1);

    expect(() => {
      joinLine(field, 5);
    }).toThrow(RangeError);
  });
});

describe("stepTow", () => {
  it("keeps a line straight behind a ship that doesn't move", () => {
    const field = towBehind(20, 10);
    const before = riding(field).map(placeOf);

    stepTow(field);

    expect(riding(field).map(placeOf)).toEqual(before);
  });

  it("pulls each link along behind a ship that flies on, to a link's length from the one ahead", () => {
    const field = towBehind(20, 10);
    field.ship.y -= 1;

    stepTow(field);

    expect(riding(field).map(placeOf)).toEqual([
      [20, round(9 + FIRST_BEHIND)],
      [20, round(9 + FIRST_BEHIND + TOW_LINK)],
    ]);
  });

  it("swings the line as the ship turns, the first link pulled toward the hook where the tail now points", () => {
    const field = towBehind(20, 10, [1]);
    field.ship.angle = 0;
    const hookX = 20 - TOW_HOOK;

    stepTow(field);

    const [first] = riding(field);
    expect(round(distance(FIELD, hookX, 10, first!.x, first!.y))).toBe(
      round(TOW_LINK),
    );
    expect(first!.x).toBeLessThan(20);
  });

  it("keeps where each link was a step ago, for the scene to draw between", () => {
    const field = towBehind(20, 10);
    const before = riding(field).map(placeOf);
    field.ship.y -= 1;

    stepTow(field);

    expect(riding(field).map(lastPlaceOf)).toEqual(before);
  });

  it("pulls each link the short way toward the one ahead across the bottom edge", () => {
    // The first link rides at 39.5 and the second across the edge at 1.1.
    const field = towBehind(20, 37);
    field.ship.y -= 1;

    stepTow(field);

    expect(riding(field).map(placeOf)).toEqual([
      [20, 38.5],
      [20, round(38.5 + TOW_LINK - 40)],
    ]);
  });

  it("pulls each link the short way toward the one ahead across the left edge", () => {
    // The first link rides at 0.5 and the second across the edge at 38.9.
    const field = towBehind(3, 20, [1, 2], 0);
    field.ship.x += 1;

    stepTow(field);

    expect(riding(field).map(placeOf)).toEqual([
      [1.5, 20],
      [round(1.5 - TOW_LINK + 40), 20],
    ]);
  });

  it("holds a link that lies on the one ahead, with no way to pull it along", () => {
    const field = towBehind(20, 10, [1, 2]);
    const [first, second] = riding(field);
    second!.x = first!.x;
    second!.y = first!.y;

    stepTow(field);

    expect(placeOf(second!)).toEqual(placeOf(first!));
  });

  it("holds the line where it is with no ship, drawn standing still", () => {
    const field = towBehind(20, 10);
    field.ship.y -= 1;
    stepTow(field);
    const before = riding(field).map(placeOf);

    stepTow({ ...field, ship: null });

    expect([
      riding(field).map(placeOf),
      riding(field).map(lastPlaceOf),
    ]).toEqual([before, before]);
  });
});

describe("settleTow", () => {
  it("sets where each link in tow was a step ago to where it is", () => {
    const field = towBehind(20, 10);
    field.ship.y -= 1;
    stepTow(field);

    settleTow(field);

    expect(riding(field).map(lastPlaceOf)).toEqual(riding(field).map(placeOf));
  });
});
