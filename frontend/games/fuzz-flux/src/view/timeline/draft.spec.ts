import type { Fuzzball } from "../../rules/catalog/pieces";
import { boardFrom } from "../../testing/board_picture";
import { gridOf } from "../../testing/shown_board";
import { Draft } from "./draft";
import { FEEL } from "./feel";
import { POOLS } from "./limits";
import { lookAt } from "./looks";
import type { Part } from "./part";
import type { Key, PieceTrack, Timeline } from "./timeline";

/** A board of 3 pieces and a gap: a red fuzzball, a burred blue one and the frizzball, numbered 1 to 3. */
const BOARD = gridOf(boardFrom({ pieces: ["rb", "f_"], marks: [".*", ".."] }));

/** Returns the timeline a draft on the board makes of some parts. */
function timelineOf(...parts: readonly Part[]): Timeline {
  const draft = new Draft(BOARD, [], "full");
  draft.add(parts);
  return draft.finish(1000, null, FEEL, POOLS);
}

/** Returns a piece's track in a timeline. */
function trackOf(timeline: Timeline, piece: number): PieceTrack | undefined {
  return timeline.pieces.find(({ id }) => id === piece);
}

/** Returns a key that moves a number to a value over 100 ms from a moment. */
function keyAt(atMs: number, to: number): Key {
  return { atMs, ms: 100, to, easing: "out" };
}

