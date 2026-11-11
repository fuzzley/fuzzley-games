import { eventsOf, flyPicture } from "../../../testing/flights";
import { ZAP_DELAY } from "../../tuning";

/** A wall's lowest row with three cages out of the way of a fuzzball straight up the middle, which number a cage over them 3, whatever its row. */
const THREE_CAGES = "C.C.....C";

// A fuzzball straight up from the floor meets a brick in field row 3 at 2.5,
// one in row 5 at 4.5.
describe("FREES_RULE", () => {
  it("frees the friend a cage holds, in its tint, as a fuzzball breaks it", () => {
    const flown = flyPicture({
      picture: ["....C....", ".........", THREE_CAGES],
      charge: 2,
    });

    expect(eventsOf(flown, "free")).toEqual([
      { at: 4.5, kind: "free", cell: 22, ink: 3 },
    ]);
  });

  it("frees nothing from a cage a fuzzball only strikes", () => {
    const flown = flyPicture({ picture: ["....C...."] });

    expect([eventsOf(flown, "free"), flown.wall.bricks[4]?.hits]).toEqual([
      [],
      1,
    ]);
  });

  // The cage stands two cells left of the row zapper.
  it("frees the friend, in its cage's tint, as a zap breaks the cage", () => {
    const flown = flyPicture({
      picture: ["..C.-....", ".........", THREE_CAGES],
    });

    expect(eventsOf(flown, "free")).toEqual([
      { at: 4.5 + ZAP_DELAY, kind: "free", cell: 20, ink: 3 },
    ]);
  });
});
