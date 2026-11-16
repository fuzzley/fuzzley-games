import { ROCK_KIND_IDS, ROCK_SIZES, rockKind } from "../../rules/catalog/rocks";
import { NOSE } from "../../rules/ship/shots";
import { stepsIn } from "../../rules/stepper";
import {
  DASH_MS,
  DASH_SPEED,
  STATIC_STEPS,
  STRAY_POINTS,
} from "../../rules/tuning";
import { ART_PALETTE } from "../../testing/art_frames";
import type { FieldEvent, FieldEventKind } from "../field/frame";
import { boulderInks } from "./boulder";
import {
  BAIL_OUT_LEAN,
  BOB,
  EXHAUST_RATE,
  FLASH_MOST,
  GOLDEN_ANGLE,
  LOST_RING_REACH,
  MOST_POINTS_CHARACTERS,
  SHIELD_RING_REACH,
  type Jolt,
  type Jolts,
  type Shake,
  TRAIL_MOST,
  bailOutShown,
  bailOutWayOf,
  blinkShown,
  bobShare,
  breathShare,
  cameraShift,
  exhaustDue,
  flashAlpha,
  flashDue,
  kickShare,
  muzzleAt,
  muzzleBeatOf,
  pointsLabel,
  popShardsOf,
  riseOf,
  ringColorOf,
  ringOf,
  shakeShare,
  trailAlpha,
  trailLaidAfter,
  trailOutlinesLaid,
  trailReach,
  wayOf,
} from "./flourish";
import {
  BAIL_OUT_BLINK_MS,
  BAIL_OUT_MS,
  BOULDER_HOLD_MS,
  DASH_TRAIL,
  FLASH_GAP_MS,
  KICK_CSS_PX,
  KICK_MS,
  POP_SHARDS,
  MUZZLE_MS,
  POINTS_RISE,
  SHAKE_CSS_PX,
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
    weapon: null,
    pilot: null,
    inTow: 0,
    runOver: false,
    points: 0,
    times: 0,
    reach,
    step: 0,
    fell: false,
    slot: -1,
    wayX: 0,
    wayY: 0,
    burrs: 0,
  };
}

/** Returns what a motion gives at many times over ten seconds, as it idles. */
function overTime<T>(motion: (seconds: number) => T): readonly T[] {
  return Array.from({ length: 1000 }, (_, i) => motion(i / 100));
}

