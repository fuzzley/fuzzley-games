import {
  BOB,
  BREATH,
  FLASH_MOST,
  FLICKER,
  LOST_RING_REACH,
  PULSE_LEAST,
  SHIELD_RING_REACH,
  TRAIL_MOST,
  blinkShown,
  bobShare,
  breathScale,
  fadeAlpha,
  flashAlpha,
  flashDue,
  flickerShare,
  kickShare,
  pointsLabel,
  pulseAlpha,
  riseOf,
  ringReachOf,
  shardCount,
  shareDone,
  spread,
  trailAlpha,
} from "./flourish";
import type { FieldEvent, FieldEventKind } from "./frame";
import {
  DASH_TRAIL,
  FLASH_GAP_MS,
  LEAST_SHARDS,
  MOST_SHARDS,
  POINTS_RISE,
} from "./timing";

/** Returns an event of a kind that reaches as far as given. */
function reaching(kind: FieldEventKind, reach: number): FieldEvent {
  return {
    serial: 1,
    kind,
    x: 0,
    y: 0,
    rock: null,
    size: null,
    pickup: null,
    pilot: null,
    points: 0,
    times: 0,
    reach,
    chain: 0,
  };
}

/** Returns what a motion gives at many times over ten seconds, as it idles. */
function overTime<T>(motion: (seconds: number) => T): readonly T[] {
  return Array.from({ length: 1000 }, (_, i) => motion(i / 100));
}

describe("shareDone", () => {
  it.each([
    [1000, 0],
    [1050, 0.5],
    [1100, 1],
    [1200, 1],
    [900, 0],
  ])(
    "is, at %i, %s of the way through a flourish of 100 ms begun at 1000",
    (now, done) => {
      expect(shareDone(1000, now, 100)).toBe(done);
    },
  );
});

describe("the flourishes' curves", () => {
  it("spreads from nothing to all of it, fast and then slowing", () => {
    expect([spread(0), spread(0.5), spread(1)]).toEqual([0, 0.875, 1]);
  });

  it("fades from opaque to nothing", () => {
    expect([fadeAlpha(0), fadeAlpha(0.25), fadeAlpha(1)]).toEqual([1, 0.75, 0]);
  });

  it("kicks the field all the way at first, and settles it, quicker at first", () => {
    expect([kickShare(0), kickShare(0.5), kickShare(1)]).toEqual([1, 0.25, 0]);
  });

  it("flashes a rock that holds a hit at its brightest at first, and fades it", () => {
    expect([flashAlpha(0), flashAlpha(1)]).toEqual([FLASH_MOST, 0]);
  });
});

describe("trailAlpha", () => {
  it("draws a dash's first outline, nearest the ship, the most opaque", () => {
    expect(trailAlpha(0)).toBe(TRAIL_MOST);
  });

  it("draws each after it a like share fainter, the last still seen", () => {
    const alphas = Array.from({ length: DASH_TRAIL }, (_, i) => trailAlpha(i));

    expect(alphas).toEqual([TRAIL_MOST, (TRAIL_MOST * 2) / 3, TRAIL_MOST / 3]);
  });
});

describe("flashDue", () => {
  it("flashes a field that hasn't flashed", () => {
    expect(flashDue(-Infinity, 0)).toBe(true);
  });

  it("flashes again once the gap after the last flash is past", () => {
    expect(flashDue(1000, 1000 + FLASH_GAP_MS)).toBe(true);
  });

  it("holds a flash back within the gap after the last, so the field flashes under three times a second", () => {
    expect(flashDue(1000, 1000 + FLASH_GAP_MS - 1)).toBe(false);
    expect(1000 / FLASH_GAP_MS).toBeLessThan(3);
  });
});

describe("pointsLabel", () => {
  it.each([
    [40, 1, "+40"],
    [40, 2, "+40 ×2"],
    [1500, 4, "+1,500 ×4"],
  ])("labels %i points at ×%i %s", (points, times, label) => {
    expect(pointsLabel({ ...reaching("scored", 0), points, times })).toBe(
      label,
    );
  });
});

describe("riseOf", () => {
  it("raises points their rise over their time", () => {
    expect([riseOf(0, true), riseOf(0.5, true), riseOf(1, true)]).toEqual([
      0,
      POINTS_RISE / 2,
      POINTS_RISE,
    ]);
  });

  it("holds points where they were scored where motion isn't welcome", () => {
    expect(riseOf(1, false)).toBe(0);
  });
});

