import {
  CLEARED_MS,
  FADE_MS,
  HOLD_MS,
  SHARDS_MS,
  clearedDelayMs,
  resultDelayMs,
} from "./timing";

describe("clearedDelayMs", () => {
  it("waits for the last shards where motion is welcome", () => {
    expect(clearedDelayMs(true)).toBe(CLEARED_MS);
  });

  it("waits for nothing where it isn't", () => {
    expect(clearedDelayMs(false)).toBe(0);
  });

  it("waits out the last brick's hold and its shards where motion is welcome", () => {
    expect(clearedDelayMs(true)).toBeGreaterThanOrEqual(HOLD_MS + SHARDS_MS);
  });
});

describe("resultDelayMs", () => {
  it("waits for the last ball's fade where motion is welcome", () => {
    expect(resultDelayMs(true)).toBe(FADE_MS);
  });

  it("waits out a won run's last hold and its shards where motion is welcome", () => {
    expect(resultDelayMs(true)).toBeGreaterThanOrEqual(HOLD_MS + SHARDS_MS);
  });

  it("waits for nothing where it isn't", () => {
    expect(resultDelayMs(false)).toBe(0);
  });
});
