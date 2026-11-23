import { easeOutCubic } from "@fz/core/math";
import { COLUMNS } from "../rules/field";
import {
  type At,
  type BallTrack,
  type Waypoint,
  positionAt,
} from "../rules/track";
import type { Brick, Wall } from "../rules/wall";
import {
  type BallPlace,
  type DecidedRound,
  type Pace,
  type PaceMark,
  Playback,
  type PlaybackFrame,
  type PlaybackScript,
} from "./playback";
import { JUMP_MS, STEP_MS } from "./timing";

/** The one kind of brick these specs build walls of. */
type Clay = "clay";

/** Describes an event of these specs' flights, made up for them. */
type Happening = At &
  (
    | { readonly kind: "leave"; readonly ball: number }
    | { readonly kind: "hit"; readonly ball: number; readonly cell: number }
    | { readonly kind: "crack"; readonly cell: number }
    | { readonly kind: "land"; readonly ball: number }
  );

/** Describes a fuzzball as these specs' game draws it: where it is, and how many bricks it has hit. */
interface Puck extends BallPlace {
  readonly ball: number;
  hits: number;
}

/** The playback these specs make. */
type SpecPlayback = Playback<Clay, Happening, Puck, string>;

/** Describes a round of these specs, decided. */
type SpecRound = DecidedRound<Clay, Happening>;

/** Ten units a second, a unit each 100 ms, with no marks. */
const PACE: Pace = { unitsPerSecond: 10, byDistance: [], byTime: [] };

/** Returns how a frame plays: at a pace, fast-forwarded so many times, motion welcome unless said. */
function frameOf(
  pace: Pace = PACE,
  fastForward = 1,
  motion = true,
): PlaybackFrame {
  return { pace, fastForward, motion };
}

/** A frame at {@link PACE}, not fast-forwarded, motion welcome. */
const NORMAL = frameOf();

/** Returns a brick of clay with some hits left. */
function clay(hits: number): Brick<Clay> {
  return { kind: "clay", hits, full: hits, plates: 0, tint: 0, twin: null };
}

/** Returns a wall of a row, its bricks in the cells given, from the left. */
function wallOf(...bricks: (Brick<Clay> | null)[]): Wall<Clay> {
  const row = Array.from(
    { length: COLUMNS },
    (_, cell) => bricks[cell] ?? null,
  );
  return { bricks: row, rows: 1, lowestRow: 6 };
}

/** The wall a round starts on: two hits of clay in cell 2 and one in cell 4. */
const WALL = wallOf(null, null, clay(2), null, clay(1));

/** The wall the round leaves, a row lower. */
const NEXT_WALL: Wall<Clay> = { ...wallOf(null, null, clay(1)), lowestRow: 5 };

/** A fuzzball's flight straight up from the floor's middle to row 5 and back, 10 units. */
const UP_AND_BACK: readonly Waypoint[] = [
  { at: 0, x: 4.5, y: 0.25 },
  { at: 5, x: 4.5, y: 5.25 },
  { at: 10, x: 4.5, y: 0.25 },
];

/**
 * A second fuzzball's, leaving at 2 from x = 2, passing a pair of twins at
 * 3, from x = 2 to x = 7, and landing at 6.
 */
const THROUGH_TWINS: readonly Waypoint[] = [
  { at: 2, x: 2, y: 0.25 },
  { at: 3, x: 2, y: 1.25 },
  { at: 3, x: 7, y: 1.25 },
  { at: 6, x: 7, y: 0.25 },
];

/** Returns a round of fuzzballs flown along their tracks, its events as given, coming down a row by a step. */
function roundOf(
  events: readonly Happening[],
  tracks: readonly (readonly Waypoint[])[],
  changes: Partial<SpecRound> = {},
): SpecRound {
  return {
    events,
    tracks: tracks.map((waypoints, ball): BallTrack<string> => ({
      ball,
      role: "puck",
      waypoints,
    })),
    length: Math.max(...events.map(({ at }) => at)),
    nextWall: NEXT_WALL,
    rowsDown: 1,
    jumped: false,
    ...changes,
  };
}

