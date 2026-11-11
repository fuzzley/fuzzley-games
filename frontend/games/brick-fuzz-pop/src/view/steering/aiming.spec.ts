import { AIMS } from "../../rules/aims";
import { STRAIGHT_UP } from "./aiming";

describe("STRAIGHT_UP", () => {
  it("is the middle aim", () => {
    expect(STRAIGHT_UP * 2 + 1).toBe(AIMS.length);
  });

  it("points straight up", () => {
    const [dx, dy] = AIMS[STRAIGHT_UP] ?? [Number.NaN, Number.NaN];

    expect(dx).toBeCloseTo(0, 12);
    expect(dy).toBe(1);
  });
});
