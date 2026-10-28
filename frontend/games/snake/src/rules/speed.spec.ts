import { SPEEDS, SPEED_INFO, isSpeed, stepMs } from "./speed";

describe("speed", () => {
  it("starts each speed at its first step's length", () => {
    expect(SPEEDS.map((speed) => stepMs(speed, 0))).toEqual([160, 125, 90]);
  });

  it("shortens the step a little with each apple eaten", () => {
    expect(stepMs("normal", 5)).toBe(115);
  });

  it("shortens it no further than the speed's fastest", () => {
    expect(SPEEDS.map((speed) => stepMs(speed, 1000))).toEqual(
      SPEEDS.map((speed) => SPEED_INFO[speed].fastestMs),
    );
  });

  it("knows a speed by its name", () => {
    expect([isSpeed("fast"), isSpeed("ludicrous")]).toEqual([true, false]);
  });
});
