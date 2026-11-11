import { eventsOf, flyPicture } from "../../../testing/flights";
import { BRICK_KINDS, type BrickKinds } from "../../catalog/bricks";
import type { ZapPattern } from "../../flight/events";
import { ZAP_DELAY, ZAP_HITS } from "../../tuning";

/** Returns the catalog with its row zapper zapping another pattern, a cell each way. */
function zappingIn(pattern: ZapPattern): BrickKinds {
  const traits = [{ kind: "zaps", pattern, hits: ZAP_HITS, reach: 1 }] as const;
  return {
    ...BRICK_KINDS,
    rowZapper: { ...BRICK_KINDS.rowZapper, traits },
  };
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

    expect([
      eventsOf(flown, "zap").map(({ reaches }) => reaches),
      flown.wall.bricks.map((brick) => brick?.kind ?? null),
    ]).toEqual([
      [[0, 8]],
      [null, null, "steel", null, null, null, "steel", null, null],
    ]);
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
      flown.wall.bricks.flatMap((brick, cell) =>
        brick === null ? [] : [cell],
      ),
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

  it.each([
    ["blast", 10],
    ["cross", 11],
    ["x", 13],
  ] as const)(
    "throws as a zapper of the %s pattern breaks, which isn't played until level %i",
    (pattern, level) => {
      const kinds = zappingIn(pattern);

      const flying = () => flyPicture({ picture: ["....-...."], kinds });

      expect(flying).toThrow(
        `A "${pattern}" zap is not until level ${String(level)}.`,
      );
    },
  );
});
