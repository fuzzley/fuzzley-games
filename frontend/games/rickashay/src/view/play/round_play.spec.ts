import { AIMS } from "@fz/brick-wall/rules/aims";
import { RADIUS } from "@fz/brick-wall/rules/field";
import { positionAt } from "@fz/brick-wall/rules/track";
import { easeOutCubic } from "@fz/core/math";
import {
  CLEARED_MS,
  JUMP_MS,
  LOST_MS,
  LOST_STILL_MS,
  STEP_MS,
} from "@fz/brick-wall/view/timing";
import type { FlightEvent, FlightEventKind } from "../../rules/flight/events";
import { BOUNCE_POINTS, FLIGHT_RULES, JUMP_POINTS } from "../../rules/tuning";
import {
  FLIGHT_FIXTURES,
  type FixtureName,
  type FlightFixture,
} from "../../testing/flight_fixtures";
import type { Beat, Card, RoundNews } from "../run_state";
import { flightEffects } from "../effects/effects";
import type { SoundName } from "../effects/sounds";
import { FLIGHT_PACE } from "./pace";
import { type PlayOptions, RoundPlay } from "./round_play";

const {
  plain,
  cleared,
  lost,
  jumped,
  shielded,
  rally,
  spring,
  hot,
  bolt,
  hatch,
  teleport,
  bored,
  guard,
} = FLIGHT_FIXTURES;

/** Every fixture's name. */
const FIXTURES = Object.keys(FLIGHT_FIXTURES) as FixtureName[];

/** The rally mark of the levels these specs play, past every hand-made flight's rally. */
const MARK = 20;

/** A frame's time in these specs, which adds up to whole milliseconds exactly. */
const FRAME_MS = 10;

/** A frame at Normal, not fast-forwarded, motion welcome and the run under way. */
const NORMAL: PlayOptions = {
  pace: FLIGHT_PACE,
  speed: "normal",
  fast: false,
  motion: true,
  paused: false,
};

/** Returns a frame as {@link NORMAL}, changed as given. */
function options(changes: Partial<PlayOptions>): PlayOptions {
  return { ...NORMAL, ...changes };
}

/** Returns a level's play, a fixture's round aimed. */
function aimed(fixture: FlightFixture): RoundPlay {
  return new RoundPlay(fixture.start, FLIGHT_RULES);
}

/** Returns a level's play, a fixture's round released. */
function playing(fixture: FlightFixture): RoundPlay {
  const play = aimed(fixture);
  play.release(fixture.round, MARK);
  return play;
}

/** Returns a fixture's flight's event of a kind: its first, or the one after as many as given. */
function eventOf(
  fixture: FlightFixture,
  kind: FlightEventKind,
  nth = 0,
): FlightEvent {
  const event = fixture.round.flight.events.filter(
    (each) => each.kind === kind,
  )[nth];
  if (event === undefined) throw new Error(`No ${kind} ${String(nth)}.`);
  return event;
}

/** Returns the events a level's play has handed on, in order. */
function loggedEvents(play: RoundPlay): FlightEvent[] {
  const events: FlightEvent[] = [];
  play.view.events.forEachSince(0, ({ event }) => events.push(event));
  return events;
}

/** Returns the sounds of the events a level's play has handed on, in order, each event's as a list. */
function loggedSounds(play: RoundPlay): SoundName[][] {
  const sounds: SoundName[][] = [];
  play.view.events.forEachSince(0, ({ effects }) =>
    sounds.push(effects.sounds.map(({ sound }) => sound)),
  );
  return sounds;
}

/** Returns the beats a level's play has handed on, in order. */
function loggedBeats(play: RoundPlay): Beat[] {
  const beats: Beat[] = [];
  play.view.beats.forEachSince(0, ({ beat }) => beats.push(beat));
  return beats;
}

/** Plays frames until a level's play has handed on an event of its flight, and returns the last frame's news. */
function playUntilReached(
  play: RoundPlay,
  event: FlightEvent,
  frame: PlayOptions = NORMAL,
): RoundNews[] {
  for (let played = 0; played < 600_000; played += FRAME_MS) {
    const { news } = play.advance(FRAME_MS, frame);
    if (loggedEvents(play).includes(event)) return [...news];
  }
  throw new Error("The event was never reached.");
}

