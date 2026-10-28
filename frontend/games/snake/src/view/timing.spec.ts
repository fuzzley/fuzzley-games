import { FADE_MS, resultDelayMs } from "./timing";

describe("resultDelayMs", () => {
  it("waits for the fade where motion is welcome", () => {
    expect(resultDelayMs(true)).toBe(FADE_MS);
  });

  it("waits for nothing where it isn't", () => {
    expect(resultDelayMs(false)).toBe(0);
  });
});
