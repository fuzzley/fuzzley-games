import { playFor } from "@fz/core/testing";
import { easeOutCubic } from "@fz/core/math";
import {
  type BallRole,
  type BallTrack,
  type FlightEvent,
  type Waypoint,
  positionAt,
} from "../rules/flight/events";
import { RADIUS } from "../rules/tuning";
import {
  FLIGHT_FIXTURES,
  type FlightFixture,
} from "../testing/flight_fixtures";
import { wallFrom } from "../testing/wall_picture";
import type { Beat, SoundName } from "./effects/effects";
import { JUMP_MS, STEP_MS } from "./effects/timing";
import {
  type BallView,
  FLIGHT_PACE,
  type FlightPace,
  type FlightSpeed,
  type PlayOptions,
  RoundPlay,
} from "./round_play";
import type { Card, RoundChange } from "./run_state";

const { plain, punch, zap, columnZap, hotShot, triple, friend, bored } =
  FLIGHT_FIXTURES;

/** A frame's time in these specs, which adds up to whole milliseconds exactly. */
const FRAME_MS = 25;

/** A frame at Normal, long flights sped up, motion welcome and the run under way. */
const NORMAL: PlayOptions = {
  pace: FLIGHT_PACE,
  speed: "normal",
  fast: false,
  speedUp: true,
  motion: true,
  paused: false,
};

/** A frame as {@link NORMAL}, changed as given. */
function options(changes: Partial<PlayOptions>): PlayOptions {
  return { ...NORMAL, ...changes };
}

/** Returns a level's play with a fixture's round released from its start. */
function playing(fixture: FlightFixture): RoundPlay {
  const play = new RoundPlay(fixture.start);
  play.release(fixture.round);
  return play;
}

/** Plays as many frames as add up to some milliseconds, and returns the last frame's change. */
function playMs(
  play: RoundPlay,
  ms: number,
  frame: PlayOptions = NORMAL,
  frameMs = FRAME_MS,
): RoundChange {
  let change = play.advance(frameMs, frame);
  for (let played = 1; played < Math.round(ms / frameMs); played++) {
    change = play.advance(frameMs, frame);
  }
  return change;
}

/** Plays one frame that moves the flight on by some units at Normal, long flights not sped up. */
function playOnBy(play: RoundPlay, units: number): void {
  const ms = (units / FLIGHT_PACE.unitsPerSecond.normal) * 1000;
  play.advance(ms, options({ speedUp: false }));
}

/** Plays frames until the round's flight ends, and returns the last frame's change. */
function playUntilLanded(play: RoundPlay): RoundChange {
  for (let played = FRAME_MS; played < 600_000; played += FRAME_MS) {
    const change = play.advance(FRAME_MS, NORMAL);
    if (play.phase !== "flying") return change;
  }
  throw new Error("The flight never ended.");
}

/** Plays frames until the round's wall comes to rest, and returns how long that took. */
function playUntilSettled(
  play: RoundPlay,
  frame: PlayOptions = NORMAL,
  frameMs = FRAME_MS,
): number {
  for (let played = frameMs; played < 600_000; played += frameMs) {
    if (play.advance(frameMs, frame).settled !== null) return played;
  }
  throw new Error("The wall never came to rest.");
}

/** Plays frames from the wall's rest until a card's wait runs out, and returns how long that took and the card. */
function playUntilOpens(
  play: RoundPlay,
  frame: PlayOptions,
): { ms: number; card: string } {
  for (let played = FRAME_MS; played < 10_000; played += FRAME_MS) {
    const { opens } = play.advance(FRAME_MS, frame);
    if (opens !== null) return { ms: played, card: opens };
  }
  throw new Error("The card never opened.");
}

/** Plays frames for a while, and returns the first card whose wait runs out in them, or null for none. */
function opensWithin(play: RoundPlay, ms: number): Card | null {
  for (let played = 0; played < ms; played += FRAME_MS) {
    const { opens } = play.advance(FRAME_MS, NORMAL);
    if (opens !== null) return opens;
  }
  return null;
}

/** Plays a fixture's round to its rest, then aims and releases another fixture's on the same level's play. */
function playingAfter(first: FlightFixture, second: FlightFixture): RoundPlay {
  const play = playing(first);
  playUntilSettled(play);
  play.aim(second.start);
  play.release(second.round);
  return play;
}

/** Returns the events a level's play has handed on, in order. */
function loggedEvents(play: RoundPlay): FlightEvent[] {
  const events: FlightEvent[] = [];
  play.view.events.forEachSince(0, ({ event }) => events.push(event));
  return events;
}

/** Returns the sounds of the events a level's play has handed on, in order, since a serial. */
function loggedSounds(play: RoundPlay, since = 0): (SoundName | null)[] {
  const sounds: (SoundName | null)[] = [];
  play.view.events.forEachSince(since, ({ effects }) =>
    sounds.push(effects.sound),
  );
  return sounds;
}

/** Returns the beats a level's play has handed on, in order. */
function loggedBeats(play: RoundPlay): Beat[] {
  const beats: Beat[] = [];
  play.view.beats.forEachSince(0, ({ beat }) => beats.push(beat));
  return beats;
}