/** A fuzzball that hits cell 2 twice and cell 4 once, cracking it, and lands. */
const HITTING = roundOf(
  [
    { at: 0, kind: "leave", ball: 0 },
    { at: 2, kind: "hit", ball: 0, cell: 2 },
    { at: 5, kind: "hit", ball: 0, cell: 4 },
    { at: 5, kind: "crack", cell: 4 },
    { at: 8, kind: "hit", ball: 0, cell: 2 },
    { at: 10, kind: "land", ball: 0 },
  ],
  [UP_AND_BACK],
);

/** Two fuzzballs, the second through a pair of twins and landing first. */
const PAIR = roundOf(
  [
    { at: 0, kind: "leave", ball: 0 },
    { at: 2, kind: "leave", ball: 1 },
    { at: 6, kind: "land", ball: 1 },
    { at: 10, kind: "land", ball: 0 },
  ],
  [UP_AND_BACK, THROUGH_TWINS],
);

/**
 * Plays a game of these specs' kinds: it notes each event it hears, and a
 * fuzzball's hits on its record; a hit leaves its brick a hit fewer, and a
 * crack none.
 */
class SpecScript implements PlaybackScript<Clay, Happening, Puck, string> {
  /** What it heard, in order: each event by its kind, quiet ones marked. */
  readonly heard: string[] = [];
  /** The fuzzballs it was asked to make a record for, by number. */
  readonly made: number[] = [];
  /** The playback it plays, whose records it writes. */
  playback: SpecPlayback | null = null;

  ball(ball: number): Puck {
    this.made.push(ball);
    return { ball, x: 0, y: 0, hits: 0 };
  }

  reach(event: Happening, quiet: boolean): string {
    this.heard.push(quiet ? `quiet ${event.kind}` : event.kind);
    if (event.kind === "hit" && this.playback !== null) {
      this.playback.ballOf(event.ball).hits++;
    }
    return quiet ? "hush" : `${event.kind} at ${String(event.at)}`;
  }

  isLanding(event: Happening): boolean {
    return event.kind === "land";
  }

  changesOf(
    event: Happening,
    cells: readonly (Brick<Clay> | null)[],
    leave: (cell: number, brick: Brick<Clay> | null) => void,
  ): void {
    if (event.kind === "crack") leave(event.cell, null);
    if (event.kind !== "hit") return;
    const brick = cells[event.cell];
    if (brick) leave(event.cell, { ...brick, hits: brick.hits - 1 });
  }
}

/** Returns a playback of a wall, and the script it plays by. */
function playbackOf(wall: Wall<Clay> = WALL): {
  playback: SpecPlayback;
  script: SpecScript;
} {
  const script = new SpecScript();
  const playback = new Playback(script, wall, { event: BLANK, effects: "" });
  script.playback = playback;
  return { playback, script };
}

/** Stands in the log's records before an event is written to them. */
const BLANK: Happening = { at: 0, kind: "crack", cell: 0 };

/** Returns a playback playing a round from its start, on the wall it starts on. */
function playing(
  round: SpecRound = HITTING,
  wall: Wall<Clay> = WALL,
): {
  playback: SpecPlayback;
  script: SpecScript;
} {
  const made = playbackOf(wall);
  made.playback.play(round);
  return made;
}

/** Plays frames of a time each, at a pace, as many as some milliseconds take. */
function playFrames(
  playback: SpecPlayback,
  ms: number,
  frameMs: number,
  pace: Pace = PACE,
  fastForward = 1,
): void {
  for (let played = 0; played < ms - 1e-9; played += frameMs) {
    playback.advance(
      Math.min(frameMs, ms - played),
      frameOf(pace, fastForward),
    );
  }
}