/** Plays frames until the round's flight ends, and returns the last frame's news. */
function playUntilLanded(
  play: RoundPlay,
  frame: PlayOptions = NORMAL,
): RoundNews[] {
  for (let played = 0; played < 600_000; played += FRAME_MS) {
    const { news } = play.advance(FRAME_MS, frame);
    if (play.phase !== "flying") return [...news];
  }
  throw new Error("The flight never ended.");
}

/** Plays frames until the round has ended, its wall come to rest, and returns how long that took. */
function playUntilEnded(play: RoundPlay, frame: PlayOptions = NORMAL): number {
  for (let played = FRAME_MS; played < 600_000; played += FRAME_MS) {
    const { news } = play.advance(FRAME_MS, frame);
    if (news.some(({ kind }) => kind === "ended")) return played;
  }
  throw new Error("The round never ended.");
}

/** Plays frames from a round's end until a card's wait runs out, and returns how long that took and the card. */
function playUntilOpens(
  play: RoundPlay,
  frame: PlayOptions = NORMAL,
): { ms: number; card: Card } {
  for (let played = FRAME_MS; played < 10_000; played += FRAME_MS) {
    const { opens } = play.advance(FRAME_MS, frame);
    if (opens !== null) return { ms: played, card: opens };
  }
  throw new Error("No card opened.");
}

/** Plays frames for a while, and returns the first card whose wait runs out in them, or null for none. */
function opensWithin(play: RoundPlay, ms: number): Card | null {
  for (let played = 0; played < ms; played += FRAME_MS) {
    const { opens } = play.advance(FRAME_MS, NORMAL);
    if (opens !== null) return opens;
  }
  return null;
}

/**
 * Returns how far the fuzzball is from where its fixture's track has it at
 * a moment, in field units, as the rules' `positionAt()` says.
 */
function offTrack(play: RoundPlay, fixture: FlightFixture, at: number): number {
  const place = positionAt(fixture.round.flight.track, at);
  if (place === null) throw new Error(`Nowhere at ${String(at)}.`);
  const { x, y } = play.view.ball;
  return Math.hypot(x - place.x, y - place.y);
}

/** How near a place the fuzzball must be to be there, in field units: a hair. */
const HAIR = 1e-9;

/** The rally fixture's flight: its strike at the 10th mark, and its last. */
const RALLY_MARK = rally.round.flight.marks[0] ?? Number.NaN;
const RALLY_LAST = rally.round.flight.lastStrike ?? Number.NaN;

/** How long the rally fixture's flight takes at Normal to reach its 10th strike, and its last, in milliseconds. */
const TO_10TH_MS = (RALLY_MARK / 14) * 1000;
const TO_LAST_MS = TO_10TH_MS + ((RALLY_LAST - RALLY_MARK) / 17) * 1000;

describe("RoundPlay, aimed", () => {
  it("aims a level's first round, the fuzzball waiting where it starts", () => {
    const play = aimed(plain);

    expect([play.phase, play.round, play.view.wall, play.view.ball]).toEqual([
      "aiming",
      null,
      plain.start.wall,
      {
        x: plain.start.x,
        y: RADIUS,
        dx: 0,
        dy: 0,
        rally: 0,
        fur: 0,
        hot: false,
        home: false,
      },
    ]);
  });

  it("shows the hatches' every hold and no bolt drawn", () => {
    const play = aimed(hatch);

    expect([play.view.holdsLeft, play.view.boltsDrawn]).toEqual([3, 0]);
  });

  it("holds a hot shot's own floor bounce, red-hot, before it leaves", () => {
    const play = aimed(hot);

    expect([play.view.held, play.soFar.held, play.view.ball.hot]).toEqual([
      1,
      1,
      true,
    ]);
  });

  it("plays nothing while a round is aimed", () => {
    const play = aimed(plain);

    const { news, opens } = play.advance(1000, NORMAL);

    expect([play.phase, play.view.ball.x, news, opens]).toEqual([
      "aiming",
      plain.start.x,
      [],
      null,
    ]);
  });
});