/** Returns a fuzzball in the air by its number, or undefined. */
function ballOf(play: RoundPlay, ball: number): BallView | undefined {
  return play.view.balls.find((each) => each.ball === ball);
}

/** Returns a fuzzball's track in a fixture's flight. */
function trackOf(fixture: FlightFixture, ball: number): BallTrack {
  const track = fixture.round.flight.tracks[ball];
  if (track === undefined) throw new Error(`No track for ${ball}.`);
  return track;
}

/** Describes a place in the field. */
interface Place {
  readonly x: number;
  readonly y: number;
}

/** Returns where a fuzzball in the air is. */
function placeIn(play: RoundPlay, ball: number): Place {
  const view = ballOf(play, ball);
  if (view === undefined) throw new Error(`${ball} isn't in the air.`);
  return { x: view.x, y: view.y };
}

/** How near a place a fuzzball must be to be there, in field units: a hair. */
const HAIR = 1e-9;

/** Returns how far a fuzzball in the air is from a place, in field units. */
function offPlace(play: RoundPlay, ball: number, place: Place): number {
  const { x, y } = placeIn(play, ball);
  return Math.hypot(x - place.x, y - place.y);
}

/**
 * Returns how far a fuzzball in the air is from where its track has it at a
 * moment, as the rules' `positionAt()` says, in field units.
 */
function offTrack(
  play: RoundPlay,
  fixture: FlightFixture,
  ball: number,
  at: number,
): number {
  const place = positionAt(trackOf(fixture, ball), at);
  if (place === null) throw new Error(`${ball} isn't in the air at ${at}.`);
  return offPlace(play, ball, place);
}

/** Returns how far the fuzzballs in the air are, the furthest of them, from where their tracks have them at a moment. */
function offTracks(
  play: RoundPlay,
  fixture: FlightFixture,
  at: number,
): number {
  if (play.view.balls.length === 0) throw new Error("None is in the air.");
  return Math.max(
    ...play.view.balls.map(({ ball }) => offTrack(play, fixture, ball, at)),
  );
}

/** Returns a fixture whose flight has more events, put in its order by their moments. */
function withEvents(
  fixture: FlightFixture,
  more: readonly FlightEvent[],
): FlightFixture {
  const events = [...fixture.round.flight.events, ...more].sort(
    (a, b) => a.at - b.at,
  );
  const flight = { ...fixture.round.flight, events };
  return { ...fixture, round: { ...fixture.round, flight } };
}

/** Returns a fixture whose round ends with the wall it leaves standing as a picture says. */
function endingOn(
  fixture: FlightFixture,
  rows: readonly string[],
  lowestRow: number,
): FlightFixture {
  const next = { ...fixture.round.next, wall: wallFrom(rows, { lowestRow }) };
  return { ...fixture, round: { ...fixture.round, next } };
}

/**
 * Returns a fixture of one fuzzball flown along waypoints, launched and
 * landed and nothing between, the plain shot's outcome and next round kept.
 */
function flownAlong(waypoints: readonly Waypoint[]): FlightFixture {
  const first = waypoints[0];
  const last = waypoints.at(-1);
  if (first === undefined || last === undefined) throw new Error("No path.");
  const flight = {
    events: [
      launchFrom(first),
      { at: last.at, kind: "land", ball: 0, x: last.x },
    ] satisfies FlightEvent[],
    tracks: [{ ball: 0, role: "player", waypoints }] satisfies BallTrack[],
    length: last.at,
    capped: 0,
  };
  return { ...plain, round: { ...plain.round, flight } };
}

/** Returns a fuzzball's launch from a place, plain and straight up: the player's unless said. */
function launchFrom(
  { at, x, y }: Waypoint,
  ball = 0,
  role: BallRole = "player",
): FlightEvent {
  return {
    at,
    kind: "launch",
    ball,
    role,
    x,
    y,
    dx: 0,
    dy: 1,
    charge: 0,
    hot: false,
  };
}

/** Returns waypoints from the floor's middle through places, a unit of `at` a unit. */
function pathThrough(
  places: readonly (readonly [number, number])[],
): Waypoint[] {
  let at = 0;
  let [fromX, fromY] = [4.5, RADIUS];
  return [[4.5, RADIUS] as const, ...places].map(([x, y]) => {
    at += Math.hypot(x - fromX, y - fromY);
    [fromX, fromY] = [x, y];
    return { at, x, y };
  });
}

/**
 * A fuzzball that rattles between the side walls along row 5 and comes back
 * to the floor's middle, some 982 units: 70 seconds at Normal.
 */
const LONG: FlightFixture = flownAlong(
  pathThrough([
    ...Array.from({ length: 115 }, (_, crossing): [number, number] => [
      crossing % 2 === 0 ? 8.75 : 0.25,
      5,
    ]),
    [4.5, RADIUS],
  ]),
);

/**
 * Returns a flight in which the player's fuzzball flies straight up and back,
 * 9.5 units, while another launched behind it goes half as high and lands
 * first.
 */
