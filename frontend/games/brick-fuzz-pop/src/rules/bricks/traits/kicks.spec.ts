import { eventsOf, flyPicture, near } from "../../../testing/flights";
import { BRICK_KINDS } from "../../catalog/bricks";
import { RADIUS } from "../../tuning";

// The bumper's middle stands at (4.5, 3.5). Straight up half the reach of
// its disc to the right of its middle, a fuzzball meets it 30° round from
// straight below, where a mirror would send it off at 30° over the floor.
describe("KICKS_RULE, flown", () => {
  const reach = BRICK_KINDS.bumper.traits[2].radius + RADIUS;
  const x = 4.5 + reach / 2;
  const half = Math.sqrt(3) / 2;

  it("kicks a fuzzball meeting a bumper's disc straight away from its middle", () => {
    const flown = flyPicture({ picture: ["....B...."], x });

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

  it("kicks a charged fuzzball without its charge, the bumper whole", () => {
    const flown = flyPicture({ picture: ["....B...."], x, charge: 3 });

    expect([
      eventsOf(flown, "strike").map(({ took, left, charge, earthed }) => [
        took,
        left,
        charge,
        earthed,
      ]),
      flown.wall.bricks[4]?.kind,
    ]).toEqual([[[0, 0, 0, true]], "bumper"]);
  });
});