describe("RoundPlay, released", () => {
  it("flies the round released", () => {
    const play = playing(plain);

    expect([play.phase, play.round]).toEqual(["flying", plain.round]);
  });

  it("ignores a round released while another is in play", () => {
    const play = playing(plain);
    play.advance(100, NORMAL);

    play.release(rally.round, MARK);
    play.advance(100, NORMAL);

    expect([play.round, offTrack(play, plain, 2.8)]).toEqual([
      plain.round,
      expect.closeTo(0, 9),
    ]);
  });

  it.each(["plain", "bored", "teleport"] as const)(
    "sends the %s fuzzball off along its shot's aim",
    (name) => {
      const { shot } = FLIGHT_FIXTURES[name];

      const play = playing(FLIGHT_FIXTURES[name]);

      const [dx, dy] = AIMS[shot.aim] ?? [];
      expect([play.view.ball.dx, play.view.ball.dy]).toEqual([
        expect.closeTo(dx ?? Number.NaN, 9),
        expect.closeTo(dy ?? Number.NaN, 9),
      ]);
    },
  );

  it("leaves with none of the last flight's rally, turns or points", () => {
    const play = playing(rally);
    playUntilEnded(play);
    play.aim(rally.round.next);

    play.release(plain.round, MARK);

    expect(play.soFar).toEqual({ rally: 0, held: 0, turns: 0, points: 0 });
  });
});

describe("RoundPlay's pace", () => {
  it("flies 14 units a second at Normal", () => {
    const play = playing(rally);

    play.advance(500, NORMAL);

    expect(offTrack(play, rally, 7)).toBeLessThan(HAIR);
  });

  it("flies 22 units a second at Fast", () => {
    const play = playing(rally);

    play.advance(500, options({ speed: "fast" }));

    expect(offTrack(play, rally, 11)).toBeLessThan(HAIR);
  });

  it("quickens to 17 units a second from the 10th strike", () => {
    const play = playing(rally);

    play.advance(TO_10TH_MS + 100, NORMAL);

    expect(offTrack(play, rally, RALLY_MARK + 1.7)).toBeLessThan(HAIR);
  });

  it("dashes home at three times the speed from the last strike", () => {
    const play = playing(rally);

    play.advance(TO_LAST_MS + 50, NORMAL);

    expect(offTrack(play, rally, RALLY_LAST + 2.55)).toBeLessThan(HAIR);
  });

  it.each([
    ["normal", 14],
    ["fast", 22],
  ] as const)(
    "flies four times as fast at %s, fast-forwarded",
    (speed, unitsPerSecond) => {
      const play = playing(rally);

      play.advance(100, options({ speed, fast: true }));

      expect(offTrack(play, rally, 0.4 * unitsPerSecond)).toBeLessThan(HAIR);
    },
  );

  it("goes on at the speed a setting changes to mid-flight", () => {
    const play = playing(rally);
    play.advance(500, NORMAL);

    play.advance(100, options({ speed: "fast" }));

    expect(offTrack(play, rally, 7 + 2.2)).toBeLessThan(HAIR);
  });

  it("plays the next flight at its own pace", () => {
    const play = playing(plain);
    playUntilEnded(play);
    play.aim(plain.round.next);
    play.release(rally.round, MARK);

    play.advance(TO_LAST_MS + 50, NORMAL);

    expect(offTrack(play, rally, RALLY_LAST + 2.55)).toBeLessThan(HAIR);
  });

  it.each([60, 144, 7])(
    "reaches the same place at %i frames a second",
    (rate) => {
      const play = playing(rally);

      for (let played = 0; played < 2000 - 1e-9; played += 1000 / rate) {
        play.advance(Math.min(1000 / rate, 2000 - played), NORMAL);
      }

      const at = RALLY_MARK + ((2000 - TO_10TH_MS) / 1000) * 17;
      expect(offTrack(play, rally, at)).toBeLessThan(1e-6);
    },
  );

  it.each([0, -50, Number.NaN])("plays no time for a frame of %d ms", (ms) => {
    const play = playing(plain);

    play.advance(ms, NORMAL);

    expect([play.view.ball.x, play.view.ball.y]).toEqual([
      plain.start.x,
      RADIUS,
    ]);
  });

  it("stops everything where it is while the run is paused", () => {
    const play = playing(rally);
    play.advance(500, NORMAL);

    play.advance(500, options({ paused: true }));

    expect([play.phase, offTrack(play, rally, 7)]).toEqual([
      "flying",
      expect.closeTo(0, 9),
    ]);
  });
});