function landingFirst(role: BallRole): FlightFixture {
  const alone = flownAlong(
    pathThrough([
      [4.5, 5],
      [4.5, RADIUS],
    ]),
  );
  const other: Waypoint[] = [
    { at: 0.7, x: 4.5, y: RADIUS },
    { at: 2.45, x: 4.5, y: 2 },
    { at: 4.2, x: 4.5, y: RADIUS },
  ];
  const [launch, landing] = alone.round.flight.events;
  if (launch === undefined || landing === undefined)
    throw new Error("No flight.");
  const flight = {
    ...alone.round.flight,
    events: [
      launch,
      launchFrom({ at: 0.7, x: 4.5, y: RADIUS }, 1, role),
      { at: 4.2, kind: "land", ball: 1, x: 4.5 },
      landing,
    ] satisfies FlightEvent[],
    tracks: [
      ...alone.round.flight.tracks,
      { ball: 1, role, waypoints: other },
    ] satisfies BallTrack[],
  };
  return { ...alone, round: { ...alone.round, flight } };
}

/**
 * The plain shot, with two bricks of the wall's top made up for the view
 * to break after its strike, a unit apart.
 */
const BREAKING_ON: FlightFixture = withEvents(plain, [
  {
    at: 7.5,
    kind: "break",
    cell: 36,
    brick: "brick",
    by: "zap",
    streak: 1,
    points: 10,
  },
  {
    at: 8.5,
    kind: "break",
    cell: 37,
    brick: "brick",
    by: "zap",
    streak: 2,
    points: 10,
  },
]);

/** The moment {@link RIPPLING}'s zap ripples on to, half a unit past the plain shot's landing. */
const RIPPLED_AT = plain.round.flight.length + 0.5;

/**
 * The plain shot, with a zap made up for the view rippling on past its
 * landing, which its length reaches: it breaks the brick at the other end
 * of the row and frees a friend, as a cage would, and the round leaves the
 * wall without it.
 */
const RIPPLING: FlightFixture = (() => {
  const { round, ...fixture } = withEvents(plain, [
    { at: RIPPLED_AT, kind: "zap", cell: 8, pattern: "row", reaches: [0] },
    {
      at: RIPPLED_AT,
      kind: "break",
      cell: 0,
      brick: "brick",
      by: "zap",
      streak: 1,
      points: 10,
    },
    { at: RIPPLED_AT, kind: "free", cell: 0, ink: 3 },
  ]);
  const { wall } = round.next;
  const bricks = wall.bricks.map((brick, cell) => (cell === 0 ? null : brick));
  return {
    ...fixture,
    round: {
      ...round,
      flight: { ...round.flight, length: RIPPLED_AT },
      next: { ...round.next, wall: { ...wall, bricks } },
    },
  };
})();

/** How long {@link LONG} flies at Normal, in milliseconds, not sped up. */
const LONG_MS = (LONG.round.flight.length / 14) * 1000;

describe("RoundPlay, aiming", () => {
  it("aims the round a level starts with", () => {
    const play = new RoundPlay(plain.start);

    expect({
      phase: play.phase,
      start: play.start,
      round: play.round,
      waitingX: play.waitingX,
      wall: play.view.wall,
      wallDrop: play.view.wallDrop,
      balls: play.view.balls,
    }).toEqual({
      phase: "aiming",
      start: plain.start,
      round: null,
      waitingX: plain.start.x,
      wall: plain.start.wall,
      wallDrop: 1,
      balls: [],
    });
  });

  it("plays nothing while a round is aimed", () => {
    const play = new RoundPlay(plain.start);

    const change = play.advance(1000, NORMAL);

    expect([change, play.view.events.latest]).toEqual([
      { freed: [], settled: null, opens: null },
      0,
    ]);
  });

  it("plays the round released", () => {
    const play = new RoundPlay(plain.start);

    play.release(plain.round);

    expect([play.phase, play.round]).toEqual(["flying", plain.round]);
  });

  it("ignores a round released while another plays", () => {
    const play = playing(plain);

    play.release(punch.round);

    expect(play.round).toBe(plain.round);
  });
});

