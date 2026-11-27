import { SHAKE_RATES } from "@fz/core/motion";
import { FEEL } from "./feel";
import { RAISED, lookAt } from "./looks";
import { frameFor, sampleAt, sampleFlight, starsLitAt } from "./sample";
import {
  EASINGS,
  type Easing,
  type Effect,
  type Flight,
  type Key,
  type Keys,
  type PieceTrack,
  type Sampled,
  type SpriteTrack,
  type Timeline,
} from "./timeline";

/** A red fuzzball, as a track draws it. */
const RED = {
  what: "fuzzball",
  id: 1,
  kind: "red",
  special: null,
  caged: false,
  burred: false,
} as const;

/** Returns a track of the red fuzzball at the board's corner, moved by keys. */
function trackOf(keys: Keys, more: Partial<PieceTrack> = {}): PieceTrack {
  return {
    id: 1,
    fromMs: 0,
    untilMs: null,
    drawn: RED,
    look: lookAt({ x: 0, y: 0 }),
    face: "rest",
    keys,
    becomes: [],
    faces: [],
    ...more,
  };
}

/** Returns a timeline of some tracks, effects and dimming, at rest at once. */
function timelineOf(parts: Partial<Timeline>): Timeline {
  return {
    pieces: [],
    sprites: [],
    effects: [],
    flights: [],
    counts: [],
    dust: [],
    marks: [],
    sounds: [],
    dim: [],
    restMs: 0,
    end: null,
    ...parts,
  };
}

/** Returns a frame of a timeline sampled at a moment. */
function sampled(timeline: Timeline, ms: number): ReturnType<typeof frameFor> {
  return sampleAt(timeline, FEEL, ms, frameFor(timeline));
}

/** Returns the first piece's record of a timeline of one track sampled at a moment. */
function pieceAt(
  track: PieceTrack,
  ms: number,
): ReturnType<typeof frameFor>["pieces"][number] | undefined {
  return sampled(timelineOf({ pieces: [track] }), ms).pieces[0];
}

/** Returns a key that moves a number over 100 ms from a moment. */
function keyAt(atMs: number, to: number, easing: Easing = "linear"): Key {
  return { atMs, ms: 100, to, easing };
}

/** Returns the board's shake across, at a moment, as a timeline of shakes samples it. */
function shakeAcross(effects: readonly Effect[], ms: number): number {
  return sampled(timelineOf({ effects }), ms).board.shake.x;
}

/** Returns how far a shake reaches across at a moment, its swing across taken out. */
function reachAcross(effects: readonly Effect[], ms: number): number {
  return (
    shakeAcross(effects, ms) /
    Math.sin((2 * Math.PI * SHAKE_RATES.x * ms) / 1000)
  );
}

describe("frameFor", () => {
  it("keeps a record for each track, nothing shown, and the board still", () => {
    const sprite: SpriteTrack = {
      drawn: { what: "frame", frame: "cage-bar" },
      fromMs: 0,
      untilMs: 100,
      look: lookAt({ x: 0, y: 0 }),
      keys: {},
    };

    expect(
      frameFor(
        timelineOf({ pieces: [trackOf({}), trackOf({})], sprites: [sprite] }),
      ),
    ).toEqual({
      pieces: [
        expect.objectContaining({ shown: false, drawn: null }),
        expect.objectContaining({ shown: false, drawn: null }),
      ],
      sprites: [expect.objectContaining({ shown: false, drawn: null })],
      board: { dim: 0, shake: { x: 0, y: 0 } },
    });
  });
});