/** Returns what the log holds since a serial, as the effects the script said of each. */
function loggedSince(playback: SpecPlayback, serial = 0): string[] {
  const logged: string[] = [];
  playback.view.events.forEachSince(serial, ({ effects }) =>
    logged.push(effects),
  );
  return logged;
}

/** Returns where each fuzzball in the air is drawn, by ball. */
function placesOf(playback: SpecPlayback): [number, number, number][] {
  return playback.view.balls.map(({ ball, x, y }) => [ball, x, y]);
}

/** Returns the hits left of each brick of a wall, by cell, and null for each cell with none. */
function hitsOf(wall: Wall<Clay>): (number | null)[] {
  return wall.bricks.map((brick) => brick?.hits ?? null);
}

/** Returns a pace of ten units a second with marks as given. */
function paceWith(
  byDistance: readonly PaceMark[],
  byTime: readonly PaceMark[] = [],
): Pace {
  return { unitsPerSecond: 10, byDistance, byTime };
}

describe("Playback, still", () => {
  it("starts with the wall it is handed shown still, nothing in the air, at no moment", () => {
    const { playback } = playbackOf();

    expect([
      playback.phase,
      playback.moment,
      playback.view.wall,
      playback.view.wallDrop,
      playback.view.rowsDown,
      playback.view.balls.length,
      playback.view.events.latest,
    ]).toEqual(["still", 0, WALL, 1, 0, 0, 0]);
  });

  it("plays nothing while still", () => {
    const { playback, script } = playbackOf();

    playback.advance(1000, NORMAL);

    expect([playback.moment, script.heard]).toEqual([0, []]);
  });

  it("leaves a round in the air for a wall shown still, at no moment", () => {
    const { playback } = playing();
    playFrames(playback, 300, 100);

    playback.show(NEXT_WALL);

    expect([
      playback.phase,
      playback.moment,
      playback.view.wall,
      playback.view.balls.length,
    ]).toEqual(["still", 0, NEXT_WALL, 0]);
  });

  it("shows a wall still in the middle of its step, its step done", () => {
    const { playback } = playing();
    playFrames(playback, 1000, 100);
    playback.advance(STEP_MS / 2, NORMAL);

    playback.show(WALL);

    expect([playback.view.wallDrop, playback.view.rowsDown]).toEqual([1, 0]);
  });
});

describe("Playback, played while it plays", () => {
  it("ignores a round played while another flies", () => {
    const { playback } = playing();
    playback.advance(300, NORMAL);

    playback.play(PAIR);
    playback.advance(100, NORMAL);

    expect([playback.moment, placesOf(playback).length]).toEqual([
      expect.closeTo(4, 9),
      1,
    ]);
  });

  it("ignores a round played while the last one's wall settles", () => {
    const { playback } = playing();
    playback.advance(1000, NORMAL);

    playback.play(PAIR);
    playback.advance(STEP_MS, NORMAL);

    expect([playback.phase, playback.moment]).toEqual(["still", 10]);
  });
});