describe("RoundPlay's flight", () => {
  it.each<[FlightSpeed, boolean, number]>([
    ["normal", false, 14],
    ["fast", false, 22],
    ["normal", true, 56],
    ["fast", true, 88],
  ])(
    "flies at %s, fast-forward held %s, %i units a second",
    (speed, fast, unitsPerSecond) => {
      const play = playing(bored);

      playMs(play, 100, options({ speed, fast }));

      expect(offTrack(play, bored, 0, unitsPerSecond / 10)).toBeLessThan(HAIR);
    },
  );

  it.each([
    ["in frames of 25 ms", 25],
    ["in frames of 300 ms, one of them across the eighth second", 300],
  ])("doubles its speed once eight seconds old, %s", (_frames, frameMs) => {
    const play = playing(LONG);

    playMs(play, 9000, NORMAL, frameMs);

    expect(offTrack(play, LONG, 0, 140)).toBeLessThan(HAIR);
  });

  it("keeps its speed past eight seconds where the settings say", () => {
    const play = playing(LONG);

    playMs(play, 9000, options({ speedUp: false }));

    expect(offTrack(play, LONG, 0, 126)).toBeLessThan(HAIR);
  });

  it("plays a 70-second flight for as long, frame by frame", () => {
    const play = playing(LONG);
    const still = options({ speedUp: false, motion: false });
    playFor(
      { tick: (ms: number, frame: PlayOptions) => play.advance(ms, frame) },
      LONG_MS - 100,
      still,
    );
    const flying = play.phase;

    const landed = play.advance(200, still);

    expect([flying, landed.settled]).toEqual(["flying", LONG.round]);
  });

  it("speeds a 70-second flight up to land in 39 seconds", () => {
    const play = playing(LONG);

    const ms = playUntilSettled(play, options({ motion: false }), 50);

    const sped = 8000 + ((LONG.round.flight.length - 112) / 28) * 1000;
    expect(ms).toBe(Math.ceil(sped / 50) * 50);
  });

  it.each([30, 60, 144])(
    "reaches the same events in a second at %i frames a second",
    (rate) => {
      const play = playing(triple);

      playMs(play, 1000, NORMAL, 1000 / rate);

      expect(loggedEvents(play)).toEqual(
        triple.round.flight.events.filter(({ at }) => at <= 14),
      );
    },
  );

  it.each([30, 60, 144])(
    "has its fuzzballs where their tracks have them a second in at %i frames a second",
    (rate) => {
      const play = playing(triple);

      playMs(play, 1000, NORMAL, 1000 / rate);

      expect(offTracks(play, triple, 14)).toBeLessThan(HAIR);
    },
  );

  it("hands on the events reached, and no more", () => {
    const play = playing(plain);

    playOnBy(play, 6);

    expect(loggedEvents(play)).toEqual(
      plain.round.flight.events.filter(({ at }) => at <= 6),
    );
  });

  it("hands on every event once, in order, as the flight lands", () => {
    const play = playing(triple);

    playUntilSettled(play);

    expect(loggedEvents(play)).toEqual(triple.round.flight.events);
  });

  it("says what each event calls for, read in the flight's order", () => {
    const play = playing(plain);

    playUntilSettled(play);

    expect(loggedSounds(play)).toEqual([
      "release",
      "knock",
      null,
      "strike",
      "land",
    ]);
  });

  it("sounds a boon's release for a round that starts with one", () => {
    const play = playing(hotShot);

    play.advance(FRAME_MS, NORMAL);

    expect(loggedSounds(play)).toEqual(["boon"]);
  });

  it.each([
    [
      "a boon's release for a later round that starts with one",
      plain,
      hotShot,
      "boon",
    ],
    [
      "a plain release for a round after one that started with a boon",
      hotShot,
      plain,
      "release",
    ],
  ])("sounds %s", (_name, first, second, sound) => {
    const play = playing(first);
    playUntilSettled(play);
    const since = play.view.events.latest;
    play.aim(second.start);
    play.release(second.round);

    play.advance(FRAME_MS, NORMAL);

    expect(loggedSounds(play, since)).toEqual([sound]);
  });

  it.each<[string, Partial<FlightPace>, boolean, number]>([
    [
      "7 units a second",
      { unitsPerSecond: { normal: 7, fast: 11 } },
      false,
      1.4,
    ],
    ["fast-forward twice as fast", { fastForward: 2 }, true, 5.6],
    ["sped up after 0.1 s", { longFlightMs: 100 }, false, 4.2],
    [
      "sped up 3 times after 0.1 s",
      { longFlightMs: 100, longFlightSpeedUp: 3 },
      false,
      5.6,
    ],
  ])("plays at the pace it is handed, %s", (_name, tuned, fast, units) => {
    const play = playing(LONG);
    const pace = { ...FLIGHT_PACE, ...tuned };

    playMs(play, 200, options({ pace, fast }));

    expect(offTrack(play, LONG, 0, units)).toBeLessThan(HAIR);
  });

  it("plays on past the last landing to the moment a zap ripples on to", () => {
    const play = playing(RIPPLING);

    playOnBy(play, RIPPLED_AT - 0.25);

    expect([play.phase, play.view.balls]).toEqual(["flying", []]);
  });

  it("hands on the events that ripple on past the last landing", () => {
    const play = playing(RIPPLING);

    playUntilLanded(play);

    expect(loggedEvents(play)).toEqual(RIPPLING.round.flight.events);
  });

  it("hands on a friend freed past the last landing", () => {
    const play = playing(RIPPLING);

    const change = playUntilLanded(play);

    expect(change.freed).toEqual([3]);
  });

  it("skips to the end of a zap that ripples on past the last landing", () => {
    const play = playing(RIPPLING);
    play.skip();

    play.advance(FRAME_MS, NORMAL);

    expect(loggedEvents(play)).toEqual(RIPPLING.round.flight.events);
  });

  it.each([0, -FRAME_MS, Number.NaN])(
    "plays no time for a frame of %d ms",
    (ms) => {
      const play = playing(plain);

      play.advance(ms, NORMAL);

      expect(placeIn(play, 0)).toEqual({ x: 4.5, y: RADIUS });
    },
  );

  it.each([
    [1, [0, 1]],
    [6.2, [0, 1, 2]],
    [13, [1, 2]],
  ])("puts in the air at %f units the fuzzballs %j", (units, balls) => {
    const play = playing(triple);

    playOnBy(play, units);

    expect(play.view.balls.map(({ ball }) => ball)).toEqual(balls);
  });

  it.each([1, 3, 6.2, 6.5, 9, 12.5])(
    "places each fuzzball where its track has it at %f units",
    (units) => {
      const play = playing(triple);
      playOnBy(play, units / 2);

      playOnBy(play, units / 2);

      expect(offTracks(play, triple, units)).toBeLessThan(HAIR);
    },
  );

  it.each([
    [2.75, { x: 2, y: 3 }],
    [3.75, { x: 2, y: 2 }],
  ])(
    "places a fuzzball through a portal at its far side from the moment it passes, at %f units",
    (units, place) => {
      const portal = flownAlong([
        { at: 0, x: 4.5, y: RADIUS },
        { at: 2.75, x: 4.5, y: 3 },
        { at: 2.75, x: 2, y: 3 },
        { at: 5.5, x: 2, y: RADIUS },
      ]);
      const play = playing(portal);

      playOnBy(play, units);

      expect(offPlace(play, 0, place)).toBeLessThan(HAIR);
    },
  );

  it("carries a fuzzball's charge, and whether it is a hot shot", () => {
    const play = playing(hotShot);

    playOnBy(play, 1);

    expect(ballOf(play, 0)).toMatchObject({ charge: 5, hot: true });
  });

  it("carries the charge a strike leaves a fuzzball", () => {
    const play = playing(friend);
    playOnBy(play, 1);
    const launched = ballOf(play, 0)?.charge;

    playOnBy(play, 7);

    expect([launched, ballOf(play, 0)?.charge]).toEqual([1, 0]);
  });

  it("charges a fuzzball to the most as a wool brick recharges it", () => {
    const play = playing(
      withEvents(plain, [{ at: 6.5, kind: "recharge", ball: 0, cell: 8 }]),
    );

    playOnBy(play, 7);

    expect(ballOf(play, 0)?.charge).toBe(5);
  });

  it("names each fuzzball's role", () => {
    const play = playing(triple);

    playOnBy(play, 2);

    expect(play.view.balls.map(({ role }) => role)).toEqual([
      "player",
      "mate",
      "mate",
    ]);
  });

  it.each([
    [6, null],
    [13, friend.round.next.x],
  ])(
    "has the player's fuzzball wait, at %f units, at %s",
    (units, waitingX) => {
      const play = playing(friend);

      playOnBy(play, units);

      expect(play.waitingX).toBe(waitingX);
    },
  );

  it.each<BallRole>(["mate", "friend", "split"])(
    "keeps the player's fuzzball in the air while a %s lands first",
    (role) => {
      const play = playing(landingFirst(role));

      playOnBy(play, 5);

      expect(play.waitingX).toBeNull();
    },
  );

  it("hands on the friends a frame frees", () => {
    const play = playing(
      withEvents(plain, [
        { at: 6.5, kind: "free", cell: 8, ink: 3 },
        { at: 6.6, kind: "free", cell: 9, ink: 5 },
      ]),
    );

    const change = play.advance(500, NORMAL);

    expect(change.freed).toEqual([3, 5]);
  });

  it("hands on no friends the frame after", () => {
    const play = playing(
      withEvents(plain, [{ at: 6.5, kind: "free", cell: 8, ink: 3 }]),
    );
    play.advance(500, NORMAL);

    const change = play.advance(FRAME_MS, NORMAL);

    expect(change.freed).toEqual([]);
  });

  it("hands each frame the same view", () => {
    const play = playing(plain);
    const { view } = play;

    play.advance(FRAME_MS, NORMAL);

    expect(play.view).toBe(view);
  });

  it("hands each frame the same change", () => {
    const play = playing(plain);
    const change = play.advance(FRAME_MS, NORMAL);

    const next = play.advance(FRAME_MS, NORMAL);

    expect(next).toBe(change);
  });
});

