import {
  CLEARED_MS,
  JUMP_MS,
  LOST_MS,
  LOST_STILL_MS,
  SHAKE_MS,
  SHARDS_MS,
  STEP_MS,
  clearedDelayMs,
  resultDelayMs,
} from "./timing";

describe("the wall's step and jump", () => {
  it("steps the wall a row in 260 ms and jumps it in 480 ms, however far", () => {
    expect([STEP_MS, JUMP_MS]).toEqual([260, 480]);
  });
});

describe("clearedDelayMs", () => {
  it("waits for the last brick's shards where motion is welcome", () => {
    const delay = clearedDelayMs(true);

    expect({ delay, outlasts: delay >= SHARDS_MS }).toEqual({
      delay: CLEARED_MS,
      outlasts: true,
    });
  });

  it("waits for nothing where it isn't", () => {
    expect(clearedDelayMs(false)).toBe(0);
  });
});

describe("resultDelayMs", () => {
  it("waits for a lost level's shake where motion is welcome", () => {
    const delay = resultDelayMs(true);

    expect({ delay, outlasts: delay >= SHAKE_MS }).toEqual({
      delay: LOST_MS,
      outlasts: true,
    });
  });

  it("waits, where it isn't, for the brick that lost the level to be seen", () => {
    expect(resultDelayMs(false)).toBe(LOST_STILL_MS);
  });
});