describe("What RoundPlay's flight does to the fuzzball", () => {
  it("turns it to each turn's heading", () => {
    const play = playing(plain);

    playUntilReached(play, eventOf(plain, "turn"));

    expect([play.view.ball.dx, play.view.ball.dy]).toEqual([
      -Math.SQRT1_2,
      expect.closeTo(Math.SQRT1_2, 9),
    ]);
  });

  it("counts its rally at each strike", () => {
    const play = playing(rally);

    playUntilReached(play, eventOf(rally, "strike", 4));

    expect([play.view.ball.rally, play.soFar.rally]).toEqual([5, 5]);
  });

  it.each([
    [8, 0],
    [9, 1],
  ])(
    "lifts its fur at the 10th strike: after the strike of index %i, %i",
    (nth, fur) => {
      const play = playing(rally);

      playUntilReached(play, eventOf(rally, "strike", nth));

      expect(play.view.ball.fur).toBe(fur);
    },
  );

  it.each([
    [24, 1],
    [25, 2],
    [44, 2],
    [45, 3],
  ])("lifts its fur at a rally of %i to %i", (rallyOf, fur) => {
    const first = eventOf(plain, "strike");
    const { flight } = plain.round;
    const play = aimed(plain);
    const struck = { ...first, rally: rallyOf };
    play.release(
      {
        ...plain.round,
        flight: {
          ...flight,
          events: flight.events.map((event) =>
            event === first ? struck : event,
          ),
        },
      },
      MARK,
    );

    playUntilReached(play, struck);

    expect(play.view.ball.fur).toBe(fur);
  });

  it("flies a hot shot red-hot", () => {
    const play = playing(hot);

    play.advance(500, NORMAL);

    expect(play.view.ball.hot).toBe(true);
  });

  it("sets it down at a portal's twin, flying the same way", () => {
    const play = playing(teleport);
    const { at } = eventOf(teleport, "teleport");

    play.advance((at / 14) * 1000 + 100, NORMAL);

    expect([
      offTrack(play, teleport, at + 1.4),
      play.view.ball.dx,
      play.view.ball.dy,
    ]).toEqual([
      expect.closeTo(0, 9),
      expect.closeTo(Math.SQRT1_2, 9),
      expect.closeTo(Math.SQRT1_2, 9),
    ]);
  });

  it.each([
    ["bored", bored],
    ["guard", guard],
  ] as const)(
    "brings it home, still, at a %s fuzzball's moment",
    (kind, fixture) => {
      const play = playing(fixture);

      playUntilReached(play, eventOf(fixture, kind));

      expect([
        play.phase,
        play.view.ball.dx,
        play.view.ball.dy,
        play.view.ball.home,
      ]).toEqual(["flying", 0, 0, true]);
    },
  );

  it("lands it where its flight ends, waiting there, still, its rally and fur at none", () => {
    const play = playing(rally);

    playUntilLanded(play);

    expect(play.view.ball).toEqual({
      x: rally.round.next.x,
      y: RADIUS,
      dx: 0,
      dy: 0,
      rally: 0,
      fur: 0,
      hot: false,
      home: false,
    });
  });

  it.each([
    ["bored", bored],
    ["guard", guard],
  ] as const)(
    "lands a fuzzball its %s brought home, waiting, no longer coming home",
    (_, fixture) => {
      const play = playing(fixture);

      playUntilLanded(play);

      expect(play.view.ball.home).toBe(false);
    },
  );

  it("lights the waiting fuzzball as the next shot is hot, as the wall jumps", () => {
    const play = playing(jumped);

    playUntilLanded(play);

    expect(play.view.ball.hot).toBe(true);
  });

  it("puts out a hot shot that lands, as the next isn't", () => {
    const play = playing(hot);

    playUntilLanded(play);

    expect(play.view.ball.hot).toBe(false);
  });
});

