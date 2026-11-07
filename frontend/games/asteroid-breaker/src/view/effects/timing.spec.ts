import {
  CLEARED_MS,
  SHAKE_DELAY_MS,
  SHAKE_MS,
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
});

describe("resultDelayMs", () => {
  it("waits for the later of the last ship's shards and its shake where motion is welcome", () => {
    const delay = resultDelayMs(true);
    const ends = [SHARDS_MS, SHAKE_DELAY_MS + SHAKE_MS];

    expect({
      both: ends.every((end) => delay >= end),
      either: ends.includes(delay),
    }).toEqual({ both: true, either: true });
  });

  it("waits for nothing where it isn't", () => {
    expect(resultDelayMs(false)).toBe(0);
  });
});