describe("Playback's moment", () => {
  it("starts a round at no moment, flying", () => {
    const { playback } = playing();

    expect([playback.phase, playback.moment]).toEqual(["flying", 0]);
  });

  it("moves on by a frame's time at the pace", () => {
    const { playback } = playing();

    playback.advance(250, NORMAL);

    expect(playback.moment).toBeCloseTo(2.5, 9);
  });

  it("moves on as many times faster as fast-forward says", () => {
    const { playback } = playing();

    playback.advance(200, frameOf(PACE, 4));

    expect(playback.moment).toBeCloseTo(8, 9);
  });

  it.each([0, -50, Number.NaN])("plays no time for a frame of %d ms", (ms) => {
    const { playback } = playing();

    playback.advance(ms, NORMAL);

    expect(playback.moment).toBe(0);
  });

  it("goes faster from a mark by distance, the frame split where it falls", () => {
    const { playback } = playing();

    playback.advance(400, frameOf(paceWith([{ from: 2, times: 2 }])));

    expect(playback.moment).toBeCloseTo(6, 9);
  });

  it("goes faster from a mark by time, the frame split where it falls", () => {
    const { playback } = playing();

    playback.advance(400, frameOf(paceWith([], [{ from: 300, times: 3 }])));

    expect(playback.moment).toBeCloseTo(6, 9);
  });

  it("stacks every mark passed, by distance and by time", () => {
    const { playback } = playing();
    const pace = paceWith(
      [
        { from: 1, times: 2 },
        { from: 3, times: 1.5 },
      ],
      [{ from: 200, times: 2 }],
    );

    playback.advance(250, frameOf(pace));

    // 1 unit in 100 ms, 2 at 2× in 100 ms, as the mark by time falls with
    // the second by distance, and 50 ms at 6×.
    expect(playback.moment).toBeCloseTo(6, 9);
  });

  it("counts a mark from the start as passed at once", () => {
    const { playback } = playing();

    playback.advance(100, frameOf(paceWith([{ from: 0, times: 3 }])));

    expect(playback.moment).toBeCloseTo(3, 9);
  });

  it("counts a mark by time in the frames' time, not fast-forwarded", () => {
    const { playback } = playing();

    playback.advance(100, frameOf(paceWith([], [{ from: 50, times: 2 }]), 4));

    expect(playback.moment).toBeCloseTo(6, 9);
  });

  it.each([60, 144, 7])(
    "reaches the same moment at %i frames a second",
    (rate) => {
      const { playback } = playing(
        roundOf([{ at: 40, kind: "land", ball: 0 }], [UP_AND_BACK]),
      );
      const pace = paceWith(
        [{ from: 1.3, times: 1.7 }],
        [{ from: 333, times: 2.1 }],
      );

      playFrames(playback, 1000, 1000 / rate, pace);

      // 1.3 units in 130 ms, 3.451 units in 203 ms at 1.7×, and 667 ms at
      // 3.57×.
      expect(playback.moment).toBeCloseTo(1.3 + 3.451 + 23.8119, 6);
    },
  );

  it("stops at the flight's length once it ends", () => {
    const { playback } = playing();

    playback.advance(1500, NORMAL);

    expect(playback.moment).toBe(10);
  });
});

describe("Playback's events", () => {
  it("reaches each event at or before the moment, in order, logged with what the game says it calls for", () => {
    const { playback } = playing();

    playback.advance(500, NORMAL);

    expect(loggedSince(playback)).toEqual([
      "leave at 0",
      "hit at 2",
      "hit at 5",
      "crack at 5",
    ]);
  });

  it("reaches each event once, however many frames pass it", () => {
    const { playback, script } = playing();

    playFrames(playback, 600, 10);

    expect(script.heard).toEqual(["leave", "hit", "hit", "crack"]);
  });

  it("numbers the events on from one round to the next", () => {
    const { playback } = playing();
    playFrames(playback, 1300, 100);
    playback.show(NEXT_WALL);
    playback.play(PAIR);

    playback.advance(0, NORMAL);

    expect(playback.view.events.latest).toBe(7);
  });

  it("lets the game write what an event does to a fuzzball's record", () => {
    const { playback } = playing();

    playback.advance(600, NORMAL);

    expect(playback.view.balls[0]?.hits).toBe(2);
  });

  it("hands a record of no fuzzball's for one the flight has no track for", () => {
    const { playback } = playing();

    const stray = playback.ballOf(7);

    expect([stray.ball, stray === playback.ballOf(-1)]).toEqual([-1, true]);
  });
});