describe("RoundPlay's wall", () => {
  it("shows the wall the round starts with until its flight reaches a brick", () => {
    const play = playing(plain);

    playOnBy(play, 6);

    expect(play.view.wall.bricks).toEqual(plain.start.wall.bricks);
  });

  it("hands over another wall as a frame changes a brick", () => {
    const play = playing(plain);
    playOnBy(play, 6);
    const before = play.view.wall;

    playOnBy(play, 1);

    expect(play.view.wall).not.toBe(before);
  });

  it("hands over the same wall for a frame that changes no brick", () => {
    const play = playing(plain);
    playOnBy(play, 7);
    const before = play.view.wall;

    playOnBy(play, 0.5);

    expect(play.view.wall).toBe(before);
  });

  it("hands over another wall as a later frame changes one", () => {
    const play = playing(BREAKING_ON);
    playOnBy(play, 7);
    playOnBy(play, 1);
    const broken = play.view.wall;

    playOnBy(play, 1);

    expect(play.view.wall).not.toBe(broken);
  });

  it("hands over another wall for a frame that changes two bricks", () => {
    const play = playing(BREAKING_ON);
    playOnBy(play, 7);
    const struck = play.view.wall;

    playOnBy(play, 2);

    expect(play.view.wall).not.toBe(struck);
  });

  it("keeps each change to the wall as later frames change it", () => {
    const play = playing(BREAKING_ON);
    playOnBy(play, 7);
    playOnBy(play, 1);

    playOnBy(play, 1);

    const { bricks } = play.view.wall;
    expect([bricks[8]?.hits, bricks[36], bricks[37]]).toEqual([1, null, null]);
  });

  it("stands the wall still while the flight plays", () => {
    const play = playing(plain);

    playOnBy(play, 7);

    expect(play.view.wallDrop).toBe(1);
  });

  it("wears a struck brick to the hits the strike leaves it", () => {
    const play = playing(plain);

    playOnBy(play, 7);

    expect(play.view.wall.bricks[8]?.hits).toBe(1);
  });

  it("takes a broken brick away as it breaks", () => {
    const play = playing(punch);

    playOnBy(play, 6.5);

    expect(play.view.wall.bricks[8]).toBeNull();
  });

  it("takes a zap's hits off each brick it reaches as it lands", () => {
    const play = playing(columnZap);
    playOnBy(play, 6.5);
    const before = play.view.wall.bricks[53]?.hits;

    playOnBy(play, 0.5);

    expect([before, play.view.wall.bricks[53]?.hits]).toEqual([3, 1]);
  });

  it("leaves a cell empty that a strike or a zap reaches after its brick broke", () => {
    const play = playing(
      withEvents(punch, [
        {
          at: 6.5,
          kind: "strike",
          ball: 0,
          cell: 8,
          took: 1,
          left: 1,
          charge: 0,
          earthed: false,
        },
        { at: 6.6, kind: "zap", cell: 17, pattern: "row", reaches: [8, 4] },
      ]),
    );

    playOnBy(play, 7);

    expect([play.view.wall.bricks[8], play.view.wall.bricks[4]]).toEqual([
      null,
      null,
    ]);
  });

  it.each(
    Object.entries(FLIGHT_FIXTURES).filter(
      ([name, { round }]) => name !== "hotShot" && round.outcome.rowsDown > 0,
    ),
  )(
    "leaves the wall as its round does as its flight ends: %s",
    (_name, fixture) => {
      const play = playing(fixture);

      playOnBy(play, fixture.round.flight.length - HAIR);

      expect(play.view.wall.bricks).toEqual(fixture.round.next.wall.bricks);
    },
  );

  it("hands over the wall the round leaves as its flight ends, to come down to from where it stood", () => {
    const play = playing(hotShot);

    playUntilLanded(play);

    expect({
      wall: play.view.wall,
      wallDrop: play.view.wallDrop,
      rowsDown: play.view.rowsDown,
    }).toEqual({
      wall: hotShot.round.next.wall,
      wallDrop: 0,
      rowsDown: hotShot.round.outcome.rowsDown,
    });
  });

  it("stands the wall the round leaves still once it comes to rest", () => {
    const play = playing(hotShot);

    playUntilSettled(play);

    expect({
      wall: play.view.wall,
      wallDrop: play.view.wallDrop,
      rowsDown: play.view.rowsDown,
    }).toEqual({ wall: hotShot.round.next.wall, wallDrop: 1, rowsDown: 0 });
  });

  it("shows the wall's rows and its place as the round starts while it flies", () => {
    const play = playing(plain);

    playOnBy(play, 7);

    const { rows, lowestRow } = play.view.wall;
    expect({ rows, lowestRow }).toEqual({
      rows: plain.start.wall.rows,
      lowestRow: plain.start.wall.lowestRow,
    });
  });

  it("leaves the wall the round started with as it was", () => {
    const play = playing(plain);

    playUntilSettled(play);

    expect(plain.start.wall.bricks[8]?.hits).toBe(2);
  });

  it("starts each round from its own wall", () => {
    const play = playing(plain);
    playUntilSettled(play);
    play.aim(punch.start);

    play.release(punch.round);
    playOnBy(play, 1);

    expect(play.view.wall.bricks).toEqual(punch.start.wall.bricks);
  });
});

