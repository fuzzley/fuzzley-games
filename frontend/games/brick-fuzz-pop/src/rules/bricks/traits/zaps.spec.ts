import { eventsOf, flyPicture } from "../../../testing/flights";
import type { Flown } from "../../flight/flight";
import { ZAP_DELAY } from "../../tuning";

/** Returns the wall cells a flight's zaps and blasts reached, each in turn. */
function reachesOf(flown: Flown): (readonly number[])[] {
  return eventsOf(flown, "zap").map(({ reaches }) => reaches);
}

/** Returns the wall cells that hold a brick once a flight is flown. */
function standing(flown: Flown): number[] {
  return flown.wall.bricks.flatMap((brick, cell) =>
    brick === null ? [] : [cell],
  );
}

// A fuzzball straight up from the floor meets a brick in field row 3 at 2.5,
// one in row 7 at 6.5.
describe("ZAPS_RULE", () => {
  it("lands a row zap half a unit after its zapper breaks, taking two hits off each brick in its row", () => {
    const flown = flyPicture({ picture: ["o.3.-.2.o"] });

    expect([
      eventsOf(flown, "zap"),
      eventsOf(flown, "break").map(({ at, cell, by }) => [at, cell, by]),
      flown.wall.bricks[2]?.hits,
    ]).toEqual([
      [
        {
          at: 2.5 + ZAP_DELAY,
          kind: "zap",
          cell: 4,
          pattern: "row",
          reaches: [0, 2, 6, 8],
        },
      ],
      [
        [2.5, 4, "fuzzball"],
        [2.5 + ZAP_DELAY, 0, "zap"],
        [2.5 + ZAP_DELAY, 6, "zap"],
        [2.5 + ZAP_DELAY, 8, "zap"],
      ],
      1,
    ]);
  });

  it("zaps the bricks past steel in a row zapper's row, leaving the steel whole", () => {
    const flown = flyPicture({ picture: ["o.#.-.#.o"] });

    expect([reachesOf(flown), standing(flown)]).toEqual([[[0, 8]], [2, 6]]);
  });

  it("zaps the bricks over steel in a column zapper's column as far as the ceiling, and none waiting over it", () => {
    const picture = [
      "....o....",
      "....o....",
      "....o....",
      "....#....",
      "....|....",
    ];

    const flown = flyPicture({ picture, lowestRow: 7 });

    expect([
      eventsOf(flown, "zap").map(({ at, reaches }) => [at, reaches]),
      standing(flown),
    ]).toEqual([[[6.5 + ZAP_DELAY, [22, 31]]], [13, 40]]);
  });

  // The row zap breaks the column zapper, whose zap breaks the brick over it.
  it("sets off a zap from a zapper a zap breaks, half a unit after it", () => {
    const flown = flyPicture({ picture: [".o.......", ".|..-...."] });

    expect(
      eventsOf(flown, "zap").map(({ at, cell, reaches }) => [
        at,
        cell,
        reaches,
      ]),
    ).toEqual([
      [2.5 + ZAP_DELAY, 4, [1]],
      [2.5 + 2 * ZAP_DELAY, 1, [10]],
    ]);
  });

  // The bomb stands in field row 4, its ring's lowest bricks in row 3 on
  // either side of the fuzzball's way up; the brick two cells off is out of
  // its reach.
  it("blasts the bricks in the eight cells about a bomb half a unit after it breaks, breaking each", () => {
    const flown = flyPicture({
      picture: ["...ooo...", "..oo*o...", "...o.o..."],
    });

    expect([
      eventsOf(flown, "zap").map(({ at, cell, pattern }) => [
        at,
        cell,
        pattern,
      ]),
      reachesOf(flown),
      eventsOf(flown, "break").map(({ cell, by }) => [cell, by]),
      standing(flown),
    ]).toEqual([
      [[3.5 + ZAP_DELAY, 13, "blast"]],
      [[3, 5, 12, 14, 21, 22, 23]],
      [
        [13, "fuzzball"],
        [3, "blast"],
        [5, "blast"],
        [12, "blast"],
        [14, "blast"],
        [21, "blast"],
        [22, "blast"],
        [23, "blast"],
      ],
      [11],
    ]);
  });

  it("leaves the steel about a bomb whole", () => {
    const flown = flyPicture({ picture: ["...#*#..."] });

    expect([reachesOf(flown), standing(flown)]).toEqual([[[]], [3, 5]]);
  });

  // The bomb stands in the field's top row, a brick waiting over it.
  it("blasts no brick waiting over the ceiling", () => {
    const flown = flyPicture({
      picture: ["....o....", "...o*o..."],
      lowestRow: 10,
    });

    expect([reachesOf(flown), standing(flown)]).toEqual([[[3, 5]], [13]]);
  });

  it("sets off a bomb a blast breaks, half a unit after it", () => {
    const flown = flyPicture({ picture: ["...**...."] });

    expect(eventsOf(flown, "zap").map(({ at, cell }) => [at, cell])).toEqual([
      [2.5 + ZAP_DELAY, 4],
      [2.5 + 2 * ZAP_DELAY, 3],
    ]);
  });

  // The column zapper's zap breaks the bomb and leaves the tough brick
  // between them with two hits, which the bomb's blast takes.
  it("blasts the brick under a bomb a zap breaks", () => {
    const flown = flyPicture({
      picture: ["....*....", "....4....", "....|...."],
    });

    expect([
      reachesOf(flown),
      eventsOf(flown, "break").map(({ cell, by }) => [cell, by]),
    ]).toEqual([
      [[13, 22], [13]],
      [
        [4, "fuzzball"],
        [22, "zap"],
        [13, "blast"],
      ],
    ]);
  });

  // The cross zapper stands in field row 1, steel in its row and over it,
  // its column's bricks up to the ceiling nine rows over it, and one waiting
  // over the ceiling.
  it("zaps a cross zapper's row and its column, past steel and as far as the ceiling", () => {
    const picture = [
      "....o....",
      ...Array<string>(8).fill("....o...."),
      "....#....",
      "o.#.+.o.o",
    ];

    const flown = flyPicture({ picture, lowestRow: 1 });

    expect([reachesOf(flown), standing(flown)]).toEqual([
      [[0, 6, 8, 22, 31, 40, 49, 58, 67, 76, 85]],
      [2, 13, 94],
    ]);
  });

  // The X zapper stands in field row 4, a brick on each diagonal one, two
  // and three cells off it, and four cells off it toward the ceiling; the
  // fuzzball flies up between the bricks under it.
  it("zaps an X zapper's diagonals three cells each way, past steel", () => {
    const flown = flyPicture({
      picture: [
        "o.......o",
        ".o.....o.",
        "..#...o..",
        "...o.o...",
        "....x....",
        "...o.o...",
        "..o...o..",
        ".o.....o.",
      ],
      lowestRow: 1,
    });

    expect([reachesOf(flown), standing(flown)]).toEqual([
      [[1, 7, 11, 15, 21, 23, 39, 41, 51, 55, 61]],
      [47, 63, 71],
    ]);
  });
});