describe("Playback, landed at once", () => {
  it("reaches every event at the next frame, quietly but for the last landing", () => {
    const { playback, script } = playing(PAIR);
    playback.advance(100, NORMAL);

    playback.landAtOnce();
    playback.advance(0, NORMAL);

    expect(script.heard).toEqual([
      "leave",
      "quiet leave",
      "quiet land",
      "land",
    ]);
  });

  it("logs what the game says of each quiet event", () => {
    const { playback } = playing(PAIR);
    playback.advance(100, NORMAL);

    playback.landAtOnce();
    playback.advance(0, frameOf(PACE, 1, false));

    expect(loggedSince(playback, 1)).toEqual(["hush", "hush", "land at 10"]);
  });

  it("ends the flight at its length, its fuzzballs down and the wall handed over", () => {
    const { playback } = playing(PAIR);

    playback.landAtOnce();
    playback.advance(16, NORMAL);

    expect([
      playback.moment,
      playback.phase,
      playback.view.balls.length,
      playback.view.wall,
    ]).toEqual([10, "settling", 0, NEXT_WALL]);
  });

  it("does nothing while no flight flies", () => {
    const { playback, script } = playbackOf();

    playback.landAtOnce();
    playback.play(PAIR);
    playback.advance(100, NORMAL);

    expect(script.heard).toEqual(["leave"]);
  });
});

describe("Playback's fuzzballs", () => {
  it.each([0, 2.5, 5, 7.25, 9.9])(
    "draws a fuzzball where its track has it at %s",
    (at) => {
      const { playback } = playing();

      playback.advance(at * 100, NORMAL);

      const place = positionAt(
        { ball: 0, role: "puck", waypoints: UP_AND_BACK },
        at,
      );
      expect(placesOf(playback)).toEqual([
        [0, place?.x, expect.closeTo(place?.y ?? Number.NaN, 9)],
      ]);
    },
  );

  it("follows each fuzzball from frame to frame, as its track has it", () => {
    const { playback } = playing(PAIR);

    playFrames(playback, 470, 10);

    expect(placesOf(playback)).toEqual([
      [0, 4.5, expect.closeTo(4.95, 9)],
      [1, 7, expect.closeTo(1.25 - 1.7 / 3, 9)],
    ]);
  });

  it("draws a fuzzball from its first waypoint's moment on, in order of ball", () => {
    const { playback } = playing(PAIR);

    playback.advance(200, NORMAL);

    expect(placesOf(playback)).toEqual([
      [0, 4.5, expect.closeTo(2.25, 9)],
      [1, 2, 0.25],
    ]);
  });

  it("draws one at a moment a pair of twins share at the later, where it flies on from", () => {
    const { playback } = playing(PAIR);

    playback.advance(300, NORMAL);

    expect(placesOf(playback)[1]).toEqual([1, 7, 1.25]);
  });

  it("draws one no more from its last waypoint's moment", () => {
    const { playback } = playing(PAIR);

    playback.advance(600, NORMAL);

    expect(placesOf(playback).map(([ball]) => ball)).toEqual([0]);
  });

  it("draws none once the flight ends, though a track runs on past it", () => {
    const { playback } = playing(
      roundOf(
        [
          { at: 0, kind: "leave", ball: 0 },
          { at: 6, kind: "land", ball: 0 },
        ],
        [UP_AND_BACK],
      ),
    );

    playback.advance(700, NORMAL);

    expect(placesOf(playback)).toEqual([]);
  });

  it("draws one with no waypoints never", () => {
    const { playback } = playing(roundOf(PAIR.events, [UP_AND_BACK, []]));

    playback.advance(300, NORMAL);

    expect(placesOf(playback).map(([ball]) => ball)).toEqual([0]);
  });

  it("draws each from the same record, frame after frame, round after round", () => {
    const { playback, script } = playing(PAIR);
    playback.advance(300, NORMAL);
    const [first] = playback.view.balls;
    playFrames(playback, 1000, 100);
    playback.play(PAIR);

    playback.advance(300, NORMAL);

    expect([playback.view.balls[0] === first, script.made]).toEqual([
      true,
      [-1, 0, 1],
    ]);
  });

  it("draws none of an earlier round's fuzzballs that the next round's flight has no track for", () => {
    const { playback } = playing(PAIR);
    playFrames(playback, 1300, 100);
    playback.play(HITTING);

    playback.advance(300, NORMAL);

    expect(placesOf(playback).map(([ball]) => ball)).toEqual([0]);
  });
});

