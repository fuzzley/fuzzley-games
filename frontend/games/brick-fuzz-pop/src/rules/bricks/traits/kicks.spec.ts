import { eventsOf, flyPicture, near } from "../../../testing/flights";
import { STAND_INS } from "../../../testing/stand_ins";
import { RADIUS } from "../../tuning";

/** How far from its middle the stand-in bumper's disc reaches. */
const DISC = 0.38;

// The bumper stands in for the row zapper, its middle at (4.5, 3.5). Straight
// up half the reach of its disc to the right of its middle, a fuzzball
// meets it 30° round from straight below, where a mirror would send it off
// at 30° over the floor.
describe("KICKS_RULE, flown", () => {
  it("kicks a fuzzball meeting a bumper's disc straight away from its middle", () => {
    const reach = DISC + RADIUS;
    const x = 4.5 + reach / 2;
    const half = Math.sqrt(3) / 2;

    const flown = flyPicture({ picture: ["....-...."], x, kinds: STAND_INS });

    expect(
      eventsOf(flown, "turn")
        .slice(0, 1)
        .map(({ x: atX, y, dx, dy, off }) => ({ atX, y, dx, dy, off })),
    ).toEqual([
      near({
        atX: x,
        y: 3.5 - reach * half,
        dx: 0.5,
        dy: -half,
        off: "bumper",
      }),
    ]);
  });
});