describe("RoundPlay's skip", () => {
  it("lands the flight at the next frame played", () => {
    const play = playing(triple);
    playOnBy(play, 1);

    play.skip();
    play.advance(FRAME_MS, NORMAL);

    expect({
      phase: play.phase,
      events: loggedEvents(play),
      balls: play.view.balls,
    }).toEqual({
      phase: "settling",
      events: triple.round.flight.events,
      balls: [],
    });
  });

  it("hands on the events it skips with no flourish and the last landing's sound alone", () => {
    const play = playing(triple);
    playOnBy(play, 1);
    const reached = play.view.events.latest;

    play.skip();
    play.advance(FRAME_MS, NORMAL);

    const skipped: (string | null)[] = [];
    play.view.events.forEachSince(reached, ({ effects }) => {
      skipped.push(effects.sound, ...effects.flourishes);
    });
    expect(skipped).toEqual([
      ...Array.from(
        { length: triple.round.flight.events.length - reached - 1 },
        () => null,
      ),
      "land",
    ]);
  });

  it("leaves the wall as the flight would", () => {
    const play = playing(zap);

    play.skip();
    play.advance(FRAME_MS, NORMAL);

    expect(play.view.wall.bricks).toEqual(zap.round.next.wall.bricks);
  });

  it("waits out a pause", () => {
    const play = playing(plain);

    play.skip();
    play.advance(FRAME_MS, options({ paused: true }));

    expect([play.phase, play.view.events.latest]).toEqual(["flying", 0]);
  });

  it("does nothing while a round is aimed", () => {
    const play = new RoundPlay(plain.start);
    play.skip();
    play.release(plain.round);

    play.advance(FRAME_MS, NORMAL);

    expect(play.phase).toBe("flying");
  });
});

