import { fieldFrom } from "../testing/field_picture";
import { nextDraw } from "./draws";

describe("nextDraw", () => {
  it("keeps the numbers a field draws, which saved games rely on", () => {
    const field = fieldFrom(["o"], { seed: 1 });

    const draws = [nextDraw(field), nextDraw(field)].map((n) => n * 2 ** 32);

    expect(draws).toEqual([2197834832, 2224532361]);
  });

  it("counts each draw", () => {
    const field = fieldFrom(["o"]);

    nextDraw(field);

    expect(field.draws).toBe(1);
  });
});
