import { nearness } from "./every_layout";
import { fieldFrom, placeRock } from "./field_picture";

describe("nearness", () => {
  it("measures the nearest rock across the wrap", () => {
    const field = fieldFrom(["^.......L........L"]);

    expect(nearness(field)).toEqual({ off: 4, flown: 4 });
  });

  it("flies the rocks on to see how near their courses come", () => {
    const field = fieldFrom(["^"]);
    // 24 units off and heading for the ship, which it reaches in 2 of the 3
    // seconds a course is judged by.
    placeRock(field, "large", 26, 2).vx = -12;

    const { off, flown } = nearness(field);

    expect([off, flown]).toEqual([24, expect.closeTo(0, 1)]);
  });
});
