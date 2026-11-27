import { keysOf, recordOf } from "@fz/core/records";
import { mostAtOnce } from "../../testing/at_once";
import type { MoveFixture } from "../../testing/move_fixtures";
import { moveStartOf } from "../../testing/shown_board";
import { SKETCH_MOVES } from "../../testing/sketch_moves";
import { TOP_RUNG } from "../effects/ladder";
import { timelineOf } from "./build";
import { FEEL } from "./feel";
import {
  POOLS,
  type Pools,
  limitFlashes,
  limitFluff,
  limitMarks,
  limitPooledEffects,
  limitSounds,
} from "./limits";
import { lookAt } from "./looks";
import { cue, noteCue } from "./part";
import type { Effect, SpriteTrack, Timeline, WaveMark } from "./timeline";

/** Returns a fluff of so many tufts at a moment. */
function fluff(atMs: number, count: number): Effect {
  return {
    what: "fluff",
    atMs,
    at: { x: 0, y: 0 },
    tuft: "tuft-red",
    count,
    power: 1,
  };
}

/** Returns a cage's bar flying loose for a while. */
function bar(fromMs: number, untilMs: number): SpriteTrack {
  return {
    drawn: { what: "frame", frame: "cage-bar" },
    fromMs,
    untilMs,
    look: lookAt({ x: 0, y: 0 }),
    keys: {},
  };
}

/** Returns a ring spreading for a while from a moment. */
function ring(atMs: number, ms: number): Effect {
  return {
    what: "ring",
    atMs,
    ms,
    at: { x: 0, y: 0 },
    radius: 1,
    ink: "white",
  };
}

/** Returns a wave's mark at a moment. */
function mark(atMs: number): WaveMark {
  return { atMs, at: { x: 0, y: 0 }, times: 2 };
}

/** The longest a tuft of fluff flies. */
const TUFT_MS = FEEL.tuftLifeMs + FEEL.tuftLifeSpreadMs;

describe("limitFlashes", () => {
  it("keeps a flash only the feel's gap or more after the last kept", () => {
    const flashes = [0, 100, 349, 350, 600, 701].map((atMs) => ({ atMs }));

    expect(
      limitFlashes(flashes, Infinity, FEEL).map(({ atMs }) => atMs),
    ).toEqual([0, 350, 701]);
  });

  it("keeps a flash from the moment a tap may hurry on only the gap at the hurried pace after the last kept", () => {
    const hurriedGapMs = FEEL.flashGapMs * FEEL.hurriedPace;
    const flashes = [0, 350, 350 + hurriedGapMs - 1, 350 + hurriedGapMs].map(
      (atMs) => ({ atMs }),
    );

    expect(limitFlashes(flashes, 400, FEEL).map(({ atMs }) => atMs)).toEqual([
      0,
      350,
      350 + hurriedGapMs,
    ]);
  });
});

describe("limitFluff", () => {
  it("keeps fluff while the board holds no more loose bits than the feel's most", () => {
    const effects = [
      fluff(0, 200),
      fluff(10, 200),
      fluff(20, FEEL.mostLooseBits - 400),
    ];

    expect(limitFluff(effects, [], FEEL)).toEqual(effects);
  });

  it("drops a fluff that would put more loose bits on the board than the most", () => {
    const effects = [fluff(0, 400), fluff(10, 21), fluff(20, 20)];

    expect(limitFluff(effects, [], FEEL)).toEqual([effects[0], effects[2]]);
  });

  it("counts a fluff's tufts as loose until the longest a tuft flies", () => {
    const effects = [fluff(0, 400), fluff(TUFT_MS, 400)];

    expect(limitFluff(effects, [], FEEL)).toEqual(effects);
  });

  it("counts each loose frame while it shows", () => {
    const effects = [fluff(100, FEEL.mostLooseBits - 1)];

    expect({
      showing: limitFluff(effects, [bar(50, 150), bar(60, 160)], FEEL),
      gone: limitFluff(effects, [bar(0, 100), bar(10, 90)], FEEL),
    }).toEqual({ showing: [], gone: effects });
  });

  it("keeps every effect that is no fluff", () => {
    const effects: Effect[] = [
      fluff(0, FEEL.mostLooseBits),
      { what: "shake", atMs: 5, px: 3 },
    ];

    expect(limitFluff(effects, [], FEEL)).toEqual(effects);
  });
});