describe("sampleAt", () => {
  it("stands a sprite at its look before its keys start", () => {
    expect(pieceAt(trackOf({ x: [keyAt(100, 4)] }), 50)).toEqual(
      expect.objectContaining({ ...lookAt({ x: 0, y: 0 }), shown: true }),
    );
  });

  it.each<[Easing, number, number, number]>([
    ["linear", 0.25, 0.5, 0.75],
    ["out", 0.578125, 0.875, 0.984375],
    ["in", 0.0625, 0.25, 0.5625],
    ["in-out", 0.125, 0.5, 0.875],
    ["back", 0.775, 1.05, 1.05],
    ["spring", 1.220483, 0.977048, 0.993745],
  ])(
    "moves a number by %s as the sketch's easing does, a quarter, half and three quarters through",
    (easing, quarter, half, threeQuarters) => {
      const track = trackOf({ x: [keyAt(0, 1, easing)] });

      expect([25, 50, 75].map((ms) => pieceAt(track, ms)?.x)).toEqual([
        expect.closeTo(quarter, 6),
        expect.closeTo(half, 6),
        expect.closeTo(threeQuarters, 6),
      ]);
    },
  );

  it.each(EASINGS)(
    "holds a number at its key's end once a key moving it by %s is over",
    (easing) => {
      const track = trackOf({ x: [keyAt(0, 4, easing)] });

      expect([pieceAt(track, 100)?.x, pieceAt(track, 250)?.x]).toEqual([4, 4]);
    },
  );

  it("moves a number on from where the key before left it as the next starts", () => {
    const track = trackOf({ x: [keyAt(0, 4), keyAt(50, 0)] });

    expect([pieceAt(track, 50)?.x, pieceAt(track, 100)?.x]).toEqual([2, 1]);
  });

  it("jumps a number with a key of no time", () => {
    const track = trackOf({ x: [{ atMs: 10, ms: 0, to: 3, easing: "out" }] });

    expect([pieceAt(track, 9)?.x, pieceAt(track, 10)?.x]).toEqual([0, 3]);
  });

  it("shows a piece from its track's start until its end", () => {
    const track = trackOf({}, { fromMs: 100, untilMs: 200 });

    expect([99, 100, 199, 200].map((ms) => pieceAt(track, ms)?.shown)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it("gives a piece the last face and look it has taken by the moment", () => {
    const frizzball = { what: "frizzball", id: 1 } as const;
    const track = trackOf(
      {},
      {
        faces: [
          { atMs: 100, face: "eep" },
          { atMs: 200, face: "happy" },
        ],
        becomes: [{ atMs: 150, piece: frizzball }],
      },
    );

    expect(
      [50, 120, 220].map((ms) => {
        const piece = pieceAt(track, ms);
        return [piece?.face, piece?.drawn];
      }),
    ).toEqual([
      ["rest", RED],
      ["eep", RED],
      ["happy", frizzball],
    ]);
  });

  it("sways a wobbling sprite side to side, folded into its lean across", () => {
    const track = trackOf({
      wobble: [{ atMs: 0, ms: 0, to: 0.5, easing: "linear" }],
      leanX: [{ atMs: 0, ms: 0, to: 0.1, easing: "linear" }],
    });

    expect(pieceAt(track, 40)?.leanX).toBeCloseTo(
      0.1 + Math.sin(40 / FEEL.wobbleRadianMs) * 0.5 * FEEL.wobbleSquares,
      9,
    );
  });

  it("draws a loose sprite as its track does, a copy in its face", () => {
    const sprite = (drawn: SpriteTrack["drawn"]): SpriteTrack => ({
      drawn,
      fromMs: 100,
      untilMs: 200,
      look: lookAt({ x: 2, y: 3 }),
      keys: { y: [keyAt(100, 5)] },
    });
    const frame = sampled(
      timelineOf({
        sprites: [
          sprite({ what: "frame", frame: "cage-bar" }),
          sprite({ what: "copy", piece: RED, face: "happy" }),
        ],
      }),
      150,
    );

    expect(frame.sprites).toEqual([
      expect.objectContaining({
        shown: true,
        x: 2,
        y: 4,
        face: "rest",
        drawn: null,
      }),
      expect.objectContaining({
        shown: true,
        x: 2,
        y: 4,
        face: "happy",
        drawn: null,
      }),
    ]);
  });

  it("dims the board by its keys", () => {
    const timeline = timelineOf({ dim: [keyAt(0, 0.4), keyAt(200, 0)] });

    expect([50, 150, 250].map((ms) => sampled(timeline, ms).board.dim)).toEqual(
      [0.2, 0.4, expect.closeTo(0.2, 9)],
    );
  });

  it("shakes the board half a shake's width each way as it starts, halving every half-life", () => {
    const shake: Effect[] = [{ what: "shake", atMs: 0, px: 6 }];

    expect([
      reachAcross(shake, 10),
      reachAcross(shake, 10 + FEEL.shakeHalfLifeMs),
    ]).toEqual([
      expect.closeTo(3 * 0.5 ** (10 / FEEL.shakeHalfLifeMs), 9),
      expect.closeTo(1.5 * 0.5 ** (10 / FEEL.shakeHalfLifeMs), 9),
    ]);
  });

  it("stops a shake once its width is under the feel's stop", () => {
    const shake: Effect[] = [{ what: "shake", atMs: 0, px: 3 }];
    const stopMs = FEEL.shakeHalfLifeMs * Math.log2(3 / FEEL.shakeStopPx);

    expect({
      before: shakeAcross(shake, stopMs - 3) !== 0,
      after: sampled(timelineOf({ effects: shake }), stopMs + 3).board.shake,
    }).toEqual({ before: true, after: { x: 0, y: 0 } });
  });

  it("shakes the board by the wider of two shakes as they meet, the earlier or the later", () => {
    const small: Effect = { what: "shake", atMs: 0, px: 2.5 };
    const big: Effect = { what: "shake", atMs: 100, px: 10 };
    const after: Effect = { what: "shake", atMs: 200, px: 2.5 };

    expect([
      shakeAcross([small, big], 110),
      shakeAcross([big, after], 210),
    ]).toEqual([shakeAcross([big], 110), shakeAcross([big], 210)]);
  });

  it("leaves the board still before its first shake", () => {
    expect(
      sampled(
        timelineOf({ effects: [{ what: "shake", atMs: 100, px: 6 }] }),
        50,
      ).board.shake,
    ).toEqual({ x: 0, y: 0 });
  });

  it("samples a moment the same whatever frames came before it, as at 60 and 120 a second", () => {
    const timeline = timelineOf({
      pieces: [trackOf({ x: [keyAt(0, 4, "spring")] })],
      effects: [{ what: "shake", atMs: 0, px: 10 }],
    });
    const playedAt = (fps: number): ReturnType<typeof frameFor> => {
      const frame = frameFor(timeline);
      for (let ms = 0; ms <= 100; ms += 1000 / fps) {
        sampleAt(timeline, FEEL, ms, frame);
      }
      return structuredClone(sampleAt(timeline, FEEL, 100, frame));
    };

    expect(playedAt(60)).toEqual(playedAt(120));
  });

  it("throws for a frame with fewer records than the timeline has tracks", () => {
    const timeline = timelineOf({ pieces: [trackOf({})] });

    expect(() => sampleAt(timeline, FEEL, 0, frameFor(timelineOf({})))).toThrow(
      new RangeError(
        "A frame keeps a record for each of its timeline's tracks.",
      ),
    );
  });
});

describe("sampleFlight", () => {
  /** The red fuzzball's copy flying from the board's corner, from 100 ms. */
  const FLIGHT: Flight = {
    atMs: 100,
    ms: FEEL.flightMs,
    drawn: RED,
    from: { x: 0, y: 0 },
    goal: 0,
  };

  /** Where its goal's picture is, above the board. */
  const GOAL = { x: 4, y: -2 };

  /** Returns where the copy stands at a moment. */
  function flightAt(ms: number): Sampled {
    return sampleFlight(FLIGHT, GOAL, FEEL, ms, {
      ...lookAt({ x: 9, y: 9 }),
      shown: false,
      face: "rest",
      drawn: null,
    });
  }

  it("sets the copy off at its size as a copy, happy, its fur a little on end, over all the rest", () => {
    expect(flightAt(100)).toMatchObject({
      shown: true,
      x: 0,
      y: 0,
      scaleX: FEEL.flightScale,
      lift: FEEL.flightLift,
      raise: RAISED.top,
      face: "happy",
      drawn: RED,
    });
  });

  it("bows and rises off its way at its middle, and shrinks as it goes", () => {
    const middle = flightAt(100 + FEEL.flightMs / 2);

    expect([middle.x, middle.y, middle.leanY < 0, middle.scaleX]).toEqual([
      2,
      -1,
      true,
      FEEL.flightScale - FEEL.flightShrink / 2,
    ]);
  });

  it("lands on its goal, shrunk, as it stops showing", () => {
    const landed = flightAt(100 + FEEL.flightMs);

    expect([
      landed.shown,
      landed.x,
      landed.y,
      Math.abs(landed.leanX) + Math.abs(landed.leanY),
      landed.scaleY,
    ]).toEqual([
      false,
      GOAL.x,
      GOAL.y,
      0,
      FEEL.flightScale - FEEL.flightShrink,
    ]);
  });

  it("shows nothing before it sets off", () => {
    expect(flightAt(99).shown).toBe(false);
  });
});

describe("starsLitAt", () => {
  const end = { cardMs: 1000, starsMs: [1200, 1500, 1800] };

  it.each([
    [1199, 0],
    [1200, 1],
    [1799, 2],
    [Infinity, 3],
  ])("has the stars lit by %i ms be %i", (ms, lit) => {
    expect(starsLitAt(end, ms)).toBe(lit);
  });
});