describe("What RoundPlay's flight does to the wall", () => {
  it("takes a strike's hits off its brick", () => {
    const play = playing(plain);
    const cell = 8;
    const before = plain.start.wall.bricks[cell]?.hits;

    playUntilReached(play, eventOf(plain, "strike"));

    expect([before, play.view.wall.bricks[cell]?.hits]).toEqual([2, 1]);
  });

  it("breaks the brick a strike breaks", () => {
    const play = playing(hot);

    playUntilReached(play, eventOf(hot, "strike"));

    expect(play.view.wall.bricks[8]).toBeNull();
  });

  it("leaves a brick that shields the fuzzball as it was", () => {
    const play = playing(shielded);

    playUntilReached(play, eventOf(shielded, "shielded"));

    expect(play.view.wall.bricks[8]).toEqual(shielded.start.wall.bricks[8]);
  });

  it("hands over the wall the round leaves as its flight ends", () => {
    const play = playing(plain);

    playUntilLanded(play);

    expect(play.view.wall).toBe(plain.round.next.wall);
  });
});

describe("What RoundPlay's flight does to the counts", () => {
  it("holds a floor bounce the rally earns, and spends it at the floor", () => {
    const play = playing(rally);
    playUntilReached(play, eventOf(rally, "bounce-earned"));
    const earned = play.view.held;

    playUntilReached(play, eventOf(rally, "bounce-spent"));

    expect([earned, play.view.held]).toEqual([1, 0]);
  });

  it("spends a hot shot's own floor bounce", () => {
    const play = playing(hot);

    playUntilReached(play, eventOf(hot, "bounce-spent"));

    expect([play.view.held, play.soFar.held]).toEqual([0, 0]);
  });

  it.each([
    [0, 2],
    [1, 1],
    [2, 0],
  ])("counts the hatches' holds down: after hold %i, %i", (nth, left) => {
    const play = playing(hatch);

    playUntilReached(play, eventOf(hatch, "hold", nth));

    expect(play.view.holdsLeft).toBe(left);
  });

  it("draws a bolt at the turn that draws it", () => {
    const play = playing(bolt);

    playUntilReached(play, eventOf(bolt, "bolt"));

    expect(play.view.boltsDrawn).toBe(1);
  });

  it("shuts the hatches and the locks again as the fuzzball lands", () => {
    const hatches = playing(hatch);
    const locks = playing(bolt);

    playUntilLanded(hatches);
    playUntilLanded(locks);

    expect([hatches.view.holdsLeft, locks.view.boltsDrawn]).toEqual([3, 0]);
  });

  it("shows the hatches' every hold and no bolt drawn again as a round is aimed mid-flight", () => {
    const hatches = playing(hatch);
    const locks = playing(bolt);
    playUntilReached(hatches, eventOf(hatch, "hold"));
    playUntilReached(locks, eventOf(bolt, "bolt"));

    hatches.aim(hatch.start);
    locks.aim(bolt.start);

    expect([hatches.view.holdsLeft, locks.view.boltsDrawn]).toEqual([3, 0]);
  });

  it("lets the floor bounces it still holds go as a bored fuzzball lands", () => {
    const flight = { ...bored.round.flight, held: 1 };
    const play = aimed(bored);
    play.release({ ...bored.round, flight }, MARK);
    playUntilReached(play, eventOf(bored, "bored"));
    const held = play.view.held;

    playUntilLanded(play);

    expect([held, play.view.held, play.soFar.held]).toEqual([1, 0, 0]);
  });

  it.each(FIXTURES)(
    "counts the %s flight's rally, turns and points but a jump's, once it lands",
    (name) => {
      const { flight, outcome } = FLIGHT_FIXTURES[name].round;
      const play = playing(FLIGHT_FIXTURES[name]);

      playUntilLanded(play);

      expect(play.soFar).toEqual({
        rally: flight.rally,
        held: 0,
        turns: flight.turns,
        points: outcome.points - (outcome.jumped ? JUMP_POINTS : 0),
      });
    },
  );

  it("hands on the same count of a flight while it says the same, and another as it changes", () => {
    const play = playing(plain);
    play.advance(100, NORMAL);
    const before = play.soFar;
    play.advance(100, NORMAL);
    const same = play.soFar;

    playUntilReached(play, eventOf(plain, "strike"));

    expect([same === before, play.soFar === before]).toEqual([true, false]);
  });
});

