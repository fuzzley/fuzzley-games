import {
  BOULDER_HOLD_MS,
  BURST_MS,
  CLEARED_MS,
  FLASH_MS,
  HELD_MS,
  MUZZLE_MS,
  SHAKE_MS,
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
  it("waits for the last pod's burst where motion is welcome", () => {
    expect(resultDelayMs(true)).toBe(BURST_MS);
  });

  it("waits for nothing where it isn't", () => {
    expect(resultDelayMs(false)).toBe(0);
  });
});

describe("the table's rows", () => {
  it("shows a shot's flash for two frames at 60 frames a second, 33 ms", () => {
    expect(MUZZLE_MS).toBe(Math.floor(2000 / 60));
  });

  it("plays a held hit's spark for 150 ms", () => {
    expect(HELD_MS).toBe(150);
  });

  it("flashes a held hit's struck faces within its spark's time", () => {
    expect(FLASH_MS).toBeLessThanOrEqual(HELD_MS);
  });
});

describe("the budget", () => {
  it("stills a shake within 0.3 s of its blow, as the plan's budget has it", () => {
    expect(SHAKE_MS).toBeLessThanOrEqual(300);
  });

  it("holds the field still for a boulder for less than its shake, so it shakes after", () => {
    expect(BOULDER_HOLD_MS).toBeLessThan(SHAKE_MS);
  });
});