describe("RoundPlay's pause", () => {
  it("stops the flight where it is, handing on nothing", () => {
    const play = playing(plain);
    playMs(play, 300);
    const place = placeIn(play, 0);
    const latest = play.view.events.latest;

    playMs(play, 1000, options({ paused: true }));

    expect([placeIn(play, 0), play.view.events.latest]).toEqual([
      place,
      latest,
    ]);
  });

  it("goes on from where it stopped", () => {
    const play = playing(plain);
    playMs(play, 300);
    playMs(play, 1000, options({ paused: true }));

    playMs(play, 200);

    expect(offTrack(play, plain, 0, 7)).toBeLessThan(HAIR);
  });

  it("stops the count to a long flight's speeding up", () => {
    const play = playing(LONG);
    playMs(play, 7000);
    playMs(play, 5000, options({ paused: true }));

    playMs(play, 2000);

    expect(offTrack(play, LONG, 0, 140)).toBeLessThan(HAIR);
  });

  it("stops the wall as it steps", () => {
    const play = playing(plain);
    playOnBy(play, 13);
    play.advance(100, NORMAL);
    const drop = play.view.wallDrop;

    play.advance(100, options({ paused: true }));

    expect(play.view.wallDrop).toBe(drop);
  });
});

describe("RoundPlay's settling", () => {
  it.each([
    ["steps the wall down a row", plain, STEP_MS, 1],
    ["jumps the wall", zap, JUMP_MS, 3],
  ])("%s through its ease", (_name, fixture, ms, rowsDown) => {
    const play = playing(fixture);
    playOnBy(play, 20);

    play.advance(ms / 2, NORMAL);

    expect([play.view.wallDrop, play.view.rowsDown]).toEqual([
      easeOutCubic(0.5),
      rowsDown,
    ]);
  });

  it.each([
    ["a step", plain, STEP_MS],
    ["a jump", zap, JUMP_MS],
  ])(
    "brings the wall to rest at the end of %s, and says so",
    (_name, fixture, ms) => {
      const play = playing(fixture);
      playOnBy(play, 20);
      play.advance(ms - 1, NORMAL);

      const change = play.advance(1, NORMAL);

      expect([change.settled, play.view.wall]).toEqual([
        fixture.round,
        fixture.round.next.wall,
      ]);
    },
  );

  it("says the wall came to rest once", () => {
    const play = playing(plain);
    playUntilSettled(play);

    const change = play.advance(FRAME_MS, NORMAL);

    expect(change).toEqual({ freed: [], settled: null, opens: null });
  });

  it("steps the wall at once where motion is unwelcome", () => {
    const play = playing(plain);
    playOnBy(play, 12);

    const change = play.advance(FRAME_MS * 10, options({ motion: false }));

    expect([change.settled, play.view.wall]).toEqual([
      plain.round,
      plain.round.next.wall,
    ]);
  });

  it("leaves a cleared level's wall where it stands", () => {
    const play = playing(FLIGHT_FIXTURES.cleared);
    playOnBy(play, 12);

    const change = play.advance(FRAME_MS * 10, NORMAL);

    expect([change.settled, play.view.rowsDown]).toEqual([
      FLIGHT_FIXTURES.cleared.round,
      0,
    ]);
  });

  it.each<[string, FlightFixture, Beat[]]>([
    ["a step", plain, ["step"]],
    ["a jump", zap, ["jump"]],
    ["a level cleared", FLIGHT_FIXTURES.cleared, ["cleared"]],
    ["a level lost", FLIGHT_FIXTURES.lost, ["step", "lost"]],
    [
      "a level lost with bricks over the danger line too",
      endingOn(FLIGHT_FIXTURES.lost, ["ooo......", "ooo......"], 0),
      ["step", "lost"],
    ],
    [
      "a brick come over the danger line",
      endingOn(plain, ["........2", "o........"], 1),
      ["step", "danger"],
    ],
    [
      "steel over the danger line, which no level needs",
      endingOn(plain, ["#........"], 1),
      ["step"],
    ],
    [
      "a brick two rows over the floor's",
      endingOn(plain, ["o........"], 2),
      ["step"],
    ],
  ])("sounds the beats of %s", (_name, fixture, beats) => {
    const play = playing(fixture);

    playUntilSettled(play);

    expect(loggedBeats(play)).toEqual(beats);
  });

  it("sounds the step as the flight lands, before the wall moves", () => {
    const play = playing(plain);
    playOnBy(play, 12);

    play.advance(FRAME_MS * 4, NORMAL);

    expect([loggedBeats(play), play.view.wallDrop]).toEqual([["step"], 0]);
  });

  it("aims the next round from where it starts", () => {
    const play = playing(plain);
    playUntilSettled(play);

    play.aim(plain.round.next);

    expect({
      phase: play.phase,
      round: play.round,
      waitingX: play.waitingX,
      wall: play.view.wall,
      wallDrop: play.view.wallDrop,
      rowsDown: play.view.rowsDown,
    }).toEqual({
      phase: "aiming",
      round: null,
      waitingX: plain.round.next.x,
      wall: plain.round.next.wall,
      wallDrop: 1,
      rowsDown: 0,
    });
  });
});

