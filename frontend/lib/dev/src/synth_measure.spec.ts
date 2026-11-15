import {
  amplitudeAt,
  frames,
  loudness,
  measure,
  seam,
  spectrum,
} from "./synth_measure.ts";
import { SR, gain, mix, osc, silence } from "./synth_signal.ts";

describe("spectrum", () => {
  it("reads a sine whole at its own bin, and nothing at another", () => {
    // Eight cycles in 64 samples.
    const frame = Float64Array.from({ length: 64 }, (_, i) =>
      Math.sin((2 * Math.PI * 8 * i) / 64),
    );

    const magnitudes = spectrum(frame);

    expect({
      length: magnitudes.length,
      own: magnitudes[8],
      other: magnitudes[3],
    }).toEqual({
      length: 32,
      own: expect.closeTo(1, 9) as unknown,
      other: expect.closeTo(0, 9) as unknown,
    });
  });
});

describe("amplitudeAt", () => {
  it("reads a sine's amplitude at its pitch, and next to nothing between", () => {
    const tone = gain(osc("sine", 1000, 0.5), 0.5);

    expect([amplitudeAt(tone, 1000), amplitudeAt(tone, 1500)]).toEqual([
      expect.closeTo(0.5, 3) as unknown,
      expect.closeTo(0, 3) as unknown,
    ]);
  });
});

describe("frames", () => {
  it("reads a frame every hop, from half a frame before the start", () => {
    const read = frames(silence(1000 / SR), 256, 100);

    expect(read.map((frame) => frame.length)).toEqual(
      Array.from({ length: 12 }, () => 128),
    );
  });
});

describe("loudness", () => {
  it("reads a sound's peak and its loudest 50 ms, as measure() does", () => {
    const tone = mix([
      osc("sine", 1000, 0.2),
      { x: gain(osc("sine", 1000, 0.05), 3), at: 0.1 },
    ]);

    const { peak, rms50 } = measure(tone);

    expect(loudness(tone)).toEqual({ peak, rms50 });
  });

  it("reads a sound shorter than 50 ms over the whole of it", () => {
    const tone = osc("sine", 1000, 0.01);

    expect(loudness(tone).rms50).toBeCloseTo(20 * Math.log10(Math.SQRT1_2), 2);
  });
});

describe("measure", () => {
  it("reads a sine's length, its peak, its level and its crest", () => {
    const m = measure(gain(osc("sine", 1000, 0.5), 0.5));

    expect({
      seconds: m.seconds,
      peak: m.peak,
      rms50: m.rms50,
      crest: m.crest,
    }).toEqual({
      seconds: 0.5,
      peak: expect.closeTo(-6.02, 1) as unknown,
      rms50: expect.closeTo(-9.03, 1) as unknown,
      crest: expect.closeTo(3.01, 1) as unknown,
    });
  });

  it("reads where its energy lies, and the share a phone keeps", () => {
    const low = measure(osc("sine", 80, 0.5));
    const high = measure(osc("sine", 3000, 0.5));

    expect({
      low: { sub: low.bands.sub, phone: low.phone },
      high: { high: high.bands.high, phone: high.phone },
      centroid: high.centroid,
    }).toEqual({
      low: {
        sub: expect.closeTo(1, 2) as unknown,
        phone: expect.closeTo(0, 2) as unknown,
      },
      high: {
        high: expect.closeTo(1, 2) as unknown,
        phone: expect.closeTo(1, 2) as unknown,
      },
      centroid: expect.closeTo(3000, -2) as unknown,
    });
  });

  it("reads the air of a tone near the top", () => {
    expect(measure(osc("sine", 12000, 0.2)).bands.air).toBeCloseTo(1, 2);
  });

  it("reads how long it is heard, its middle and its ends", () => {
    const x = mix([silence(0.2), { x: osc("sine", 1000, 0.1), at: 0 }]);
    x[0] = 0.5;

    const m = measure(x);

    expect({ active: m.active, edge: m.edge, dc: m.dc }).toEqual({
      active: expect.closeTo(0.1, 2) as unknown,
      edge: 0.5,
      dc: expect.closeTo(0.5 / x.length, 6) as unknown,
    });
  });

  it("weighs a tone's loudness as an ear does, the highs over the lows", () => {
    const low = measure(osc("sine", 100, 0.5));
    const high = measure(osc("sine", 4000, 0.5));

    expect(high.lufs - low.lufs).toBeGreaterThan(3);
  });
});

describe("seam", () => {
  it("reads a loop of whole cycles as no worse than itself, and a cut one as a jump", () => {
    const whole = osc("sine", 100, 0.1);
    const cut = osc("sine", 100, 0.1025);

    expect({ whole: seam(whole), cut: seam(cut) }).toEqual({
      whole: expect.closeTo(1, 2) as unknown,
      cut: expect.toSatisfy((v: number) => v > 10) as unknown,
    });
  });
});
