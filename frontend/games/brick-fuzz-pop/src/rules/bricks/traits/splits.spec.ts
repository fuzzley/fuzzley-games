import { eventsOf, flyPicture, near } from "../../../testing/flights";
// A fuzzball straight up from the floor meets a prism in field row 3 at 2.5.
// A plain one turns straight down off it; one of charge 2 breaks it and
// flies on straight up, with 1 left.
describe("SPLITS_RULE, flown", () => {
  const half = Math.sqrt(3) / 2;

  it.each([
    ["turns to", 0, -1],
    ["flies on with", 2, 1],
  ])(
    "sends two more fuzzballs off plain, 30° either side of the heading a fuzzball %s, its charge %i",
    (_, charge, up) => {
      const flown = flyPicture({ picture: ["....P...."], charge });

      expect([
        eventsOf(flown, "split"),
        eventsOf(flown, "launch")
          .slice(1)
          .map(({ role, dx, dy, charge: carried }) => [role, dx, dy, carried]),
      ]).toEqual([
        [{ at: 2.5, kind: "split", ball: 0, cell: 4, into: [1, 2] }],
        near([
          ["split", -0.5 * up, half * up, 0],
          ["split", 0.5 * up, half * up, 0],
        ]),
      ]);
    },
  );

  // The row zapper's zap breaks the prism two cells to its left.
  it("only breaks a prism a zap breaks", () => {
    const flown = flyPicture({ picture: ["..P.-...."] });

    expect([
      eventsOf(flown, "split"),
      eventsOf(flown, "break").map(({ cell, by }) => [cell, by]),
    ]).toEqual([
      [],
      [
        [4, "fuzzball"],
        [2, "zap"],
      ],
    ]);
  });
});
