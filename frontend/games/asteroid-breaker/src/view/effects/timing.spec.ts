import {
  BLAST_FLASH_MS,
  BLAST_MS,
  BLAST_RING_MS,
  BOULDER_HOLD_MS,
  BOULDER_THROW_MS,
  BURST_MS,
  CLEARED_MS,
  FLASH_GAP_MS,
  FLASH_MS,
  HELD_MS,
  MUZZLE_MS,
  POD_FLASH_MS,
  RESCUE_MS,
  SHAKE_MS,
  SLOW_MS,
  SLOW_PACE,
  STILL_MARK_MS,
  ZAP_HOLD_MS,
  ZAP_MS,
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
  it("waits for the last pod's pilot's bubble to rise and go where motion is welcome, 1.4 s", () => {
    expect(resultDelayMs(true)).toBe(1400);
  });

  it("waits past the last pod's burst", () => {
    expect(resultDelayMs(true)).toBeGreaterThanOrEqual(BURST_MS);
  });

  it("waits for nothing where it isn't", () => {
    expect(resultDelayMs(false)).toBe(0);
  });
});

describe("the table's rows", () => {
  it("holds the field still 60 ms for a zap, its light lasting 350 more", () => {
    expect([ZAP_HOLD_MS, ZAP_MS - ZAP_HOLD_MS]).toEqual([60, 350]);
  });

  it("plays a fuzzball caught for 300 ms", () => {
    expect(RESCUE_MS).toBe(300);
  });

  it("fades the pod's flash, and its glow, before the field may flash again, so one glows at a time", () => {
    expect(POD_FLASH_MS).toBeLessThan(FLASH_GAP_MS);
  });

  it("shows a shot's flash for two frames at 60 frames a second, 33 ms", () => {
    expect(MUZZLE_MS).toBe(Math.floor(2000 / 60));
  });

  it("plays a blast for 600 ms", () => {
    expect(BLAST_MS).toBe(600);
  });

  it("fades a blast's flash before its ring has swept out", () => {
    expect(BLAST_FLASH_MS).toBeLessThan(BLAST_RING_MS);
  });

  it("fades a blast's flash, and its glow, before the field may flash again, so one glows at a time", () => {
    expect(BLAST_FLASH_MS).toBeLessThan(FLASH_GAP_MS);
  });

  it("sweeps a blast's ring out within its time", () => {
    expect(BLAST_RING_MS).toBeLessThan(BLAST_MS);
  });

  it("plays a boulder's break for 90 ms held still, then 700 ms", () => {
    expect([BOULDER_HOLD_MS, BOULDER_THROW_MS]).toEqual([90, 700]);
  });

  it("slows the flourishes to a third for 250 ms as the last rock goes", () => {
    expect([SLOW_MS, SLOW_PACE]).toEqual([250, 1 / 3]);
  });

  it("stands a still mark as long as a blast's still ring", () => {
    expect(STILL_MARK_MS).toBe(BLAST_MS);
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
