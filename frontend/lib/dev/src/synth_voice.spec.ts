import { amplitudeAt, measure } from "./synth_measure.ts";
import { SR, samples } from "./synth_signal.ts";
import { type Call, along, sing } from "./synth_voice.ts";

/** Three tenths of a second of the reed held at 600 Hz with the mouth at oo. */
const HELD: Call = {
  seconds: 0.3,
  pitch: [
    [0, 600],
    [1, 600],
  ],
  mouth: [
    [0, "oo"],
    [1, "oo"],
  ],
  seed: 3,
};

/** Returns whether two signals hold the same samples. */
function same(a: Float64Array, b: Float64Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

describe("along", () => {
  it("holds a path of one point", () => {
    const path = along([[0.5, 2]], 10 / SR);

    expect([...path]).toEqual(Array.from({ length: 10 }, () => 2));
  });

  it("is silent along a path of no points", () => {
    expect([...along([], 3 / SR)]).toEqual([0, 0, 0]);
  });

  it("runs straight between two points, holding the first before and the last after", () => {
    const path = along(
      [
        [0.2, 1],
        [0.6, 3],
      ],
      100 / SR,
    );

    expect([path[0], path[40], path[90]]).toEqual([
      1,
      expect.closeTo(2) as unknown,
      3,
    ]);
  });

  it("moves by ratio as pitch does, its middle the two ends' geometric middle", () => {
    const path = along(
      [
        [0, 100],
        [1, 400],
      ],
      100 / SR,
      true,
    );

    expect(path[50]).toBeCloseTo(200);
  });

  it("never overshoots a point it turns at", () => {
    const path = along(
      [
        [0, 0],
        [0.5, 1],
        [1, 0],
      ],
      1000 / SR,
    );

    expect({
      top: Math.max(...path),
      turn: path[500],
    }).toEqual({ top: 1, turn: 1 });
  });

  it("passes smoothly through a point between a rise and a further rise", () => {
    const path = along(
      [
        [0, 0],
        [0.5, 1],
        [1, 3],
      ],
      1000 / SR,
    );

    expect([path[250], path[500], path[750]]).toEqual([
      expect.toSatisfy((v: number) => v > 0 && v < 1) as unknown,
      1,
      expect.toSatisfy((v: number) => v > 1 && v < 3) as unknown,
    ]);
  });
});

describe("sing", () => {
  it("sings for its time, coming in and going out from silence", () => {
    const call = sing(HELD);

    expect({
      length: call.length,
      start: call[0],
      end: Math.abs(call.at(-1) ?? 1) < 1e-3,
    }).toEqual({ length: samples(0.3), start: 0, end: true });
  });

  it("sings at its pitch, its harmonics over what lies between them", () => {
    const call = sing(HELD);

    expect(amplitudeAt(call, 600) / amplitudeAt(call, 900)).toBeGreaterThan(10);
  });

  it("sings through its mouth's resonances, a smaller throat's higher", () => {
    // An ee's second resonance lifts the fifth harmonic, at 3 kHz, in the
    // stock throat, and the third, at 1.8 kHz, in one six tenths its size.
    const lift = (size: number): number => {
      const call = sing({ ...HELD, mouth: [[0, "ee"]], size });
      return amplitudeAt(call, 3000) / amplitudeAt(call, 1800);
    };

    expect(lift(1)).toBeGreaterThan(lift(0.6) * 4);
  });

  it("is brighter with its upper resonances heard", () => {
    const dull = measure(sing({ ...HELD, bright: 0 }));
    const bright = measure(sing({ ...HELD, bright: 1.5 }));

    expect(bright.centroid).toBeGreaterThan(dull.centroid);
  });

  it("grows its vibrato from where it is told, the same until then", () => {
    const plain = sing(HELD);
    const wobbling = sing({
      ...HELD,
      wobble: { from: 0.5, rate: 6, cents: 60 },
    });
    const half = samples(0.15);

    expect({
      before: same(plain.subarray(0, half), wobbling.subarray(0, half)),
      after: same(plain.subarray(half), wobbling.subarray(half)),
    }).toEqual({ before: true, after: false });
  });

  it("follows how loud it is told to be along the way", () => {
    const fading = sing({
      ...HELD,
      loud: [
        [0, 1],
        [0.45, 1],
        [0.55, 0.1],
        [1, 0.1],
      ],
    });
    const loud = fading.subarray(samples(0.03), samples(0.12));
    const quiet = fading.subarray(samples(0.18), samples(0.24));

    // A tenth as loud is 20 dB down.
    expect(measure(loud).rms50 - measure(quiet).rms50).toBeGreaterThan(17);
  });

  it("is the same from a seed, and another from another, breathing as told", () => {
    expect({
      again: same(sing(HELD), sing(HELD)),
      other: same(sing(HELD), sing({ ...HELD, seed: 4 })),
      breathless: same(sing(HELD), sing({ ...HELD, breath: 0 })),
    }).toEqual({ again: true, other: false, breathless: false });
  });
});