describe("Draft", () => {
  it("starts a track for each piece on the board, standing at its square in its resting face", () => {
    expect(timelineOf().pieces).toEqual([
      {
        id: 1,
        fromMs: 0,
        untilMs: null,
        drawn: BOARD.squares[0]?.piece,
        look: lookAt({ x: 0, y: 0 }),
        face: "rest",
        keys: {},
        becomes: [],
        faces: [],
      },
      expect.objectContaining({
        id: 2,
        look: lookAt({ x: 1, y: 0 }),
        face: "cross",
      }),
      expect.objectContaining({
        id: 3,
        look: lookAt({ x: 0, y: 1 }),
        face: "eep",
      }),
    ]);
  });

  it("lays each number's keys, faces and looks in the order they start, those together in the order added", () => {
    const track = trackOf(
      timelineOf(
        { what: "key", piece: 1, channel: "scaleX", key: keyAt(200, 2) },
        { what: "key", piece: 1, channel: "scaleX", key: keyAt(100, 3) },
        { what: "key", piece: 1, channel: "scaleX", key: keyAt(100, 4) },
        { what: "face", piece: 1, atMs: 50, face: "happy" },
        { what: "face", piece: 1, atMs: 10, face: "eep" },
        {
          what: "becomes",
          piece: 1,
          atMs: 30,
          drawn: { what: "frizzball", id: 1 },
        },
      ),
      1,
    );

    expect(track).toEqual(
      expect.objectContaining({
        keys: { scaleX: [keyAt(100, 3), keyAt(100, 4), keyAt(200, 2)] },
        faces: [
          { atMs: 10, face: "eep" },
          { atMs: 50, face: "happy" },
        ],
        becomes: [{ atMs: 30, piece: { what: "frizzball", id: 1 } }],
      }),
    );
  });

  it("adds a piece that shows during the move, with its own look and face", () => {
    const piece = { what: "frizzball", id: 9 } as const;

    expect(
      trackOf(
        timelineOf({
          what: "shows",
          piece,
          atMs: 300,
          look: lookAt({ x: 1, y: -1 }),
          face: "happy",
        }),
        9,
      ),
    ).toEqual(
      expect.objectContaining({
        fromMs: 300,
        untilMs: null,
        drawn: piece,
        look: lookAt({ x: 1, y: -1 }),
        face: "happy",
      }),
    );
  });

  it("ends a piece's track at the first moment it leaves", () => {
    const track = trackOf(
      timelineOf(
        { what: "leaves", piece: 2, atMs: 400 },
        { what: "leaves", piece: 2, atMs: 250 },
      ),
      2,
    );

    expect(track?.untilMs).toBe(250);
  });

  it("lists the loose sprites, the effects, the sounds and the board's dimming, each in the order it starts", () => {
    const sprite = {
      drawn: { what: "frame", frame: "cage-bar" },
      look: lookAt({ x: 0, y: 0 }),
      keys: {},
    } as const;
    const timeline = timelineOf(
      { what: "sprite", sprite: { ...sprite, fromMs: 50, untilMs: 90 } },
      { what: "sprite", sprite: { ...sprite, fromMs: 20, untilMs: 90 } },
      { what: "effect", effect: { what: "shake", atMs: 80, px: 3 } },
      { what: "effect", effect: { what: "shake", atMs: 40, px: 6 } },
      { what: "sound", atMs: 70, sound: "pop", rung: 3, volume: 0.8 },
      { what: "sound", atMs: 30, sound: "swap", rung: null, volume: 1 },
      { what: "dim", key: keyAt(90, 0) },
      { what: "dim", key: keyAt(60, 0.4) },
    );

    expect({
      sprites: timeline.sprites.map(({ fromMs }) => fromMs),
      effects: timeline.effects,
      sounds: timeline.sounds,
      dim: timeline.dim,
    }).toEqual({
      sprites: [20, 50],
      effects: [
        { what: "shake", atMs: 40, px: 6 },
        { what: "shake", atMs: 80, px: 3 },
      ],
      sounds: [
        { atMs: 30, sound: "swap", cents: 0, volume: 1 },
        { atMs: 70, sound: "pop", cents: 700, volume: 0.8 },
      ],
      dim: [keyAt(60, 0.4), keyAt(90, 0)],
    });
  });

  it("hands on when the board comes to rest and the level's end", () => {
    const draft = new Draft(BOARD, [], "full");
    const end = { cardMs: 2000, starsMs: [2200] };

    expect(draft.finish(1500, end, FEEL, POOLS)).toEqual(
      expect.objectContaining({ restMs: 1500, end }),
    );
  });

  it("holds flashes and glows together to the flashes' limit, a glow kept as its piece's keys", () => {
    const timeline = timelineOf(
      { what: "glow", piece: 1, atMs: 100, ms: 260, amount: 1 },
      {
        what: "effect",
        effect: {
          what: "flash",
          atMs: 200,
          ms: 110,
          at: { x: 0, y: 0 },
          radius: 2,
        },
      },
      { what: "glow", piece: 2, atMs: 300, ms: 260, amount: 0.8 },
      {
        what: "effect",
        effect: {
          what: "flash",
          atMs: 460,
          ms: 110,
          at: { x: 1, y: 0 },
          radius: 2,
        },
      },
    );

    expect({
      glows: timeline.pieces.map(({ keys }) => keys.glow ?? []),
      flashes: timeline.effects.map(({ atMs }) => atMs),
    }).toEqual({
      glows: [
        [
          { atMs: 100, ms: 0, to: 1, easing: "linear" },
          { atMs: 100, ms: 260, to: 0, easing: "out" },
        ],
        [],
        [],
      ],
      flashes: [460],
    });
  });

  it("keeps the flashes from the moment it hurries a gap at the hurried pace apart", () => {
    const flash = (atMs: number): Part => ({
      what: "effect",
      effect: { what: "flash", atMs, ms: 110, at: { x: 0, y: 0 }, radius: 2 },
    });
    const draft = new Draft(BOARD, [], "full");
    draft.add([flash(0), flash(FEEL.flashGapMs), flash(2 * FEEL.flashGapMs)]);
    draft.hurries(FEEL.flashGapMs);

    expect(
      draft.finish(1000, null, FEEL, POOLS).effects.map(({ atMs }) => atMs),
    ).toEqual([0]);
  });

  it("sends a fuzzball gathered to the goal of its kind, and counts it as it lands", () => {
    const draft = new Draft(
      BOARD,
      [
        {
          goal: { what: "gather", kind: "red", count: 9 },
          left: 4,
          met: false,
        },
      ],
      "full",
    );
    const red: Fuzzball = {
      what: "fuzzball",
      id: 1,
      kind: "red",
      special: null,
      caged: false,
      burred: false,
    };
    draft.add([
      { what: "gathered", atMs: 100, piece: red, at: { x: 0, y: 0 } },
    ]);

    const { flights, counts } = draft.finish(1000, null, FEEL, POOLS);

    expect([flights.map(({ drawn }) => drawn.id), counts]).toEqual([
      [1],
      [
        {
          atMs: 100 + FEEL.flightAfterMs + FEEL.flightMs,
          goal: 0,
          left: 3,
        },
      ],
    ]);
  });

  it("ticks as the goal counts, among the move's other sounds", () => {
    const draft = new Draft(
      BOARD,
      [{ goal: { what: "dust" }, left: 1, met: false }],
      "full",
    );
    draft.add([
      { what: "counted", atMs: 100, counts: { what: "dust" } },
      { what: "sound", atMs: 50, sound: "dust", rung: null, volume: 1 },
    ]);

    expect(draft.finish(1000, null, FEEL, POOLS).sounds).toEqual([
      { atMs: 50, sound: "dust", cents: 0, volume: 1 },
      { atMs: 100, sound: "tick", cents: 0, volume: 1 },
      { atMs: 100, sound: "goal", cents: 0, volume: 1 },
    ]);
  });

  describe("with Less motion", () => {
    const red: Fuzzball = {
      what: "fuzzball",
      id: 1,
      kind: "red",
      special: null,
      caged: false,
      burred: false,
    };
    const draft = new Draft(
      BOARD,
      [
        {
          goal: { what: "gather", kind: "red", count: 9 },
          left: 4,
          met: false,
        },
      ],
      "less",
    );
    draft.add([
      { what: "effect", effect: { what: "shake", atMs: 0, px: 4 } },
      {
        what: "effect",
        effect: {
          what: "flash",
          atMs: 0,
          ms: 110,
          at: { x: 0, y: 0 },
          radius: 2,
        },
      },
      { what: "glow", piece: 1, atMs: 0, ms: 200, amount: 0.8 },
      {
        what: "effect",
        effect: {
          what: "fluff",
          atMs: 0,
          at: { x: 0, y: 0 },
          tuft: "tuft-red",
          count: 8,
          power: 1,
        },
      },
      { what: "gathered", atMs: 100, piece: red, at: { x: 0, y: 0 } },
    ]);
    const timeline = draft.finish(1000, null, FEEL, POOLS);

    it("keeps no shake and no flash, and a quarter of the fluff", () => {
      expect(timeline.effects).toEqual([
        {
          what: "fluff",
          atMs: 0,
          at: { x: 0, y: 0 },
          tuft: "tuft-red",
          count: 8 * FEEL.lessMotionFluff,
          power: 1,
        },
      ]);
    });

    it("keeps no glow", () => {
      expect(trackOf(timeline, 1)?.keys.glow).toBeUndefined();
    });

    it("flies nothing to the goal, counting it a moment on", () => {
      expect([timeline.flights, timeline.counts]).toEqual([
        [],
        [{ atMs: 100 + FEEL.unflownCountMs, goal: 0, left: 3 }],
      ]);
    });
  });

  it("lists the dust swept and the waves' marks in the order they start", () => {
    const timeline = timelineOf(
      { what: "mark", mark: { atMs: 300, at: { x: 0, y: 0 }, times: 3 } },
      { what: "mark", mark: { atMs: 200, at: { x: 1, y: 0 }, times: 2 } },
      { what: "dust", change: { atMs: 90, at: { x: 1, y: 0 }, layers: 0 } },
      { what: "dust", change: { atMs: 40, at: { x: 0, y: 0 }, layers: 1 } },
    );

    expect([
      timeline.marks.map(({ atMs }) => atMs),
      timeline.dust.map(({ atMs }) => atMs),
    ]).toEqual([
      [200, 300],
      [40, 90],
    ]);
  });

  it("finishes the same timeline however often it is asked", () => {
    const draft = new Draft(BOARD, [], "full");
    draft.add([{ what: "glow", piece: 1, atMs: 100, ms: 260, amount: 1 }]);

    const first = draft.finish(1000, null, FEEL, POOLS);
    const second = draft.finish(1000, null, FEEL, POOLS);

    expect(second).toEqual(first);
  });

  it("holds the effects to the loose bits' limit and the sounds to their gaps", () => {
    const tufts = (atMs: number, count: number): Part => ({
      what: "effect",
      effect: {
        what: "fluff",
        atMs,
        at: { x: 0, y: 0 },
        tuft: "tuft-red",
        count,
        power: 1,
      },
    });
    const timeline = timelineOf(
      tufts(0, FEEL.mostLooseBits),
      tufts(10, 1),
      { what: "sound", atMs: 0, sound: "land", rung: null, volume: 1 },
      { what: "sound", atMs: 10, sound: "land", rung: null, volume: 1 },
    );

    expect([timeline.effects.length, timeline.sounds.length]).toEqual([1, 1]);
  });

  it("hands back the latest moment the parts hold the board until", () => {
    const draft = new Draft(BOARD, [], "full");

    expect([
      draft.add([
        { what: "hold", atMs: 300 },
        { what: "hold", atMs: 500 },
        { what: "hold", atMs: 400 },
      ]),
      draft.add([]),
    ]).toEqual([500, -Infinity]);
  });

  it.each<[string, Part]>([
    ["a key", { what: "key", piece: 7, channel: "x", key: keyAt(0, 1) }],
    ["a face", { what: "face", piece: 7, atMs: 0, face: "happy" }],
    ["a glow", { what: "glow", piece: 7, atMs: 0, ms: 100, amount: 1 }],
    ["a leaving", { what: "leaves", piece: 7, atMs: 0 }],
  ])("throws for %s of a piece with no track", (_, part) => {
    expect(() => timelineOf(part)).toThrow(
      new Error("No piece 7 is on the board in a move."),
    );
  });

  it("throws for a piece shown twice", () => {
    expect(() =>
      timelineOf({
        what: "shows",
        piece: { what: "frizzball", id: 2 },
        atMs: 0,
        look: lookAt({ x: 0, y: 0 }),
        face: "rest",
      }),
    ).toThrow(new Error("Piece 2 shows twice in a move."));
  });
});
