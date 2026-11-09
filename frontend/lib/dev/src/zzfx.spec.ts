import {
  ZZFX_SAMPLE_RATE,
  type ZzfxSound,
  formatZzfx,
  parseZzfx,
  zzfxCode,
  zzfxSamples,
} from "./zzfx.ts";

/** A sound that sets every parameter but the randomness, the samples it renders checked against ZzFX v1.4.0's own. */
const EVERYTHING: ZzfxSound = {
  volume: 0.8,
  frequency: 300,
  attack: 0.01,
  sustain: 0.05,
  release: 0.1,
  shape: 2,
  shapeCurve: 1.5,
  slide: -3,
  deltaSlide: 1,
  pitchJump: 40,
  pitchJumpTime: 0.03,
  repeatTime: 0.06,
  noise: 0.2,
  modulation: 2,
  bitCrush: 0.05,
  delay: 0.02,
  sustainVolume: 0.6,
  decay: 0.02,
  tremolo: 0.3,
  filter: -1500,
};

/** Noise through a high-pass, crushed: the kind of sound a rock breaks with. */
const NOISE: ZzfxSound = {
  frequency: 500,
  sustain: 0.02,
  shape: 4,
  noise: 0.5,
  bitCrush: 0.2,
  filter: 400,
};

/** Returns a rendered sound's samples at some indices, as [index, sample] pairs. */
function samplesAt(
  samples: Float32Array,
  indices: readonly number[],
): number[][] {
  return indices.map((i) => [i, samples[i] ?? Number.NaN]);
}

describe("zzfxSamples", () => {
  it("renders a sound that sets every parameter as ZzFX does", () => {
    const samples = zzfxSamples(EVERYTHING);

    expect(samples).toHaveLength(8820);
    expect(samplesAt(samples, [0, 5, 100, 1000, 3000, 4410, 8819])).toEqual([
      [0, 0],
      [5, 0.0000964101345743984],
      [100, -0.008149152621626854],
      [1000, -0.008732699789106846],
      [3000, -0.26564761996269226],
      [4410, 0.4034508168697357],
      [8819, 0.00042406542343087494],
    ]);
  });

  it("renders noise through a filter, crushed, as ZzFX does", () => {
    const samples = zzfxSamples(NOISE);

    expect(samples).toHaveLength(5301);
    expect(samplesAt(samples, [100, 1000, 2650, 3000, 5300])).toEqual([
      [100, -0.0853910818696022],
      [1000, 0.8303689956665039],
      [2650, -0.4425320029258728],
      [3000, -0.5016563534736633],
      [5300, -0.011939853429794312],
    ]);
  });

  it("renders the same samples every time, drawing nothing at random", () => {
    const sound: ZzfxSound = { ...NOISE, randomness: 0.5 };

    const first = zzfxSamples(sound);
    const second = zzfxSamples(sound);

    expect(second).toEqual(first);
  });

  it("lasts as long as its envelope and its echo, its attack at least 9 samples", () => {
    const samples = zzfxSamples({
      decay: 0.1,
      sustain: 0.2,
      release: 0.3,
      delay: 0.4,
    });

    expect(samples).toHaveLength(
      9 + 0.1 * 44100 + 0.2 * 44100 + 0.3 * 44100 + 0.4 * 44100,
    );
  });

  it("renders at the rate it is given", () => {
    const samples = zzfxSamples({ attack: 0.1, release: 0.1 }, 8000);

    expect(samples).toHaveLength(1600);
  });

  it("renders a tenth of a second of ZzFX's defaults at its rate", () => {
    const samples = zzfxSamples({});

    expect(samples).toHaveLength(9 + ZZFX_SAMPLE_RATE / 10);
  });

  it("scales every sample by its volume", () => {
    const full = zzfxSamples({ ...EVERYTHING, volume: 1 });

    const half = zzfxSamples({ ...EVERYTHING, volume: 0.5 });

    expect(half.map((sample, i) => sample - (full[i] ?? 0) / 2)).toEqual(
      new Float32Array(full.length),
    );
  });

  it("takes every tenth sample at a crush of 0.1 and holds it until the next", () => {
    const samples = zzfxSamples({ shape: 2, bitCrush: 0.1, release: 0.01 });

    expect(
      samples.slice(9, 19).map((sample) => sample - (samples[9] ?? 0)),
    ).toEqual(new Float32Array(10));
  });
});

describe("parseZzfx", () => {
  it("reads a ZzFX call as the designer copies it, a blank taking the default", () => {
    const sound = parseZzfx("zzfx(...[,,925,.04,,,,,-184])");

    expect(sound).toEqual({ frequency: 925, attack: 0.04, slide: -184 });
  });

  it("reads a parameter list alone", () => {
    const sound = parseZzfx("[1.5, 0, 85]");

    expect(sound).toEqual({ volume: 1.5, randomness: 0, frequency: 85 });
  });

  it("refuses text with no list", () => {
    expect(parseZzfx("zzfx()")).toBeNull();
  });

  it("refuses a list with something that isn't a number", () => {
    expect(parseZzfx("[,,loud]")).toBeNull();
  });

  it("refuses a list longer than ZzFX's parameters", () => {
    expect(parseZzfx(`[${"1,".repeat(21)}1]`)).toBeNull();
  });
});

describe("formatZzfx", () => {
  it("writes a sound as the designer copies it, blanks for what it leaves out", () => {
    const text = formatZzfx({ frequency: 925, attack: 0.04, slide: -0.5 });

    expect(text).toBe("[,,925,.04,,,,,-.5]");
  });

  it("writes ZzFX's defaults as an empty list", () => {
    expect(formatZzfx({})).toBe("[]");
  });

  it("writes what parseZzfx() reads back as it was", () => {
    const sound = parseZzfx(formatZzfx(EVERYTHING));

    expect(sound).toEqual(EVERYTHING);
  });
});

describe("zzfxCode", () => {
  it("writes a sound as an object of what it gives, in ZzFX's order", () => {
    const code = zzfxCode({ filter: -2600, volume: 0.6, frequency: 1250 });

    expect(code).toBe("{ volume: 0.6, frequency: 1250, filter: -2600 }");
  });
});