describe("limitSounds", () => {
  it("keeps a sound with a gap only its gap or more after the last kept of it", () => {
    const cues = [0, 20, 60, 100, 125].map((atMs) => cue("land", atMs));

    expect(limitSounds(cues, FEEL).map(({ atMs }) => atMs)).toEqual([
      0, 60, 125,
    ]);
  });

  it("keeps each sound's gap apart from another's", () => {
    const cues = [cue("land", 0), cue("dash", 10), cue("tick", 20)];

    expect(limitSounds(cues, FEEL)).toEqual(cues);
  });

  it("keeps a sound's gap on each rung apart, as the sketch names each rung's sound", () => {
    const cues = [
      noteCue("pop", 0, 1),
      noteCue("pop", 0, 2),
      noteCue("pop", 0, 2),
    ];

    expect(limitSounds(cues, FEEL)).toEqual([
      noteCue("pop", 0, 1),
      noteCue("pop", 0, 2),
    ]);
  });

  it("keeps one gap across the rungs past the ladder's top, which play as the top", () => {
    const cues = [noteCue("pop", 0, TOP_RUNG), noteCue("pop", 0, TOP_RUNG + 1)];

    expect(limitSounds(cues, FEEL)).toEqual([noteCue("pop", 0, TOP_RUNG)]);
  });

  it("keeps every cue of a sound with no gap", () => {
    const cues = [cue("note", 0), cue("note", 1)];

    expect(limitSounds(cues, FEEL)).toEqual(cues);
  });
});

/** Pools that hold any number of each effect and mark at once. */
const UNPOOLED: Pools = recordOf(keysOf(POOLS), () => Infinity);

/** Returns the timeline of a move the sketch played, as moves play unless the player sets them otherwise, held to no pool. */
function playedUnpooled(fixture: MoveFixture): Timeline {
  return timelineOf(
    fixture.record,
    moveStartOf(fixture),
    FEEL,
    { speed: "normal", motion: "full" },
    null,
    UNPOOLED,
  );
}

describe("POOLS", () => {
  it("holds as many of each as the busiest moves would show at once", () => {
    const withDasher = mostAtOnce(
      playedUnpooled(SKETCH_MOVES.frizzballAndDasher),
      FEEL,
    );
    const withPuffer = mostAtOnce(
      playedUnpooled(SKETCH_MOVES.dasherAndPuffer),
      FEEL,
    );
    const two = mostAtOnce(playedUnpooled(SKETCH_MOVES.twoFrizzballs), FEEL);

    expect(POOLS).toEqual({
      ring: two.ring,
      streak: withPuffer.streak,
      bolt: withDasher.bolt,
      flash: withDasher.flash,
      mark: withDasher.mark,
    });
  });
});

describe("limitPooledEffects", () => {
  it("drops an effect that starts while its pool's every one still shows", () => {
    const rings = Array.from({ length: POOLS.ring + 1 }, () => ring(0, 100));

    expect(limitPooledEffects(rings, POOLS)).toHaveLength(POOLS.ring);
  });

  it("keeps one that starts as another of its pool is done", () => {
    const rings = [
      ...Array.from({ length: POOLS.ring }, () => ring(0, 100)),
      ring(100, 100),
    ];

    expect(limitPooledEffects(rings, POOLS)).toHaveLength(POOLS.ring + 1);
  });

  it("keeps every effect drawn from no pool", () => {
    const fluffs = Array.from({ length: POOLS.ring + 1 }, () => fluff(0, 1));

    expect(limitPooledEffects(fluffs, POOLS)).toEqual(fluffs);
  });
});

describe("limitMarks", () => {
  it("drops a mark that starts while the pool's every one still shows", () => {
    const marks = Array.from({ length: POOLS.mark + 1 }, () => mark(0));

    expect(limitMarks(marks, POOLS, FEEL)).toHaveLength(POOLS.mark);
  });

  it("keeps one that starts as another is done", () => {
    const marks = [
      ...Array.from({ length: POOLS.mark }, () => mark(0)),
      mark(FEEL.markMs),
    ];

    expect(limitMarks(marks, POOLS, FEEL)).toHaveLength(POOLS.mark + 1);
  });
});
