import { stepsIn } from "../../rules/stepper";
import { DASH_MS, DASH_SPEED } from "../../rules/tuning";
import type { FieldEvent, FieldEventKind } from "../field/frame";
import {
  BOB,
  BREATH,
  EXHAUST_RATE,
  EYES_SHUT,
  FLASH_MOST,
  FLICKER,
  GOLDEN_ANGLE,
  LOST_RING_REACH,
  PULSE_LEAST,
  SHIELD_RING_REACH,
  type Jolts,
  TRAIL_MOST,
  bailOutShown,
  blinkShown,
  bobShare,
  breathScale,
  cameraShift,
  exhaustDue,
  eyesOpen,
  fadeAlpha,
  flashAlpha,
  flashDue,
  flickerShare,
  kickShare,
  pointsLabel,
  pulseAlpha,
  riseOf,
  ringColorOf,
  ringReachOf,
  shakeOf,
  shardCount,
  shareDone,
  spread,
  trailAlpha,
  trailLaidAfter,
  trailOutlinesLaid,
  trailReach,
  wayOf,
} from "./flourish";
import {
  BAIL_OUT_BLINK_MS,
  BAIL_OUT_MS,
  DASH_TRAIL,
  FLASH_GAP_MS,
  KICK_CSS_PX,
  KICK_MS,
  LEAST_SHARDS,
  MOST_SHARDS,
  POINTS_RISE,
  SHAKE_CSS_PX,
  SHAKE_DELAY_MS,
  SHAKE_MS,
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
    fromHome: false,
    ships: 0,
    waiting: 0,
    points: 0,
    times: 0,
    reach,
    chain: 0,
    slot: -1,
    wayX: 0,
    wayY: 0,
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
  it("draws a dash's last outline, nearest the ship, the most opaque", () => {
    expect(trailAlpha(DASH_TRAIL - 1)).toBe(TRAIL_MOST);
  });

  it("draws each before it a like share fainter, the first still seen", () => {
    const alphas = Array.from({ length: DASH_TRAIL }, (_, i) => trailAlpha(i));

    expect(alphas).toEqual([TRAIL_MOST / 3, (TRAIL_MOST * 2) / 3, TRAIL_MOST]);
  });
});

describe("the trail's outlines", () => {
  it("lays the first where the dash starts, as it starts", () => {
    expect([trailLaidAfter(0), trailReach(0)]).toEqual([0, 0]);
  });

  it("lays each after it as the ship passes, a like share of the dash on", () => {
    const laid = Array.from({ length: DASH_TRAIL }, (_, i) =>
      trailLaidAfter(i),
    );

    expect(laid).toEqual([0, DASH_MS / 3, (DASH_MS * 2) / 3]);
  });

  it("lays each where the ship is as it is laid, at the dash's speed", () => {
    expect(trailReach(2)).toBeCloseTo(
      (DASH_SPEED * (DASH_MS * 2)) / 3 / 1000,
      9,
    );
  });
});

