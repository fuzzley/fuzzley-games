import { gainOf } from "@fz/core/sound_mix";
import {
  GameMix,
  HOLD_S,
  type MixCue,
  type SoundMix,
  type TakeSprite,
  panAt,
  soundingFor,
  variedPlay,
} from "./sound_lab_mix.ts";

/** Names a sound of the specs' mix. */
type Name = "shot" | "blast" | "ping" | "hum" | "dash" | "zip";

/**
 * A game's mix: a noisy shot of three takes, a huge blast, a tuned bell, a
 * hum, and a dash and a zip of the shot's family.
 */
const MIX: SoundMix<Name> = {
  shot: { family: "ship", level: "tick", takes: 3, tuned: false },
  blast: { family: "rocks", level: "huge", takes: 1, tuned: false },
  ping: { family: "chain", level: "small", takes: 1, tuned: true },
  hum: { family: "ship", level: "tick", takes: 1, tuned: false },
  dash: { family: "ship", level: "medium", takes: 1, tuned: false },
  zip: { family: "ship", level: "medium", takes: 1, tuned: false },
};

/** A sprite whose takes each sound half a second, the hum looping. */
const SPRITE: TakeSprite = {
  lengthOf: () => 0.5,
  loops: (take) => take === "hum",
};

/** Returns how a scene's cues play by the specs' mix, from a source that draws the numbers given, the middle where it runs out. */
function planned(cues: readonly MixCue<Name>[], ...numbers: number[]) {
  const mix = new GameMix(MIX, drawing(...numbers));
  return mix.plan(cues, SPRITE);
}

/** Returns cues of a sound at each of some times. */
function cuesOf(sound: Name, times: readonly number[]): MixCue<Name>[] {
  return times.map((at) => ({ at, sound }));
}

/** Returns a random source that draws the numbers given, in turn. */
function drawing(...numbers: number[]): () => number {
  let next = 0;
  return () => numbers[next++] ?? 0.5;
}

describe("variedPlay", () => {
  it("lowers a play by 60 cents and quiets it by 1.5 dB at most, for the least numbers drawn", () => {
    const variation = variedPlay(drawing(0, 0));

    expect(variation.detune).toBe(-60);
    expect(variation.gain).toBeCloseTo(gainOf(-1.5), 12);
  });

  it("raises a play by 60 cents and makes it 1.5 dB louder at most, for the greatest numbers", () => {
    const variation = variedPlay(drawing(1, 1));

    expect(variation.detune).toBe(60);
    expect(variation.gain).toBeCloseTo(gainOf(1.5), 12);
  });

  it("draws the detune first, then the gain", () => {
    const variation = variedPlay(drawing(1, 0.5));

    expect(variation).toEqual({ detune: 60, gain: 1 });
  });

  it("leaves a play as it is for the middle numbers", () => {
    const variation = variedPlay(drawing(0.5, 0.5));

    expect(variation).toEqual({ detune: 0, gain: 1 });
  });
});

describe("panAt", () => {
  it("pans a sound at the field's right edge 70% of the way right", () => {
    expect(panAt(1)).toBe(0.7);
  });

  it("pans a sound past the left edge no further", () => {
    expect(panAt(-3)).toBe(-0.7);
  });

  it("leaves a sound in the middle in the middle", () => {
    expect(panAt(0)).toBe(0);
  });
});

