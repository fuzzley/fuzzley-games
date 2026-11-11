import { eventsOf, flyPicture } from "../../../testing/flights";
import { CAGE } from "../../../testing/stand_ins";
import { BRICK_KINDS } from "../../catalog/bricks";
import { ZAP_DELAY } from "../../tuning";

/** The catalog with a cage of 2 hits standing in for the tough brick of 2, which takes its row's tint. */
const CAGES = { ...BRICK_KINDS, tough: CAGE };

// A fuzzball straight up from the floor meets a brick in field row 3 at 2.5,
// one in row 5 at 4.5.
describe("FREES_RULE", () => {
  // The cage stands in wall row 2, which tints it 2.
  it("frees the friend a cage holds, in its tint, as a fuzzball breaks it", () => {
    const flown = flyPicture({
      picture: ["....2....", ".........", "........."],
      charge: 2,
      kinds: CAGES,
    });

    expect(eventsOf(flown, "free")).toEqual([
      { at: 4.5, kind: "free", cell: 22, ink: 2 },
    ]);
  });

  it("frees nothing from a cage a fuzzball only strikes", () => {
    const flown = flyPicture({ picture: ["....2...."], kinds: CAGES });

    expect([eventsOf(flown, "free"), flown.wall.bricks[4]?.hits]).toEqual([
      [],
      1,
    ]);
  });

  // The cage stands two cells left of the row zapper in wall row 2, which
  // tints it 2.
  it("frees the friend, in its cage's tint, as a zap breaks the cage", () => {
    const flown = flyPicture({
      picture: ["..2.-....", ".........", "........."],
      kinds: CAGES,
    });

    expect(eventsOf(flown, "free")).toEqual([
      { at: 4.5 + ZAP_DELAY, kind: "free", cell: 20, ink: 2 },
    ]);
  });
});