describe("trailOutlinesLaid", () => {
  it("lays none for no dash", () => {
    expect(trailOutlinesLaid(-Infinity)).toBe(0);
  });

  it("lays the first as the dash starts", () => {
    expect(trailOutlinesLaid(0)).toBe(1);
  });

  it.each([
    ["just short of the second's", stepsIn(trailLaidAfter(1)) - 1, 1],
    ["at the second's", stepsIn(trailLaidAfter(1)), 2],
    ["at the third's", stepsIn(trailLaidAfter(2)), 3],
  ])(
    "lays each after it once the field has stepped the ship past where it lies: %s step",
    (_, stepsSince, laid) => {
      expect(trailOutlinesLaid(stepsSince)).toBe(laid);
    },
  );

  it("lays no more than the trail's outlines however long the dash goes on", () => {
    expect(trailOutlinesLaid(stepsIn(10 * DASH_MS))).toBe(DASH_TRAIL);
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

describe("ringColorOf", () => {
  const PALETTE = { flame: 0xf39a4b, accent: 0x4fbf7f };

  it("sweeps a blast's ring out in the warning color", () => {
    expect(ringColorOf(reaching("blast", 7), PALETTE)).toBe(PALETTE.flame);
  });

  it.each(["nova", "shielded", "lost"] as const)(
    "sweeps a %s ring out in the accent",
    (kind) => {
      expect(ringColorOf(reaching(kind, 0), PALETTE)).toBe(PALETTE.accent);
    },
  );
});

describe("wayOf", () => {
  it("flies each event's flourish a golden angle on from the one before's", () => {
    expect(wayOf(3) - wayOf(2)).toBeCloseTo(GOLDEN_ANGLE, 9);
  });
});

describe("bailOutShown", () => {
  /** The share through a bail-out at which its pilot starts to blink. */
  const BLINKING = BAIL_OUT_BLINK_MS / BAIL_OUT_MS;

  it("shows a pilot bailing out steadily until it starts to blink", () => {
    const shown = overTime((seconds) => bailOutShown(BLINKING / 2, seconds));

    expect(new Set(shown)).toEqual(new Set([true]));
  });

  it("blinks a pilot as it goes", () => {
    const shown = overTime((seconds) => bailOutShown(BLINKING, seconds));

    expect(shown).toEqual(overTime(blinkShown));
  });
});

describe("shakeOf", () => {
  /**
   * Returns the most the field is shaken along either axis over a stretch of a
   * shake, from and to so many milliseconds after the ship was lost.
   */
  function mostShaken(from: number, to: number): number {
    return Math.max(
      ...Array.from({ length: to - from }, (_, ms) => {
        const { x, y } = shakeOf(from + ms + 0.5, { x: 0, y: 0 });
        return Math.max(Math.abs(x), Math.abs(y));
      }),
    );
  }

  it("holds the field still for a moment as the ship is lost", () => {
    expect(mostShaken(0, SHAKE_DELAY_MS)).toBe(0);
  });

  it("shakes the field nearly all of its shake at first", () => {
    expect(mostShaken(SHAKE_DELAY_MS, SHAKE_DELAY_MS + 20)).toBeGreaterThan(
      0.9,
    );
  });

  it("dies away as the shake goes on, to a quarter of it three quarters through", () => {
    const late = SHAKE_DELAY_MS + 0.75 * SHAKE_MS;

    const most = mostShaken(late, late + 20);

    expect(most).toBeLessThanOrEqual(0.25);
    expect(most).toBeGreaterThan(0.15);
  });

  it("rests a field no ship was lost on", () => {
    expect(shakeOf(Infinity, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
  });

  it("rests the field once the shake is over", () => {
    const over = SHAKE_DELAY_MS + SHAKE_MS;

    expect(mostShaken(over, over + 1000)).toBe(0);
  });

  it("shakes the field along each axis apart, never along a line", () => {
    const ratios = new Set(
      Array.from({ length: SHAKE_MS }, (_, ms) => {
        const { x, y } = shakeOf(SHAKE_DELAY_MS + ms + 0.5, { x: 0, y: 0 });
        return Math.round((y / x) * 10);
      }),
    );

    expect(ratios.size).toBeGreaterThan(10);
  });

  it("swings the field well both ways at a screen's 60 frames a second, whenever its frames fall", () => {
    const frameMs = 1000 / 60;
    // The least, over each moment the frames may start at, of the most the
    // shake's first half swings the field along each axis.
    const least = { x: 1, y: 1 };
    for (let start = 0; start < frameMs; start += 0.5) {
      const most = { x: 0, y: 0 };
      for (let ms = start; ms < SHAKE_MS / 2; ms += frameMs) {
        const { x, y } = shakeOf(SHAKE_DELAY_MS + ms, { x: 0, y: 0 });
        most.x = Math.max(most.x, Math.abs(x));
        most.y = Math.max(most.y, Math.abs(y));
      }
      least.x = Math.min(least.x, most.x);
      least.y = Math.min(least.y, most.y);
    }

    expect(Math.min(least.x, least.y)).toBeGreaterThan(0.6);
  });

  it("writes the shake into the record it is given", () => {
    const into = { x: 0, y: 0 };

    expect(shakeOf(SHAKE_DELAY_MS, into)).toBe(into);
  });
});

describe("cameraShift", () => {
  /** What jolted a field that nothing has jolted. */
  const STILL: Jolts = {
    kickedAt: -Infinity,
    wayX: 0,
    wayY: 0,
    lostAt: -Infinity,
  };

  /** A blow that came down and to the left, a share along each axis. */
  const BLOW = { wayX: -0.6, wayY: 0.8 } as const;

  it("rests the camera on a field nothing has jolted", () => {
    expect(cameraShift(STILL, 1000, 2, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
  });

  it("scrolls the camera against a kick's blow, all its kick as it comes", () => {
    const kicked = { ...STILL, ...BLOW, kickedAt: 1000 };

    const { x, y } = cameraShift(kicked, 1000, 2, { x: 0, y: 0 });

    expect([x, y]).toEqual([
      expect.closeTo(-BLOW.wayX * KICK_CSS_PX * 2, 9),
      expect.closeTo(-BLOW.wayY * KICK_CSS_PX * 2, 9),
    ]);
  });

  it("settles the camera once the kick is over", () => {
    const kicked = { ...STILL, ...BLOW, kickedAt: 1000 };

    expect(cameraShift(kicked, 1000 + KICK_MS, 2, { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("shakes the camera as the field is shaken since a ship was lost, at the pixel ratio", () => {
    const since = SHAKE_DELAY_MS + 50;
    const shaken = shakeOf(since, { x: 0, y: 0 });

    const { x, y } = cameraShift({ ...STILL, lostAt: 1000 }, 1000 + since, 2, {
      x: 0,
      y: 0,
    });

    expect([x, y]).toEqual([
      expect.closeTo(shaken.x * SHAKE_CSS_PX * 2, 9),
      expect.closeTo(shaken.y * SHAKE_CSS_PX * 2, 9),
    ]);
  });

  it("writes the shift into the record it is given", () => {
    const into = { x: 0, y: 0 };

    expect(cameraShift(STILL, 0, 1, into)).toBe(into);
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

describe("exhaustDue", () => {
  /** How many of the field's steps a second takes. */
  const SECOND = stepsIn(1000);

  it("streams its rate a second at full thrust", () => {
    expect(exhaustDue(0, 1, SECOND, true)).toBeCloseTo(EXHAUST_RATE, 9);
  });

  it("streams fewer the less the ship thrusts", () => {
    expect(exhaustDue(0, 0.25, SECOND, true)).toBeCloseTo(EXHAUST_RATE / 4, 9);
  });

  it("adds what is due to the part of a speck carried from before", () => {
    expect(exhaustDue(0.5, 1, 1, true)).toBeCloseTo(
      0.5 + EXHAUST_RATE / SECOND,
      9,
    );
  });

  it("is due none at no thrust, carrying nothing on", () => {
    expect(exhaustDue(0.5, 0, SECOND, true)).toBe(0);
  });

  it("is due none where motion isn't welcome, carrying nothing on", () => {
    expect(exhaustDue(0.5, 1, SECOND, false)).toBe(0);
  });
});

describe("eyesOpen", () => {
  it("keeps a pilot's eyes open most of the time", () => {
    const open = overTime((seconds) => eyesOpen(seconds, 0, true));

    expect(open.filter((share) => share === 1).length).toBeGreaterThan(900);
  });

  it("blinks a pilot's eyes shut to their least, and open again", () => {
    const open = overTime((seconds) => eyesOpen(seconds, 0, true));

    expect(Math.min(...open)).toBeCloseTo(EYES_SHUT, 1);
  });

  it("blinks two pilots apart", () => {
    const first = overTime((seconds) => eyesOpen(seconds, 0, true));
    const second = overTime((seconds) => eyesOpen(seconds, 1, true));

    expect(second).not.toEqual(first);
  });

  it("keeps a pilot's eyes open where motion isn't welcome", () => {
    expect(new Set(overTime((seconds) => eyesOpen(seconds, 0, false)))).toEqual(
      new Set([1]),
    );
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