describe("Playback's wall", () => {
  it("changes a brick as each event that changes it is reached", () => {
    const { playback } = playing();

    playback.advance(500, NORMAL);

    expect(hitsOf(playback.view.wall)).toEqual(
      hitsOf(wallOf(null, null, clay(1))),
    );
  });

  it("reads each brick as the events before it leave it", () => {
    const { playback } = playing();

    playback.advance(900, NORMAL);

    expect(playback.view.wall.bricks[2]?.hits).toBe(0);
  });

  it("hands on another wall each frame that changes it, and the same one while none does", () => {
    const { playback } = playing();
    playback.advance(100, NORMAL);
    const before = playback.view.wall;
    playback.advance(150, NORMAL);
    const changed = playback.view.wall;

    playback.advance(100, NORMAL);

    expect([changed !== before, playback.view.wall === changed]).toEqual([
      true,
      true,
    ]);
  });

  it("keeps the wall a frame handed on as it was through the next frame's changes", () => {
    const { playback } = playing();
    playback.advance(300, NORMAL);
    const handedOn = playback.view.wall;

    playback.advance(300, NORMAL);

    expect(hitsOf(handedOn)).toEqual(
      hitsOf(wallOf(null, null, clay(1), null, clay(1))),
    );
  });

  it("changes nothing of the wall it started on", () => {
    const { playback } = playing();

    playback.advance(900, NORMAL);

    expect(hitsOf(WALL)).toEqual([
      null,
      null,
      2,
      null,
      1,
      null,
      null,
      null,
      null,
    ]);
  });
});

describe("Playback's landing", () => {
  it("hands over the wall the round leaves as its flight ends, to step down to from its place", () => {
    const { playback } = playing();

    playback.advance(1000, NORMAL);

    expect([
      playback.phase,
      playback.view.wall,
      playback.view.rowsDown,
      playback.view.wallDrop,
    ]).toEqual(["settling", NEXT_WALL, 1, 0]);
  });

  it.each([
    [false, STEP_MS],
    [true, JUMP_MS],
  ])("eases the wall down, jumping %s, over %i ms", (jumped, settleMs) => {
    const { playback } = playing({ ...HITTING, jumped, rowsDown: 3 });
    playback.advance(1000, NORMAL);

    playback.advance(settleMs / 4, NORMAL);

    expect([playback.view.wallDrop, playback.view.rowsDown]).toEqual([
      easeOutCubic(0.25),
      3,
    ]);
  });

  it.each([
    [false, STEP_MS],
    [true, JUMP_MS],
  ])(
    "brings the wall to rest, jumping %s, once %i ms have passed",
    (jumped, settleMs) => {
      const { playback } = playing({ ...HITTING, jumped });
      playback.advance(1000, NORMAL);
      playback.advance(settleMs - 1, NORMAL);
      const before = playback.phase;

      playback.advance(1, NORMAL);

      expect([
        before,
        playback.phase,
        playback.view.wallDrop,
        playback.view.rowsDown,
      ]).toEqual(["settling", "still", 1, 0]);
    },
  );

  it("brings the wall to rest at once where motion is unwelcome", () => {
    const { playback } = playing();

    playback.advance(1000, frameOf(PACE, 1, false));

    expect([
      playback.phase,
      playback.view.wallDrop,
      playback.view.rowsDown,
    ]).toEqual(["still", 1, 0]);
  });

  it("brings the wall to rest at once where it comes down no rows", () => {
    const { playback } = playing({ ...HITTING, rowsDown: 0 });

    playback.advance(1000, NORMAL);

    expect(playback.phase).toBe("still");
  });

  it("plays nothing once the wall has come to rest", () => {
    const { playback } = playing();
    playFrames(playback, 1300, 100);
    const { wall } = playback.view;

    playback.advance(1000, NORMAL);

    expect([
      playback.phase,
      playback.moment,
      playback.view.wall,
      playback.view.wallDrop,
      playback.view.events.latest,
    ]).toEqual(["still", 10, wall, 1, 6]);
  });
});

