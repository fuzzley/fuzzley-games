import {
  decibelsOf,
  gainToMatch,
  loudnessOf,
  panAt,
  seamless,
  variedPlay,
} from "./sound_lab_mix.ts";

/** The rate the specs' samples are at: a sample a millisecond. */
const RATE = 1000;

/** Returns samples of one value, as many as given. */
function steady(value: number, length: number): Float32Array {
  return new Float32Array(length).fill(value);
}

/** Returns a random source that draws the numbers given, in turn. */
function drawing(...numbers: number[]): () => number {
  let next = 0;
  return () => numbers[next++] ?? 0;
}

describe("loudnessOf", () => {
  it("measures a steady sound by its level", () => {
    const loudness = loudnessOf(steady(0.5, 400), RATE);

    expect(loudness).toBeCloseTo(0.5);
  });

  it("measures a short burst in a long silence by the burst, not the silence", () => {
    const samples = new Float32Array(1000);
    samples.set(steady(0.4, 50), 500);

    const loudness = loudnessOf(samples, RATE);

    expect(loudness).toBeCloseTo(0.4);
  });

  it("measures a sound shorter than its stretch whole", () => {
    const loudness = loudnessOf(steady(-0.3, 10), RATE);

    expect(loudness).toBeCloseTo(0.3);
  });

  it("measures silence as 0", () => {
    expect(loudnessOf(new Float32Array(100), RATE)).toBe(0);
  });
});

describe("gainToMatch", () => {
  it("returns what brings a sound as loud as another", () => {
    expect(gainToMatch(0.4, 0.1)).toBeCloseTo(0.25);
  });

  it("leaves a silent sound as it is", () => {
    expect(gainToMatch(0, 0.1)).toBe(1);
  });
});

describe("decibelsOf", () => {
  it("returns a halving as about 6 dB down", () => {
    expect(decibelsOf(0.5)).toBeCloseTo(-6.02);
  });
});

describe("seamless", () => {
  /** Samples that count up from 0, a hundredth a sample. */
  const counting = Float32Array.from({ length: 100 }, (_, i) => i / 100);

  it("cuts its fade off the end", () => {
    const loop = seamless(counting, RATE, 0.02);

    expect(loop).toHaveLength(80);
  });

  it("starts where the cut-off end starts, so the loop's end runs on into it", () => {
    const loop = seamless(counting, RATE, 0.02);

    expect(loop[0]).toBeCloseTo(0.8);
  });

  it("keeps the samples after the fade as they were", () => {
    const loop = seamless(counting, RATE, 0.02);

    expect([...loop.slice(20)]).toEqual([...counting.slice(20, 80)]);
  });

  it("throws for a fade longer than half the samples", () => {
    expect(() => seamless(counting, RATE, 0.051)).toThrow(RangeError);
  });
});

// The lab plays by the mix's formulas at numbers of its own.
describe("variedPlay", () => {
  it("lowers a play by 60 cents and quiets it by 1.5 dB at most, for the least numbers drawn", () => {
    const variation = variedPlay(drawing(0, 0));

    expect(variation.detune).toBe(-60);
    expect(decibelsOf(variation.gain)).toBeCloseTo(-1.5, 9);
  });

  it("raises a play by 60 cents and makes it 1.5 dB louder at most, for the greatest numbers", () => {
    const variation = variedPlay(drawing(1, 1));

    expect(variation.detune).toBe(60);
    expect(decibelsOf(variation.gain)).toBeCloseTo(1.5, 9);
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