describe("RoundPlay's news", () => {
  it("says a floor bounce the rally earns, at the rally it came at, in the frame that reaches it", () => {
    const play = playing(rally);

    const news = playUntilReached(play, eventOf(rally, "bounce-earned"));

    expect(news).toEqual([
      { kind: "earned", by: "rally", rally: 10, kept: true },
    ]);
  });

  it("says a floor bounce a spring brick's break earns", () => {
    const play = playing(spring);

    const news = playUntilReached(play, eventOf(spring, "bounce-earned"));

    expect(news).toEqual([
      { kind: "earned", by: "spring", rally: 1, kept: true },
    ]);
  });

  it("says a floor bounce earned while the fuzzball holds the most, which it loses and which scores nothing", () => {
    const { flight } = rally.round;
    const full = aimed(rally);
    full.release(
      {
        ...rally.round,
        flight: {
          ...flight,
          held: 3,
          events: flight.events.map((event) => {
            if (event.kind === "bounce-earned") {
              return { ...event, held: 3, kept: false };
            }
            return event.kind === "bounce-spent"
              ? { ...event, held: 2 }
              : event;
          }),
        },
      },
      MARK,
    );

    const news = playUntilReached(full, eventOf(rally, "strike", 9));
    playUntilLanded(full);

    expect([news, full.soFar.points]).toEqual([
      [{ kind: "earned", by: "rally", rally: 10, kept: false }],
      rally.round.outcome.points - BOUNCE_POINTS,
    ]);
  });

  it("calls a flight as it reaches the level's rally mark, in the frame that reaches it", () => {
    const play = aimed(rally);
    play.release(rally.round, 5);

    const news = playUntilReached(play, eventOf(rally, "strike", 4));

    expect(news).toEqual([{ kind: "called" }]);
  });

  it("calls a flight once, as it reaches the mark and not after", () => {
    const play = aimed(rally);
    play.release(rally.round, 5);
    playUntilReached(play, eventOf(rally, "strike", 4));

    const news = playUntilLanded(play);

    expect(news).toEqual([]);
  });

  it("says the round has ended as its wall comes to rest, and nothing more", () => {
    const play = playing(plain);
    playUntilLanded(play);
    let news: RoundNews[] = [];

    for (let played = 0; played < 1000; played += FRAME_MS) {
      news = [...news, ...play.advance(FRAME_MS, NORMAL).news];
    }

    expect(news).toEqual([{ kind: "ended", round: plain.round }]);
  });
});

describe("RoundPlay's landing", () => {
  it.each([
    ["steps", plain, STEP_MS],
    ["jumps", jumped, JUMP_MS],
  ] as const)("%s the wall down over its time", (_, fixture, settleMs) => {
    const play = playing(fixture);
    playUntilLanded(play);
    const { phase, view } = play;
    const settling = [phase, view.rowsDown];

    const ms = playUntilEnded(play);

    expect([settling, ms]).toEqual([
      ["settling", fixture.round.outcome.rowsDown],
      settleMs,
    ]);
  });

  it("eases the wall down through its step", () => {
    const play = playing(plain);
    playUntilLanded(play);

    play.advance(STEP_MS / 2, NORMAL);

    expect(play.view.wallDrop).toBe(easeOutCubic(0.5));
  });

  it("brings the wall to rest as the flight ends where motion is unwelcome", () => {
    const play = playing(plain);

    const news = playUntilLanded(play, options({ motion: false }));

    expect([play.phase, play.view.rowsDown, news]).toEqual([
      "settling",
      0,
      [{ kind: "ended", round: plain.round }],
    ]);
  });

  it.each([
    ["plain", plain, ["release", "step"]],
    ["jumped", jumped, ["release", "jump"]],
    ["cleared", cleared, ["release", "cleared"]],
    ["lost", lost, ["release", "step", "lost"]],
    ["hot", hot, ["hot-release", "step"]],
  ] as const)("logs the %s round's beats", (_, fixture, beats) => {
    const play = playing(fixture);

    playUntilEnded(play);

    expect(loggedBeats(play)).toEqual(beats);
  });

  it("warns of the danger line as a wall comes to rest over it", () => {
    const { round } = plain;
    const wall = { ...round.next.wall, lowestRow: 1 };
    const play = aimed(plain);
    play.release({ ...round, next: { ...round.next, wall } }, MARK);

    playUntilEnded(play);

    expect(loggedBeats(play)).toEqual(["release", "step", "danger"]);
  });
});