describe("the flourishes' curves", () => {
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

describe("MOST_POINTS_CHARACTERS", () => {
  /** Every label a rock's break or a stray brought home shows, at every multiplier. */
  const labels = [
    STRAY_POINTS,
    ...ROCK_KIND_IDS.flatMap((id) =>
      ROCK_SIZES.flatMap((size) => rockKind(id).points[size] ?? []),
    ),
  ].flatMap((points) =>
    [1, ...STATIC_STEPS.map(({ times }) => times)].map((times) =>
      pointsLabel({ points, times }),
    ),
  );

  it("holds every label points show, the longest whole", () => {
    expect(Math.max(...labels.map((label) => label.length))).toBe(
      MOST_POINTS_CHARACTERS,
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

describe("ringOf", () => {
  it.each([
    ["shielded", SHIELD_RING_REACH, true],
    ["lost", LOST_RING_REACH, true],
    ["dropped", 2, true],
    ["faded", 1.5, true],
    ["strayed", 2.5, false],
    ["dashed", 2, true],
    ["stepped", 2.5, true],
    ["shed", 3, true],
  ] as const)(
    "rings a %s event out to %d, wrapping: %s",
    (kind, reach, wraps) => {
      expect(ringOf(reaching(kind, 0))).toEqual({ reach, wraps });
    },
  );

  it("throws for an event that plays no ring", () => {
    expect(() => ringOf(reaching("fired", 0))).toThrow(RangeError);
  });
});

describe("bailOutWayOf", () => {
  it.each([1, 2, 3, 40])(
    "rises up the field, leaning no more than its lean, for the event %d",
    (serial) => {
      const way = bailOutWayOf(serial);

      expect(Math.abs(way + Math.PI / 2)).toBeLessThanOrEqual(BAIL_OUT_LEAN);
    },
  );

  it("leans the bubbles of events one after another apart", () => {
    expect(bailOutWayOf(1)).not.toBe(bailOutWayOf(2));
  });
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

describe("muzzleBeatOf", () => {
  it.each([
    [0, 0],
    [(3 / 8) * MUZZLE_MS - 0.1, 0],
    [(3 / 8) * MUZZLE_MS, 1],
    [(7 / 8) * MUZZLE_MS - 0.1, 1],
  ])("shows, %d ms after a shot left, the beat %d", (sinceMs, beat) => {
    expect(muzzleBeatOf(sinceMs)).toBe(beat);
  });

  it.each([-1, (7 / 8) * MUZZLE_MS, Infinity, Number.NaN])(
    "shows no beat %d ms after a shot left",
    (sinceMs) => {
      expect(muzzleBeatOf(sinceMs)).toBeNull();
    },
  );

  it.each([
    ["exactly", 1000 / 60],
    ["a whole millisecond early", 16],
    ["a whole millisecond late", 17],
  ])(
    "shows each beat for a frame at 60 frames a second, its frames falling %s",
    (_, frameMs) => {
      const beats = [0, 1, 2].map((frame) => muzzleBeatOf(frame * frameMs));

      expect(beats).toEqual([0, 1, null]);
    },
  );

  it("shows each beat for two frames at 120 frames a second", () => {
    const frameMs = 1000 / 120;

    const beats = [0, 1, 2, 3, 4].map((frame) => muzzleBeatOf(frame * frameMs));

    expect(beats).toEqual([0, 0, 1, 1, null]);
  });
});

describe("muzzleAt", () => {
  /** The field the specs' pods fly on. */
  const TORUS = { width: 72, height: 40 } as const;

  it("shows at the nose of the pod as it is drawn, turned as it points", () => {
    const at = muzzleAt({ x: 30, y: 20, angle: -Math.PI / 2 }, TORUS, {
      x: 0,
      y: 0,
      angle: 0,
    });

    expect([at.x, at.y, at.angle]).toEqual([
      expect.closeTo(30, 9),
      expect.closeTo(20 - NOSE, 9),
      -Math.PI / 2,
    ]);
  });

  it("wraps onto the field past an edge", () => {
    const at = muzzleAt({ x: 71.5, y: 20, angle: 0 }, TORUS, {
      x: 0,
      y: 0,
      angle: 0,
    });

    expect(at.x).toBeCloseTo(71.5 + NOSE - 72, 9);
  });

  it("writes the place into the record it is given", () => {
    const into = { x: 0, y: 0, angle: 0 };

    expect(muzzleAt({ x: 1, y: 1, angle: 0 }, TORUS, into)).toBe(into);
  });
});

describe("shakeShare", () => {
  /**
   * Returns the most the field is shaken either way over a stretch of a
   * shake, from and to so many milliseconds after its blow, held still for
   * so long first.
   */
  function mostShaken(from: number, to: number, holdMs = 0): number {
    return Math.max(
      ...Array.from({ length: to - from }, (_, ms) =>
        Math.abs(shakeShare(from + ms + 0.5, holdMs)),
      ),
    );
  }

  it("holds the field still for as long as it is told first", () => {
    expect(mostShaken(0, BOULDER_HOLD_MS, BOULDER_HOLD_MS)).toBe(0);
  });

  it("shakes the field nearly all of its shake at first", () => {
    const from = BOULDER_HOLD_MS;

    expect(mostShaken(from, from + 20, BOULDER_HOLD_MS)).toBeGreaterThan(0.9);
  });

  it("swings the field the way the blow came first", () => {
    expect(shakeShare(10, 0)).toBeGreaterThan(0);
  });

  it("dies away as the shake goes on, to a quarter of it three quarters through", () => {
    const late = 0.75 * SHAKE_MS;

    const most = mostShaken(late, late + 20);

    expect(most).toBeLessThanOrEqual(0.25);
    expect(most).toBeGreaterThan(0.15);
  });

  it("rests a field nothing has shaken", () => {
    expect(shakeShare(Infinity, 0)).toBe(0);
  });

  it("rests the field once the shake is over, its hold among its time", () => {
    expect(mostShaken(SHAKE_MS, SHAKE_MS + 1000, BOULDER_HOLD_MS)).toBe(0);
  });

  it.each([SHAKE_MS, 2 * SHAKE_MS])(
    "never shakes the field after a hold of %d ms, which leaves no time to",
    (holdMs) => {
      expect(mostShaken(0, 3 * SHAKE_MS, holdMs)).toBe(0);
    },
  );

  it("swings the field well both ways at a screen's 60 frames a second, whenever its frames fall, after a boulder's hold", () => {
    const frameMs = 1000 / 60;
    const shakingMs = SHAKE_MS - BOULDER_HOLD_MS;
    // The least, over each moment the frames may start at, of the most the
    // shake's first half swings the field each way.
    let least = 1;
    for (let start = 0; start < frameMs; start += 0.5) {
      let most = { ahead: 0, back: 0 };
      for (let ms = start; ms < shakingMs / 2; ms += frameMs) {
        const share = shakeShare(BOULDER_HOLD_MS + ms, BOULDER_HOLD_MS);
        most = {
          ahead: Math.max(most.ahead, share),
          back: Math.max(most.back, -share),
        };
      }
      least = Math.min(least, most.ahead, most.back);
    }

    expect(least).toBeGreaterThan(0.5);
  });
});

describe("cameraShift", () => {
  /** What jolted a field that nothing has jolted. */
  function still(): Jolts {
    return {
      kick: { at: -Infinity, wayX: 0, wayY: 0 },
      shake: { at: -Infinity, wayX: 0, wayY: 0, holdMs: 0 },
    };
  }

  /** A blow that came down and to the left at a time, a share along each axis. */
  function blowAt(at: number): Jolt {
    return { at, wayX: -0.6, wayY: 0.8 };
  }

  /** A shake from that blow at a time, the field held still first for so long. */
  function shakeAt(at: number, holdMs = 0): Shake {
    return { ...blowAt(at), holdMs };
  }

  it("rests the camera on a field nothing has jolted", () => {
    expect(cameraShift(still(), 1000, 2, { x: 1, y: 1 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("scrolls the camera against a kick's blow, all its kick as it comes", () => {
    const kicked = { ...still(), kick: blowAt(1000) };

    const { x, y } = cameraShift(kicked, 1000, 2, { x: 0, y: 0 });

    expect([x, y]).toEqual([
      expect.closeTo(0.6 * KICK_CSS_PX * 2, 9),
      expect.closeTo(-0.8 * KICK_CSS_PX * 2, 9),
    ]);
  });

  it("settles the camera once the kick is over", () => {
    const kicked = { ...still(), kick: blowAt(1000) };

    expect(cameraShift(kicked, 1000 + KICK_MS, 2, { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("shakes the camera against the shake's blow, as far as the field is shaken then, at the pixel ratio", () => {
    const shaken = { ...still(), shake: shakeAt(1000, 90) };
    const share = shakeShare(150, 90);

    const { x, y } = cameraShift(shaken, 1150, 2, { x: 0, y: 0 });

    expect([x, y]).toEqual([
      expect.closeTo(0.6 * share * SHAKE_CSS_PX * 2, 9),
      expect.closeTo(-0.8 * share * SHAKE_CSS_PX * 2, 9),
    ]);
  });

  it("shakes the camera along the blow alone, never across it", () => {
    const shaken = { ...still(), shake: shakeAt(0) };

    const across = Array.from({ length: SHAKE_MS }, (_, ms) => {
      const { x, y } = cameraShift(shaken, ms + 0.5, 1, { x: 0, y: 0 });
      return Math.abs(x * 0.8 + y * 0.6);
    });

    expect(Math.max(...across)).toBeCloseTo(0, 9);
  });

  it("rests the camera once a shake is over, within the budget's 0.3 s of its blow", () => {
    const shaken = { ...still(), shake: shakeAt(1000, 90) };

    expect(cameraShift(shaken, 1300, 2, { x: 1, y: 1 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("adds a kick and a shake together", () => {
    const both = { ...still(), kick: blowAt(1000), shake: shakeAt(950) };
    const kick = cameraShift({ ...still(), kick: blowAt(1000) }, 1040, 1, {
      x: 0,
      y: 0,
    });
    const shake = cameraShift({ ...still(), shake: shakeAt(950) }, 1040, 1, {
      x: 0,
      y: 0,
    });

    const { x, y } = cameraShift(both, 1040, 1, { x: 0, y: 0 });

    expect([x, y]).toEqual([
      expect.closeTo(kick.x + shake.x, 9),
      expect.closeTo(kick.y + shake.y, 9),
    ]);
  });

  it("writes the shift into the record it is given", () => {
    const into = { x: 0, y: 0 };

    expect(cameraShift(still(), 0, 1, into)).toBe(into);
  });
});

describe("breathShare", () => {
  it("breathes a pickup all the way out and all the way in as it idles", () => {
    const shares = overTime((seconds) => breathShare(seconds, 0, true));

    expect([Math.min(...shares), Math.max(...shares)]).toEqual([
      expect.closeTo(0, 3),
      expect.closeTo(1, 3),
    ]);
  });

  it("breathes two pickups apart, by their phases", () => {
    expect(breathShare(0, 1, true)).not.toBeCloseTo(breathShare(0, 0, true));
  });

  it("holds a pickup breathed out where motion isn't welcome", () => {
    expect(
      new Set(overTime((seconds) => breathShare(seconds, 1, false))),
    ).toEqual(new Set([0]));
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

describe("ringColorOf", () => {
  it("throws a piece knocked off's ring in its boulder's core", () => {
    expect(ringColorOf(reaching("shed", 0), ART_PALETTE)).toBe(
      boulderInks(ART_PALETTE).core,
    );
  });

  it.each(["shielded", "stepped", "dropped"] as const)(
    "sweeps a %s ring out in the accent",
    (kind) => {
      expect(ringColorOf(reaching(kind, 0), ART_PALETTE)).toBe(
        ART_PALETTE.accent,
      );
    },
  );
});

describe("popShardsOf", () => {
  it("pops a burr a shot pops into one burr's shards", () => {
    expect(popShardsOf(reaching("popped", 0))).toBe(POP_SHARDS);
  });

  it("pops one burr's shards for each a dash shakes off", () => {
    expect(popShardsOf({ ...reaching("shaken", 0), burrs: 3 })).toBe(
      3 * POP_SHARDS,
    );
  });
});