describe("RoundPlay's card", () => {
  it.each([
    ["cleared, with motion", FLIGHT_FIXTURES.cleared, true, 700, "cleared"],
    ["cleared, without", FLIGHT_FIXTURES.cleared, false, FRAME_MS, "cleared"],
    ["lost, with motion", FLIGHT_FIXTURES.lost, true, 800, "result"],
    ["lost, without", FLIGHT_FIXTURES.lost, false, 500, "result"],
  ])(
    "opens the card over a level %s once its wait runs out",
    (_name, fixture, motion, ms, card) => {
      const play = playing(fixture);
      playUntilSettled(play, options({ motion }));

      const opened = playUntilOpens(play, options({ motion }));

      expect(opened).toEqual({ ms, card });
    },
  );

  it("opens the card once", () => {
    const play = playing(FLIGHT_FIXTURES.lost);
    playUntilSettled(play);
    playUntilOpens(play, NORMAL);

    const change = playMs(play, 5000);

    expect(change.opens).toBeNull();
  });

  it("doesn't open for a round that leaves the level on", () => {
    const play = playing(plain);
    playUntilSettled(play);

    expect(opensWithin(play, 5000)).toBeNull();
  });

  it("forgets its wait as another round is aimed", () => {
    const play = playingAfter(FLIGHT_FIXTURES.cleared, plain);

    playUntilSettled(play);

    expect(opensWithin(play, 5000)).toBeNull();
  });

  it("waits out a pause", () => {
    const play = playing(FLIGHT_FIXTURES.lost);
    playUntilSettled(play);
    playMs(play, 5000, options({ paused: true }));

    const opened = playUntilOpens(play, NORMAL);

    expect(opened.ms).toBe(800);
  });
});

describe("RoundPlay's next round", () => {
  it("hands on the next round's events", () => {
    const play = playing(punch);
    playUntilSettled(play);
    const reached = play.view.events.latest;
    play.aim(plain.start);
    play.release(plain.round);

    playUntilSettled(play);

    const events: FlightEvent[] = [];
    play.view.events.forEachSince(reached, ({ event }) => events.push(event));
    expect(events).toEqual(plain.round.flight.events);
  });

  it("puts the next round's fuzzballs in the air", () => {
    const play = playingAfter(triple, friend);

    playOnBy(play, 1);

    expect(play.view.balls.map(({ ball }) => ball)).toEqual([0, 1]);
  });

  it("places the next round's fuzzballs where their tracks have them", () => {
    const play = playingAfter(triple, friend);

    playOnBy(play, 1);

    expect(offTracks(play, friend, 1)).toBeLessThan(HAIR);
  });

  it("has the player's fuzzball in the air again", () => {
    const play = playingAfter(plain, punch);

    playOnBy(play, 1);

    expect(play.waitingX).toBeNull();
  });

  it("counts the next round's eight seconds afresh", () => {
    const play = playing(LONG);
    playMs(play, 9000);
    play.aim(LONG.start);
    play.release(LONG.round);

    playMs(play, 100);

    expect(offTrack(play, LONG, 0, 1.4)).toBeLessThan(HAIR);
  });

  it("eases the next round's wall from where it stands", () => {
    const play = playingAfter(punch, plain);
    playOnBy(play, 20);

    play.advance(STEP_MS / 2, NORMAL);

    expect(play.view.wallDrop).toBe(easeOutCubic(0.5));
  });

  it("brings the next round's wall to rest", () => {
    const play = playingAfter(punch, plain);
    playOnBy(play, 20);

    const change = play.advance(STEP_MS, NORMAL);

    expect(change.settled).toBe(plain.round);
  });

  it("leaves the next round's wall as its round does as its flight ends", () => {
    const play = playingAfter(punch, plain);

    playOnBy(play, plain.round.flight.length - HAIR);

    expect(play.view.wall.bricks).toEqual(plain.round.next.wall.bricks);
  });

  it("ends the next round's flight at its own end, after a longer one", () => {
    const play = playingAfter(LONG, plain);

    playOnBy(play, 20);

    expect(play.phase).toBe("settling");
  });

  it("forgets a skip as another round is aimed", () => {
    const play = playing(plain);
    play.skip();
    play.aim(plain.start);
    play.release(plain.round);

    play.advance(FRAME_MS, NORMAL);

    expect(play.phase).toBe("flying");
  });

  it("forgets a skipped flight's skip once another round is aimed", () => {
    const play = playing(plain);
    play.skip();
    playUntilSettled(play);
    play.aim(plain.start);
    play.release(plain.round);

    play.advance(FRAME_MS, NORMAL);

    expect(play.phase).toBe("flying");
  });

  it("forgets the fuzzballs in the air as another round is aimed", () => {
    const play = playing(triple);
    playOnBy(play, 2);

    play.aim(plain.start);

    expect(play.view.balls).toEqual([]);
  });
});
