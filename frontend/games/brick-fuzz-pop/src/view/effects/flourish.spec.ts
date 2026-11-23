import { RADIUS } from "@fz/brick-wall/rules/field";
import { HOP_HEIGHT, hopHeight } from "./flourish";

describe("hopHeight", () => {
  /** Cages' heights over the floor: in the floor's row, and far up a deep field. */
  const CAGES = [0.5, 6.5, 20.5];

  it.each(CAGES)(
    "hops a friend from a cage %f units up down to the floor",
    (from) => {
      expect([hopHeight(0, from), hopHeight(1, from)]).toEqual([
        expect.closeTo(from, 9),
        expect.closeTo(RADIUS, 9),
      ]);
    },
  );

  it.each(CAGES)(
    "hops it up over a cage %f units up on the way, and no higher",
    (from) => {
      const fine = Array.from({ length: 1001 }, (_, i) => i / 1000);
      const top = Math.max(...fine.map((done) => hopHeight(done, from)));

      expect(top).toBeCloseTo(from + HOP_HEIGHT, 3);
    },
  );
});
