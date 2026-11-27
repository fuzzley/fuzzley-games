import { FEEL } from "./feel";
import { SPEEDS, pacedFeel, quickeningOf } from "./pace";

describe("SPEEDS", () => {
  it("offers Normal and Fast", () => {
    expect(SPEEDS).toEqual(["normal", "fast"]);
  });
});

describe("pacedFeel", () => {
  it("plays the feel as it is at Normal", () => {
    expect(pacedFeel(FEEL, "normal")).toEqual(FEEL);
  });

  it("shortens each time by the Fast pace at Fast", () => {
    const fast = pacedFeel(FEEL, "fast");

    expect([fast.swapMs, fast.fallBaseMs, fast.flightMs]).toEqual([
      FEEL.swapMs / FEEL.fastPace,
      FEEL.fallBaseMs / FEEL.fastPace,
      FEEL.flightMs / FEEL.fastPace,
    ]);
  });

  it("keeps the limits and a tuft's flight in the player's own time at Fast", () => {
    const fast = pacedFeel(FEEL, "fast");

    expect([
      fast.flashGapMs,
      fast.popSoundGapMs,
      fast.goalSoundGapMs,
      fast.tuftLifeMs,
      fast.tuftLifeSpreadMs,
    ]).toEqual([
      FEEL.flashGapMs,
      FEEL.popSoundGapMs,
      FEEL.goalSoundGapMs,
      FEEL.tuftLifeMs,
      FEEL.tuftLifeSpreadMs,
    ]);
  });

  it("keeps a shake's fading and the life between moves in the player's own time at Fast", () => {
    const fast = pacedFeel(FEEL, "fast");

    expect([
      fast.shakeHalfLifeMs,
      fast.blinkLeastMs,
      fast.blinkMostMs,
      fast.hintWaitMs,
    ]).toEqual([
      FEEL.shakeHalfLifeMs,
      FEEL.blinkLeastMs,
      FEEL.blinkMostMs,
      FEEL.hintWaitMs,
    ]);
  });

  it("keeps the breaths, the hint's hops and its hand in the player's own time at Fast", () => {
    const fast = pacedFeel(FEEL, "fast");

    expect([
      fast.pufferBreathRadianMs,
      fast.wispSwayRadianMs,
      fast.staticStepMs,
      fast.hintLookMs,
      fast.hintUpMs,
      fast.hintDownMs,
      fast.hintHopGapMs,
      fast.handLoopMs,
    ]).toEqual([
      FEEL.pufferBreathRadianMs,
      FEEL.wispSwayRadianMs,
      FEEL.staticStepMs,
      FEEL.hintLookMs,
      FEEL.hintUpMs,
      FEEL.hintDownMs,
      FEEL.hintHopGapMs,
      FEEL.handLoopMs,
    ]);
  });

  it("keeps every number that is no time at Fast", () => {
    const fast = pacedFeel(FEEL, "fast");

    expect([fast.pickUpScale, fast.mostFlights, fast.fastPace]).toEqual([
      FEEL.pickUpScale,
      FEEL.mostFlights,
      FEEL.fastPace,
    ]);
  });
});

describe("quickeningOf", () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 0.94],
    [4, 0.82],
  ])("plays wave %i at %d of its time", (wave, share) => {
    expect(quickeningOf(wave, FEEL)).toBeCloseTo(share, 9);
  });

  it("plays no wave quicker than the feel's quickest", () => {
    expect(quickeningOf(12, FEEL)).toBe(FEEL.quickest);
  });
});