describe("RoundPlay's cards", () => {
  it.each([
    ["Cleared", cleared, true, CLEARED_MS, "cleared"],
    ["Cleared", cleared, false, FRAME_MS, "cleared"],
    ["the result", lost, true, LOST_MS, "result"],
    ["the result", lost, false, LOST_STILL_MS, "result"],
  ] as const)(
    "opens %s, motion welcome %s, %i ms after the wall comes to rest",
    (_, fixture, motion, ms, card) => {
      const play = playing(fixture);
      playUntilEnded(play, options({ motion }));

      const opened = playUntilOpens(play, options({ motion }));

      expect(opened).toEqual({ ms, card });
    },
  );

  it("opens no card after a round that leaves the level on", () => {
    const play = playing(plain);
    playUntilEnded(play);

    expect(opensWithin(play, 2000)).toBeNull();
  });

  it.each([-50, Number.NaN])(
    "counts no time of a card's wait for a frame of %d ms",
    (ms) => {
      const play = playing(cleared);
      playUntilEnded(play);

      const { opens } = play.advance(ms, NORMAL);
      const opened = playUntilOpens(play);

      expect([opens, opened]).toEqual([
        null,
        { ms: CLEARED_MS, card: "cleared" },
      ]);
    },
  );

  it("forgets a card's wait as the next round is aimed", () => {
    const play = playing(cleared);
    playUntilEnded(play);
    play.aim(plain.start);
    play.release(plain.round, MARK);
    playUntilEnded(play);

    expect(opensWithin(play, 2000)).toBeNull();
  });
});

describe("RoundPlay, skipped", () => {
  it("lands the flight at the next frame, with everything it would have done", () => {
    const play = playing(rally);
    play.advance(500, NORMAL);
    play.skip();

    play.advance(0, NORMAL);

    expect([
      play.phase,
      play.view.wall,
      play.soFar,
      loggedEvents(play),
    ]).toEqual([
      "settling",
      rally.round.next.wall,
      {
        rally: rally.round.flight.rally,
        held: 0,
        turns: rally.round.flight.turns,
        points: rally.round.outcome.points,
      },
      rally.round.flight.events,
    ]);
  });

  it("says nothing of the events it skips", () => {
    const play = playing(rally);
    play.skip();

    const { news } = play.advance(FRAME_MS, NORMAL);

    expect(news).toEqual([]);
  });

  it("hushes every event it skips but the landing", () => {
    const play = playing(plain);
    play.skip();

    play.advance(0, NORMAL);

    expect(loggedSounds(play)).toEqual([[], [], [], ["land"]]);
  });

  it("calls none of the flight it skips", () => {
    const play = aimed(rally);
    play.release(rally.round, 5);
    play.skip();

    const { news } = play.advance(0, NORMAL);

    expect(news).toEqual([]);
  });

  it("says the round has ended as its wall comes to rest", () => {
    const play = playing(rally);
    play.skip();

    const ms = playUntilEnded(play);

    expect(ms).toBe(FRAME_MS + STEP_MS);
  });

  it("skips nothing while a round is aimed, the next flight playing from its start", () => {
    const play = aimed(rally);
    play.skip();
    play.release(rally.round, MARK);

    play.advance(500, NORMAL);

    expect([play.phase, offTrack(play, rally, 7)]).toEqual([
      "flying",
      expect.closeTo(0, 9),
    ]);
  });

  it("waits for a frame of the run under way", () => {
    const play = playing(rally);
    play.skip();

    play.advance(FRAME_MS, options({ paused: true }));

    expect(play.phase).toBe("flying");
  });
});

