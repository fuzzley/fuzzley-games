import { FEEL } from "./feel";
import { limitFlashes, limitFluff, limitSounds } from "./limits";
import { lookAt } from "./looks";
import type { Effect, SoundCue, SpriteTrack } from "./timeline";

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

/** Returns a cue of a sound at a moment. */
function cue(sound: SoundCue["sound"], atMs: number): SoundCue {
  return { atMs, sound, cents: 0, volume: 1 };
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

  it("keeps every cue of a sound with no gap", () => {
    const cues = [cue("note", 0), cue("note", 1)];

    expect(limitSounds(cues, FEEL)).toEqual(cues);
  });
});