describe("GameMix", () => {
  it("names a sound's takes in the sprite, in turn", () => {
    const mix = new GameMix(MIX, drawing());

    expect(mix.takesOf("shot")).toEqual(["shot-1", "shot-2", "shot-3"]);
  });

  it("plays a sound's takes in turn, from one scene to the next", () => {
    const mix = new GameMix(MIX, drawing());
    const shots: MixCue<Name>[] = [
      { at: 0, sound: "shot" },
      { at: 1, sound: "shot" },
    ];

    const takes = [mix.plan(shots, SPRITE), mix.plan(shots, SPRITE)]
      .flat()
      .map(({ take }) => take);

    expect(takes).toEqual(["shot-1", "shot-2", "shot-3", "shot-1"]);
  });

  it("varies a noisy, busy sound by the game's numbers", () => {
    const [play] = planned([{ at: 0, sound: "shot" }], 0, 0);

    expect([play?.detune, play?.gain]).toEqual([-40, gainOf(-1.5)]);
  });

  it("leaves a tuned sound as the scene raises it", () => {
    const [play] = planned([{ at: 0, sound: "ping", detune: 700 }], 0, 0);

    expect([play?.detune, play?.gain]).toEqual([700, 1]);
  });

  it("plays a sound as loud as the scene says", () => {
    const [play] = planned([{ at: 0, sound: "blast", volume: 0.5 }]);

    expect(play?.gain).toBe(0.5);
  });

  it("pans a sound by its place, at the game's width, and one with no place in the middle", () => {
    const plays = planned([
      { at: 0, sound: "blast", x: 1 },
      { at: 1, sound: "blast" },
    ]);

    expect(plays.map(({ pan }) => pan)).toEqual([0.6, 0]);
  });

  it("ducks a busy sound played with a huge one, or a moment after", () => {
    const plays = planned([
      { at: 0, sound: "blast" },
      { at: 0, sound: "ping" },
      { at: 0.2, sound: "ping" },
    ]);

    expect(plays.map(({ gain }) => gain)).toEqual([1, gainOf(-6), gainOf(-6)]);
  });

  it("ducks a busy sound under the latest of two huge ones", () => {
    const plays = planned([
      { at: 0, sound: "blast" },
      { at: 0.3, sound: "blast" },
      { at: 0.5, sound: "ping" },
    ]);

    expect(plays.map(({ gain }) => gain)).toEqual([1, 1, gainOf(-6)]);
  });

  it("leaves a busy sound be once the duck is done", () => {
    const plays = planned([
      { at: 0, sound: "blast" },
      { at: 1, sound: "ping" },
    ]);

    expect(plays.map(({ gain }) => gain)).toEqual([1, 1]);
  });

  it("plays a scene's cues in the order of their times, those at one time in the order given", () => {
    const plays = planned([
      { at: 1, sound: "shot" },
      { at: 0, sound: "blast" },
      { at: 0, sound: "ping" },
    ]);

    expect(plays.map(({ take }) => take)).toEqual(["blast", "ping", "shot-1"]);
  });

  it("stops the oldest voice of a sound as one more plays than the game lets sound", () => {
    const plays = planned(cuesOf("shot", [0, 0.01, 0.02, 0.03, 0.04]));

    expect(plays.map(({ stopsAt }) => stopsAt)).toEqual([
      0.04,
      null,
      null,
      null,
      null,
    ]);
  });

  it("counts a voice stopped as no longer sounding", () => {
    const plays = planned(cuesOf("shot", [0, 0.01, 0.02, 0.03, 0.04, 0.05]));

    expect(plays.map(({ stopsAt }) => stopsAt)).toEqual([
      0.04,
      0.05,
      null,
      null,
      null,
      null,
    ]);
  });

  it("stops the quietest, oldest voice of a family as one more of it plays than the game lets sound", () => {
    const plays = planned([
      ...cuesOf("dash", [0, 0.01, 0.02, 0.03]),
      ...cuesOf("shot", [0.04, 0.05, 0.06, 0.07]),
      { at: 0.08, sound: "zip" },
    ]);

    expect(plays.map(({ stopsAt }) => stopsAt)).toEqual([
      null,
      null,
      null,
      null,
      0.08,
      null,
      null,
      null,
      null,
    ]);
  });

  it("counts a raised voice as sounding only as long as its take plays at its rate", () => {
    const raised = cuesOf("ping", [0, 0, 0, 0]).map((cue): MixCue<Name> => ({
      ...cue,
      detune: 1200,
    }));

    const plays = planned([...raised, { at: 0.3, sound: "ping" }]);

    expect(plays.every(({ stopsAt }) => stopsAt === null)).toBe(true);
  });

  it("stops no voice that has played out", () => {
    const plays = planned(cuesOf("shot", [0, 1, 2, 3, 4]));

    expect(plays.every(({ stopsAt }) => stopsAt === null)).toBe(true);
  });

  it("holds a looping sound's first take as long as its cue says, plainly", () => {
    const [play] = planned(
      [{ at: 1, sound: "hum", holdFor: 2, detune: 100, volume: 0.5, x: 1 }],
      0,
      0,
    );

    expect(play).toEqual({
      take: "hum",
      at: 1,
      detune: 0,
      gain: 1,
      pan: 0,
      stopsAt: 3,
    });
  });

  it("holds a looping sound a second where its cue doesn't say", () => {
    const [play] = planned([{ at: 0, sound: "hum" }]);

    expect(play?.stopsAt).toBe(HOLD_S);
  });

  it("counts a held sound among no voices", () => {
    const hums = Array.from({ length: 5 }, (): MixCue<Name> => ({
      at: 0,
      sound: "hum",
      holdFor: 1,
    }));

    const plays = planned(hums);

    expect(plays.map(({ stopsAt }) => stopsAt)).toEqual([1, 1, 1, 1, 1]);
  });
});

describe("soundingFor", () => {
  it("halves a take's length an octave up", () => {
    expect(soundingFor(1, 1200)).toBe(0.5);
  });

  it("doubles it an octave down", () => {
    expect(soundingFor(1, -1200)).toBe(2);
  });
});
