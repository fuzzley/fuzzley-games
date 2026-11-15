import type { Point } from "@fz/phaser/shapes";
import { cracksOf } from "./cracks";
import { makeRock } from "./rock_shape";
import { reachAt } from "./space";

// The cracks the art kit's `cracksOf()` draws on its boulder cut from the
// seed 3 for five hits held, copied to four places, flat, x then y.
const KIT_BOULDER_CRACKS = [
  [
    0.7492, -0.3655, 0.6647, -0.2912, 0.5662, -0.243, 0.4512, -0.2258, 0.3737,
    -0.1385, 0.2661, -0.1073,
  ],
  [0.5662, -0.243, 0.6357, -0.0719, 0.6334, 0.1108, 0.6532, 0.2899],
  [
    -0.1922, 0.8522, -0.1673, 0.7147, -0.1504, 0.5753, -0.1357, 0.4354, -0.0857,
    0.3036, -0.0364, 0.1716,
  ],
  [-0.1504, 0.5753, -0.2163, 0.4347, -0.3491, 0.3503, -0.44, 0.2307],
  [
    -0.5503, -0.6829, -0.4799, -0.5573, -0.3354, -0.5119, -0.2603, -0.3914,
    -0.1829, -0.2734, -0.0471, -0.2187,
  ],
  [-0.3354, -0.5119, -0.1844, -0.5398, -0.0273, -0.5293, 0.1196, -0.5837],
  [
    0.7637, 0.5163, 0.6298, 0.4145, 0.528, 0.2658, 0.3284, 0.2602, 0.2397,
    0.0923, 0.0705, 0.0421,
  ],
  [0.528, 0.2658, 0.3919, 0.3606, 0.3613, 0.5397, 0.2301, 0.6384],
  [
    -0.7699, 0.3457, -0.6264, 0.3233, -0.4849, 0.2956, -0.3749, 0.1889, -0.2365,
    0.1533, -0.1117, 0.0838,
  ],
  [-0.4849, 0.2956, -0.5319, 0.1125, -0.5298, -0.0809, -0.6014, -0.2588],
] as const;

/** Returns lines as flat lists to four places, as the kit's are copied. */
function flat(lines: readonly (readonly Point[])[]): readonly number[][] {
  return lines.map((line) =>
    line.flatMap(({ x, y }) => [
      Math.round(x * 1e4) / 1e4 + 0,
      Math.round(y * 1e4) / 1e4 + 0,
    ]),
  );
}

describe("cracksOf()", () => {
  const boulder = makeRock("boulder", "boulder", 3);

  it("cracks a rock as the kit cracks it", () => {
    const cracks = cracksOf(boulder, 5);

    expect(flat(cracks)).toEqual(KIT_BOULDER_CRACKS);
  });

  it("draws no crack for no hit", () => {
    expect(cracksOf(boulder, 0)).toEqual([]);
  });

  it("draws a crack and its branch for each hit, those for fewer hits the first of those for more", () => {
    const three = cracksOf(boulder, 3);

    const five = cracksOf(boulder, 5);

    expect(three).toHaveLength(6);
    expect(five.slice(0, 6)).toEqual(three);
  });

  it("keeps every crack inside the rock's rim, short of its edge", () => {
    const rock = makeRock("iron", "large", 2);

    const points = cracksOf(rock, 4).flat();

    expect(
      points.filter(
        ({ x, y }) =>
          Math.hypot(x, y) > 0.94 * reachAt(rock.rim, Math.atan2(y, x)) + 1e-9,
      ),
    ).toEqual([]);
  });
});