describe("RoundPlay, landed unseen as the page is hidden", () => {
  it("lands the flight in the air at once, though the run is paused, with everything it would have done", () => {
    const play = playing(rally);
    play.advance(500, NORMAL);

    play.landUnseen(options({ paused: true }));

    expect([play.phase, play.view.wall, play.soFar.points]).toEqual([
      "settling",
      rally.round.next.wall,
      rally.round.outcome.points,
    ]);
  });

  it("says nothing of the events it lands", () => {
    const play = playing(rally);

    const { news } = play.landUnseen(NORMAL);

    expect(news).toEqual([]);
  });

  it("hushes every event it lands, its landing too", () => {
    const play = playing(plain);

    play.landUnseen(NORMAL);

    expect(loggedSounds(play)).toEqual([[], [], [], []]);
  });

  it("logs none of the beats it reaches", () => {
    const play = playing(lost);

    play.landUnseen(options({ motion: false }));

    expect(loggedBeats(play)).toEqual(["release"]);
  });

  it("logs the beats of a wall that comes to rest after it, where motion is welcome", () => {
    const play = playing(lost);
    play.landUnseen(NORMAL);

    playUntilEnded(play);

    expect(loggedBeats(play)).toEqual(["release", "lost"]);
  });

  it("hears the next flight as it plays", () => {
    const play = playing(plain);
    play.landUnseen(options({ motion: false }));
    play.aim(plain.round.next);
    play.release(plain.round, MARK);

    playUntilEnded(play);

    expect([loggedSounds(play).slice(4), loggedBeats(play)]).toEqual([
      [["knock"], [], ["strike"], ["land"]],
      ["release", "release", "step"],
    ]);
  });

  it("says the round has ended at once where motion is unwelcome", () => {
    const play = playing(plain);

    const { news } = play.landUnseen(options({ motion: false }));

    expect(news).toEqual([{ kind: "ended", round: plain.round }]);
  });

  it("plays nothing with no flight in the air", () => {
    const play = playing(cleared);
    playUntilEnded(play, options({ motion: false }));

    const { opens } = play.landUnseen(options({ motion: false }));

    expect([opens, play.phase]).toEqual([null, "settling"]);
  });
});

describe("RoundPlay, round after round", () => {
  it("aims the next round from where the last left it, its shot's count afresh", () => {
    const play = playing(jumped);
    playUntilEnded(play);

    play.aim(jumped.round.next);

    expect([
      play.phase,
      play.start,
      play.round,
      play.view.ball.x,
      play.soFar,
    ]).toEqual([
      "aiming",
      jumped.round.next,
      null,
      jumped.round.next.x,
      { rally: 0, held: 1, turns: 0, points: 0 },
    ]);
  });

  it.each(FIXTURES)(
    "hands on the %s flight's every event, in order",
    (name) => {
      const fixture = FLIGHT_FIXTURES[name];
      const play = playing(fixture);

      playUntilLanded(play);

      expect(loggedEvents(play)).toEqual(fixture.round.flight.events);
    },
  );

  it.each(FIXTURES)(
    "hands on with each of the %s flight's events what it calls for",
    (name) => {
      const { start, round } = FLIGHT_FIXTURES[name];
      const play = playing(FLIGHT_FIXTURES[name]);

      playUntilLanded(play);

      const effects: unknown[] = [];
      play.view.events.forEachSince(0, (logged) =>
        effects.push(logged.effects),
      );
      expect(effects).toEqual(flightEffects(start, round.flight, MARK));
    },
  );

  it("numbers the events on from one round to the next", () => {
    const play = playing(plain);
    playUntilEnded(play);
    play.aim(plain.round.next);
    play.release(rally.round, MARK);

    playUntilLanded(play);

    expect(play.view.events.latest).toBe(
      plain.round.flight.events.length + rally.round.flight.events.length,
    );
  });

  it("draws from the same records, frame after frame, round after round", () => {
    const play = playing(plain);
    const { view } = play;
    const { ball } = view;
    playUntilEnded(play);
    play.aim(plain.round.next);
    play.release(rally.round, MARK);

    play.advance(500, NORMAL);

    expect([play.view === view, play.view.ball === ball]).toEqual([true, true]);
  });
});