describe("Playback, played on along another flight", () => {
  /** The pair's flight changed from 4 on: the first fuzzball comes straight down from where it is, landing at 7.75. */
  const DROPPED = roundOf(
    [
      { at: 0, kind: "leave", ball: 0 },
      { at: 2, kind: "leave", ball: 1 },
      { at: 4, kind: "hit", ball: 0, cell: 2 },
      { at: 6, kind: "land", ball: 1 },
      { at: 7.75, kind: "land", ball: 0 },
    ],
    [
      [
        { at: 0, x: 4.5, y: 0.25 },
        { at: 4, x: 4.5, y: 4.25 },
        { at: 7.75, x: 4.5, y: 0.25 },
      ],
      THROUGH_TWINS,
    ],
    { rowsDown: 0 },
  );

  it("keeps the events reached and goes on with the new flight's after the moment", () => {
    const { playback, script } = playing(PAIR);
    playback.advance(400, NORMAL);

    playback.playOn(DROPPED);
    playback.advance(400, NORMAL);

    expect(script.heard).toEqual(["leave", "leave", "hit", "land", "land"]);
  });

  it("goes on along each fuzzball's new track from where it is", () => {
    const { playback } = playing(PAIR);
    playback.advance(400, NORMAL);

    playback.playOn(DROPPED);
    playback.advance(100, NORMAL);

    expect(placesOf(playback)[0]).toEqual([
      0,
      4.5,
      expect.closeTo(4.25 - 4 / 3.75, 9),
    ]);
  });

  it("lands a fuzzball that left at the moment, its new track ending there", () => {
    const { playback } = playing(PAIR);
    playback.advance(200, NORMAL);
    const kept = roundOf(
      [
        { at: 0, kind: "leave", ball: 0 },
        { at: 2, kind: "leave", ball: 1 },
        { at: 2, kind: "land", ball: 1 },
        { at: 10, kind: "land", ball: 0 },
      ],
      [UP_AND_BACK, [{ at: 2, x: 2, y: 0.25 }]],
    );

    playback.playOn(kept);
    playback.advance(100, NORMAL);

    expect(placesOf(playback).map(([ball]) => ball)).toEqual([0]);
  });

  it("keeps the wall the events reached leave, working out only the new flight's after them", () => {
    const { playback } = playing();
    playback.advance(300, NORMAL);
    const changed = roundOf(
      [
        { at: 0, kind: "leave", ball: 0 },
        { at: 2, kind: "hit", ball: 0, cell: 2 },
        { at: 4, kind: "hit", ball: 0, cell: 4 },
        { at: 10, kind: "land", ball: 0 },
      ],
      [UP_AND_BACK],
    );

    playback.playOn(changed);
    playback.advance(200, NORMAL);

    expect(hitsOf(playback.view.wall)).toEqual(
      hitsOf(wallOf(null, null, clay(1), null, clay(0))),
    );
  });

  it("changes the wall as the new flight's events after the moment say", () => {
    const { playback } = playing(PAIR);
    playback.advance(350, NORMAL);

    playback.playOn(DROPPED);
    playback.advance(100, NORMAL);

    expect(playback.view.wall.bricks[2]?.hits).toBe(1);
  });

  it("ends as the new flight does", () => {
    const { playback } = playing(PAIR);
    playback.advance(400, NORMAL);

    playback.playOn(DROPPED);
    playback.advance(375, NORMAL);

    expect([playback.moment, playback.phase]).toEqual([7.75, "still"]);
  });

  it("does nothing once the flight has ended", () => {
    const { playback, script } = playing(PAIR);
    playback.advance(1000, frameOf(PACE, 1, false));

    playback.playOn(DROPPED);
    playback.advance(100, NORMAL);

    expect(script.heard.filter((heard) => heard === "hit")).toEqual([]);
  });
});