describe("ringReachOf", () => {
  it.each(["blast", "nova"] as const)(
    "sweeps a %s's ring out to its reach",
    (kind) => {
      expect(ringReachOf(reaching(kind, 7))).toBe(7);
    },
  );

  it.each([
    ["shielded", SHIELD_RING_REACH],
    ["lost", LOST_RING_REACH],
  ] as const)("sweeps a %s ring out to its own reach", (kind, reach) => {
    expect(ringReachOf(reaching(kind, 0))).toBe(reach);
  });
});

describe("shardCount", () => {
  it("scatters every count from the fewest shards to the most, by the event's serial", () => {
    const counts = new Set(
      Array.from({ length: 20 }, (_, serial) => shardCount(serial)),
    );

    expect([...counts].sort()).toEqual(
      Array.from(
        { length: MOST_SHARDS - LEAST_SHARDS + 1 },
        (_, i) => LEAST_SHARDS + i,
      ),
    );
  });
});

describe("breathScale", () => {
  it("swells a pickup and shrinks it by its breath as it idles", () => {
    const scales = overTime((seconds) => breathScale(seconds, 0, true));

    expect(Math.max(...scales)).toBeCloseTo(1 + BREATH, 3);
    expect(Math.min(...scales)).toBeCloseTo(1 - BREATH, 3);
  });

  it("breathes two pickups apart, by their phases", () => {
    expect(breathScale(0, 1, true)).not.toBeCloseTo(breathScale(0, 0, true));
  });

  it("holds a pickup at its size where motion isn't welcome", () => {
    expect(
      new Set(overTime((seconds) => breathScale(seconds, 1, false))),
    ).toEqual(new Set([1]));
  });
});

describe("bobShare", () => {
  it("bobs a stray up and down its bob as it idles", () => {
    const shares = overTime((seconds) => bobShare(seconds, 0, true));

    expect(Math.max(...shares)).toBeCloseTo(BOB, 3);
    expect(Math.min(...shares)).toBeCloseTo(-BOB, 3);
  });

  it("holds a stray at its place where motion isn't welcome", () => {
    expect(new Set(overTime((seconds) => bobShare(seconds, 1, false)))).toEqual(
      new Set([0]),
    );
  });
});

describe("pulseAlpha", () => {
  it("starts a comet's warning full, faintest half a pulse on, and full again a pulse on", () => {
    // It pulses 0.8 times a second, so a pulse lasts 1.25 s.
    expect(pulseAlpha(0, true)).toBe(1);
    expect(pulseAlpha(0.625, true)).toBeCloseTo(PULSE_LEAST, 9);
    expect(pulseAlpha(1.25, true)).toBeCloseTo(1, 9);
  });

  it("pulses a comet's warning between full and its faintest", () => {
    const alphas = overTime((seconds) => pulseAlpha(seconds, true));

    expect(Math.max(...alphas)).toBeCloseTo(1, 3);
    expect(Math.min(...alphas)).toBeCloseTo(PULSE_LEAST, 3);
  });

  it("holds a comet's warning full where motion isn't welcome", () => {
    expect(new Set(overTime((seconds) => pulseAlpha(seconds, false)))).toEqual(
      new Set([1]),
    );
  });
});

describe("flickerShare", () => {
  it("flickers the flame below its full length by its flicker, and never past it", () => {
    const shares = overTime((seconds) => flickerShare(seconds, true));

    expect(Math.max(...shares)).toBeCloseTo(1, 2);
    expect(Math.min(...shares)).toBeCloseTo(1 - FLICKER, 2);
  });

  it("holds the flame at its full length where motion isn't welcome", () => {
    expect(
      new Set(overTime((seconds) => flickerShare(seconds, false))),
    ).toEqual(new Set([1]));
  });
});

describe("blinkShown", () => {
  it("shows a blinking thing for half of each blink, two and a half times a second", () => {
    expect(
      [0.05, 0.15, 0.25, 0.35, 0.45, 0.55].map((seconds) =>
        blinkShown(seconds),
      ),
    ).toEqual([true, true, false, false, true, true]);
  });

  it("shows it half of each blink", () => {
    // A blink lasts 0.4 s; these are the middles of its milliseconds.
    const shown = Array.from({ length: 400 }, (_, i) =>
      blinkShown((i + 0.5) / 1000),
    ).filter(Boolean);

    expect(shown).toHaveLength(200);
  });
});
