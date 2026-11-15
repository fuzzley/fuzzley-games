import {
  SR,
  adsr,
  biquad,
  cents,
  centered,
  comb,
  compress,
  crush,
  dB,
  drive,
  echo,
  fade,
  filter,
  fit,
  fm,
  fold,
  gain,
  glide,
  hz,
  lfo,
  limit,
  looped,
  mix,
  modes,
  noise,
  normalize,
  osc,
  perc,
  pluck,
  points,
  read,
  resample,
  resonate,
  reverb,
  reverbStereo,
  reversed,
  samples,
  scatter,
  seeded,
  shelf,
  silence,
  unit,
  wav,
  wavSamples,
} from "./synth_signal.ts";
import { amplitudeAt } from "./synth_measure.ts";

/** Returns a level in decibels. */
function decibels(level: number): number {
  return 20 * Math.log10(level);
}

/** Returns the RMS of a signal, from a sample up to another. */
function rms(x: Float64Array, from = 0, to = x.length): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += (x[i] ?? 0) ** 2;
  return Math.sqrt(sum / (to - from));
}

/** Returns a signal of the values given. */
function signal(...values: number[]): Float64Array {
  return Float64Array.from(values);
}

/** Returns a signal of one impulse, then silence, as long as given in samples. */
function impulse(length: number): Float64Array {
  const x = new Float64Array(length);
  x[0] = 1;
  return x;
}

/**
 * Returns how much power a signal has a hertz in the octave from a pitch,
 * in dB, as two filters cut it out.
 */
function densityAt(x: Float64Array, low: number): number {
  const y = filter(filter(x, "hp", low, 0.707), "lp", low * 2, 0.707);
  return 10 * Math.log10(rms(y) ** 2 / low);
}

/** Returns the steady level a filter passes a sine at, in dB, once it has settled. */
function passed(through: (x: Float64Array) => Float64Array, freq: number) {
  const y = through(osc("sine", freq, 1));
  return decibels(rms(y, SR / 2) * Math.SQRT2);
}

describe("the basics", () => {
  it("counts the samples a time takes, one at least", () => {
    expect([samples(0.5), samples(0)]).toEqual([22050, 1]);
  });

  it("makes silence as long as asked", () => {
    const quiet = silence(0.01);

    expect({ length: quiet.length, loudest: Math.max(...quiet) }).toEqual({
      length: 441,
      loudest: 0,
    });
  });

  it("reads a number, an array held past its end, and a function of time", () => {
    const read5 = [read(0.5, 5), read(signal(1, 2), 5), read((t) => t, SR)];

    expect(read5).toEqual([0.5, 2, 1]);
  });

  it("reads an empty array as silence", () => {
    expect(read(new Float64Array(0), 5)).toBe(0);
  });

  it("draws the same numbers from the same seed, each from 0 up to 1", () => {
    const first = seeded(7);
    const second = seeded(7);

    const drawn = Array.from({ length: 100 }, () => first());

    expect({
      same: drawn.every((v) => v === second()),
      within: drawn.every((v) => v >= 0 && v < 1),
    }).toEqual({ same: true, within: true });
  });

  it("turns decibels, cents and notes into gains, ratios and pitches", () => {
    expect([dB(-20), cents(1200), hz(69), hz(81)]).toEqual([0.1, 2, 440, 880]);
  });
});

describe("the envelopes", () => {
  it("draws straight lines between points, holding the first before and the last after", () => {
    const line = points(
      [
        [100 / SR, 0.5],
        [200 / SR, 1],
      ],
      300 / SR,
    );

    expect([line[0], line[150], line[250]]).toEqual([
      0.5,
      expect.closeTo(0.75) as unknown,
      1,
    ]);
  });

  it("is silent through no points", () => {
    expect([...points([], 3 / SR)]).toEqual([0, 0, 0]);
  });

  it("bends toward the later point early with a curve above 1", () => {
    const bent = points(
      [
        [0, 0],
        [0.02, 1],
      ],
      0.02,
      2,
    );

    expect(bent[441]).toBeCloseTo(0.75);
  });

  it("strikes and falls 60 dB over the decay", () => {
    const struck = perc(0.01, 0.1, 0.2);

    expect([struck[220], struck[441], struck[441 + 4410]]).toEqual([
      220 / 441,
      1,
      expect.closeTo(0.001, 6) as unknown,
    ]);
  });

  it("holds at its sustain, then lets go", () => {
    const held = adsr(
      { attack: 0.01, decay: 0.01, sustain: 0.5, hold: 0.05, release: 0.01 },
      0.1,
    );

    // Its release runs from 0.05 s to 0.06 s.
    expect([held[441], held[1500], held[2425], held[3000]]).toEqual([
      1,
      0.5,
      expect.closeTo(0.25, 2) as unknown,
      0,
    ]);
  });

  it("glides by ratio, a quarter of the way there at a quarter of the time on a log scale", () => {
    const pitch = glide(100, 1600, 0.1, 0.2);

    expect([pitch[1102], pitch[8000]]).toEqual([
      expect.closeTo(200, 0) as unknown,
      1600,
    ]);
  });

  it("wobbles about its middle at its rate", () => {
    const wobble = lfo(1, 0.5, 10, 0.1, 0.25);

    expect([wobble[0], wobble[2205]]).toEqual([
      1.5,
      expect.closeTo(0.5) as unknown,
    ]);
  });
});

describe("osc", () => {
  it("plays a sine at its pitch", () => {
    const tone = osc("sine", 1000, 1);

    expect(amplitudeAt(tone, 1000)).toBeCloseTo(1, 3);
  });

  it("plays a saw whose harmonics fall as 1 over their number", () => {
    const saw = osc("saw", 1000, 1);

    expect(amplitudeAt(saw, 3000) / amplitudeAt(saw, 1000)).toBeCloseTo(
      1 / 3,
      2,
    );
  });

  it("keeps a saw's aliases far under its harmonics", () => {
    const saw = osc("saw", 1000, 1);

    // The 44th harmonic folds back to 100 Hz, the 43rd to 1100 and the 45th
    // to 900, where a saw without the smoothing has them 33 dB under its
    // fundamental.
    const under = [100, 900, 1100].map(
      (alias) =>
        decibels(amplitudeAt(saw, 1000)) - decibels(amplitudeAt(saw, alias)),
    );

    expect(Math.min(...under)).toBeGreaterThan(90);
  });

  it("plays a square of a pulse half wide, with no even harmonics", () => {
    const square = osc("pulse", 500, 1);

    expect({
      odd: amplitudeAt(square, 1500) / amplitudeAt(square, 500),
      even: amplitudeAt(square, 1000) / amplitudeAt(square, 500),
    }).toEqual({
      odd: expect.closeTo(1 / 3, 2) as unknown,
      even: expect.closeTo(0, 3) as unknown,
    });
  });

  it("plays a triangle whose harmonics fall 12 dB an octave", () => {
    const triangle = osc("tri", 500, 1);

    expect(
      amplitudeAt(triangle, 1500) / amplitudeAt(triangle, 500),
    ).toBeCloseTo(1 / 9, 2);
  });

  it("starts at its phase, and follows a pitch that moves", () => {
    const shifted = osc("sine", 0, 0.01, { phase: 1.25 });
    const rising = osc("sine", glide(100, 400, 0.5, 1), 1);

    expect({
      start: shifted[0],
      late: amplitudeAt(rising.subarray(SR - 4410), 400),
    }).toEqual({ start: 1, late: expect.closeTo(1, 1) as unknown });
  });
});

describe("fm", () => {
  it("is a sine with no index", () => {
    const tone = fm(1000, 2, 0, 1);

    expect(amplitudeAt(tone, 1000)).toBeCloseTo(1, 3);
  });

  it("grows sidebands a modulator's pitch apart as its index grows", () => {
    const bent = fm(1000, 0.5, 1, 1);

    // A Bessel function's first sideband, J1(1), beside J0(1) at the carrier.
    expect(amplitudeAt(bent, 1500) / amplitudeAt(bent, 1000)).toBeCloseTo(
      0.4401 / 0.7652,
      2,
    );
  });

  it("roughens with feedback, spreading its partials", () => {
    const clean = fm(1000, 1, 1, 1);
    const rough = fm(1000, 1, 1, 1, { feedback: 1 });

    expect(amplitudeAt(rough, 4000)).toBeGreaterThan(
      amplitudeAt(clean, 4000) * 2,
    );
  });
});

describe("noise", () => {
  it("is white from -1 to 1, the same from the same seed", () => {
    const white = noise("white", 0.1, 3);

    expect({
      same: white.every((v, i) => v === noise("white", 0.1, 3)[i]),
      within: white.every((v) => v >= -1 && v < 1),
      rms: rms(white),
    }).toEqual({
      same: true,
      within: true,
      rms: expect.closeTo(1 / Math.sqrt(3), 1) as unknown,
    });
  });

  it("is pink at about 3 dB an octave", () => {
    const pink = noise("pink", 4, 3);

    // Power a hertz in the low mids against four octaves up.
    const fall = (densityAt(pink, 200) - densityAt(pink, 3200)) / 4;

    expect(fall).toBeCloseTo(3, 0);
  });

  it("is brown, at about 6 dB an octave over its rumble", () => {
    const brown = noise("brown", 4, 3);

    const fall = (densityAt(brown, 400) - densityAt(brown, 3200)) / 3;

    expect(fall).toBeCloseTo(6, 0);
  });
});

describe("modes", () => {
  it("rings each partial at its pitch, falling 60 dB over its decay", () => {
    const rung = modes([{ freq: 1000, decay: 0.5 }], 1);

    // Ten whole cycles at its start, and ten again half a second on.
    const fell = rms(rung, 22050, 22491) / rms(rung, 0, 441);

    expect(fell).toBeCloseTo(0.001, 5);
  });

  it("sums partials at their gains, and passes one past half the sample rate by", () => {
    const rung = modes(
      [
        { freq: 1000, decay: 10, gain: 0.5 },
        { freq: 3000, decay: 10, gain: 0.25, phase: 0.25 },
        // It would fold back to 14,100 Hz.
        { freq: 30000, decay: 10 },
      ],
      1,
    );

    expect({
      gains: amplitudeAt(rung, 3000) / amplitudeAt(rung, 1000),
      folded: amplitudeAt(rung, 14100),
    }).toEqual({
      gains: expect.closeTo(0.5, 3) as unknown,
      folded: expect.closeTo(0, 3) as unknown,
    });
  });

  it("falls by its bend as it rings", () => {
    const bent = modes([{ freq: 1000, decay: 1, bend: 1200 }], 1.2);

    expect(amplitudeAt(bent.subarray(SR, SR + 4410), 500)).toBeGreaterThan(
      amplitudeAt(bent.subarray(SR, SR + 4410), 1000) * 10,
    );
  });
});

describe("pluck", () => {
  it("rings at its pitch and its harmonics, not between them", () => {
    const string = pluck(441, 0.1, { seed: 2 });

    expect(
      amplitudeAt(string, 441) / amplitudeAt(string, 661.5),
    ).toBeGreaterThan(10);
  });

  it("dies over its decay", () => {
    const string = pluck(441, 1, { decay: 0.5, damp: 0, seed: 2 });

    // It falls 60 dB in half a second, so 120 dB by its last tenth.
    expect(rms(string, SR - 4410) / rms(string, 0, 4410)).toBeLessThan(1e-5);
  });
});

describe("the mixing", () => {
  it("scales by a gain that may move", () => {
    expect([...gain(signal(1, 1, 1), signal(0, 0.5, 1))]).toEqual([0, 0.5, 1]);
  });

  it("sums layers from their starts at their gains, as long as the last", () => {
    const mixed = mix([
      signal(1, 1),
      { x: signal(1, 1), at: 1 / SR, gain: 0.5 },
    ]);

    expect([...mixed]).toEqual([1, 1.5, 0.5]);
  });

  it("cuts or pads a signal to a length", () => {
    const x = signal(1, 2, 3);

    expect([[...fit(x, 2 / SR)], [...fit(x, 4 / SR)]]).toEqual([
      [1, 2],
      [1, 2, 3, 0],
    ]);
  });

  it("fades in straight and out round, leaving the middle", () => {
    const faded = fade(new Float64Array(100).fill(1), 4 / SR, 4 / SR);

    expect([faded[0], faded[2], faded[50], faded[97], faded[99]]).toEqual([
      0,
      0.5,
      1,
      expect.closeTo(0.5) as unknown,
      0,
    ]);
  });

  it("plays faster and higher at a ratio above 1", () => {
    const faster = resample(osc("sine", 500, 1), 2);

    expect({
      length: faster.length,
      pitch: amplitudeAt(faster, 1000),
    }).toEqual({ length: SR / 2, pitch: expect.closeTo(1, 2) as unknown });
  });

  it("plays a signal unchanged at a ratio of 1", () => {
    const x = signal(0.1, 0.5, -0.3, 0.2);

    expect([...resample(x, 1)]).toEqual([...x]);
  });

  it("plays nothing as one silent sample", () => {
    expect([...resample(new Float64Array(0), 2)]).toEqual([0]);
  });

  it("turns a signal back to front", () => {
    expect([...reversed(signal(1, 2, 3))]).toEqual([3, 2, 1]);
  });
});

describe("filter", () => {
  it("falls 12 dB an octave above a low-pass's cutoff", () => {
    const low = (x: Float64Array): Float64Array => filter(x, "lp", 500);

    expect(passed(low, 2000) - passed(low, 4000)).toBeCloseTo(12, 0);
  });

  it("falls 12 dB an octave below a high-pass's cutoff", () => {
    const high = (x: Float64Array): Float64Array => filter(x, "hp", 4000);

    expect(passed(high, 500) - passed(high, 250)).toBeCloseTo(12, 0);
  });

  it("passes a band-pass's middle whole, whatever its width", () => {
    const narrow = (x: Float64Array): Float64Array => filter(x, "bp", 1000, 8);
    const wide = (x: Float64Array): Float64Array => filter(x, "bp", 1000, 0.5);

    expect([passed(narrow, 1000), passed(wide, 1000)]).toEqual([
      expect.closeTo(0, 0) as unknown,
      expect.closeTo(0, 0) as unknown,
    ]);
  });

  it("takes a notch's pitch out", () => {
    const notch = (x: Float64Array): Float64Array =>
      filter(x, "notch", 1000, 2);

    expect(passed(notch, 1000)).toBeLessThan(-40);
  });

  it("follows a cutoff that moves", () => {
    const opening = (x: Float64Array): Float64Array =>
      filter(x, "lp", (t) => (t < 0.5 ? 100 : 10000));

    expect(passed(opening, 3000)).toBeCloseTo(0, 0);
  });

  it("lifts or cuts a shelf's side by its decibels", () => {
    const lows = (x: Float64Array): Float64Array => shelf(x, "low", 500, 6);
    const highs = (x: Float64Array): Float64Array => shelf(x, "high", 500, -6);

    expect([passed(lows, 50), passed(highs, 8000)]).toEqual([
      expect.closeTo(6, 0) as unknown,
      expect.closeTo(-6, 0) as unknown,
    ]);
  });

  it("runs a fixed two-pole filter by its coefficients", () => {
    expect([...biquad(impulse(3), [1, 0.5, 0, -0.5, 0])]).toEqual([1, 1, 0.5]);
  });

  it("rings a signal through its resonators for the tail it adds", () => {
    const rung = resonate(impulse(10), [{ freq: 1000, decay: 0.5 }], 1);

    expect({
      length: rung.length,
      ringing: amplitudeAt(rung, 1000) / amplitudeAt(rung, 1500),
    }).toEqual({
      length: SR + 10,
      ringing: expect.toSatisfy((r: number) => r > 10) as unknown,
    });
  });

  it("passes a resonator past half the sample rate by", () => {
    const rung = resonate(impulse(10), [{ freq: 30000, decay: 0.5 }]);

    expect(rung.every((v) => v === 0)).toBe(true);
  });

  it("delays and feeds a comb back, mixing it as told", () => {
    const combed = comb(impulse(5), 2 / SR, 0.5, { tail: 1 / SR, mix: 0.5 });

    expect([...combed]).toEqual([0.5, 0, 0.5, 0, 0.25, 0]);
  });

  it("adds no tail unless told, as long as what it is given", () => {
    const combed = comb(impulse(5), 2 / SR, 0.5);

    expect(combed.length).toBe(5);
  });
});

describe("the shaping", () => {
  it("drives into a soft clip that keeps full scale at full scale", () => {
    const driven = drive(signal(1, 0.1, -1), 3);

    expect([...driven]).toEqual([
      1,
      expect.closeTo(Math.tanh(0.3) / Math.tanh(3)) as unknown,
      -1,
    ]);
  });

  it("folds a signal back past full scale", () => {
    expect([...fold(signal(1, 2), 1)]).toEqual([
      1,
      expect.closeTo(0) as unknown,
    ]);
  });

  it("holds samples and cuts them to fewer levels", () => {
    expect([...crush(signal(0.3, 0.9, 0.6, 0.1), 2, 2)]).toEqual([
      0.5, 0.5, 0.5, 0.5,
    ]);
  });
});

describe("the space", () => {
  it("echoes after its time, fainter each time", () => {
    const echoed = echo(impulse(1), {
      time: 0.01,
      feedback: 0.5,
      mix: 1,
      damp: 0,
    });

    expect([echoed[0], echoed[441], echoed[882], echoed.length]).toEqual([
      1,
      1,
      0.5,
      1 + 1764,
    ]);
  });

  it("keeps the dry signal and lays a fainter tail under it", () => {
    const roomy = reverb(impulse(441), { decay: 0.3, mix: 0.2 });

    expect({
      dry: roomy[0],
      longer: roomy.length > 441 + samples(0.3),
      tail: rms(roomy, 441, roomy.length) > 0,
    }).toEqual({ dry: 1, longer: true, tail: true });
  });

  it("dies away in the room by its decay", () => {
    const roomy = reverb(impulse(1), { decay: 0.3, mix: 1, predelay: 0 });

    // Half its decay apart, once the room has filled: 30 dB, and its highs
    // dying faster.
    const fell = decibels(
      rms(roomy, samples(0.25), samples(0.27)) /
        rms(roomy, samples(0.1), samples(0.12)),
    );

    expect(fell).toBeLessThan(-30);
  });

  it("puts the same dry signal in both ears, the tails apart", () => {
    const [left, right] = reverbStereo(impulse(441));

    expect({
      dry: [left[0], right[0]],
      apart: left.some((v, i) => v !== right[i]),
    }).toEqual({ dry: [1, 1], apart: true });
  });
});

describe("the dynamics", () => {
  it("turns a loud steady signal down by its ratio above the threshold", () => {
    const squeezed = compress(new Float64Array(SR).fill(dB(-6)), {
      threshold: -18,
      ratio: 4,
    });

    expect(decibels(squeezed[SR - 1] ?? 0)).toBeCloseTo(-18 + 12 / 4, 1);
  });

  it("lets go over its release once a loud signal falls quiet", () => {
    const x = new Float64Array(SR).fill(0.01);
    x.fill(dB(-6), 0, SR / 10);

    const squeezed = compress(x, { threshold: -18, ratio: 4 });

    expect({
      held: (squeezed[SR / 10 + 44] ?? 0) / 0.01,
      let: squeezed[SR - 1],
    }).toEqual({
      held: expect.toSatisfy((share: number) => share < 0.5) as unknown,
      let: expect.closeTo(0.01, 6) as unknown,
    });
  });

  it("leaves a quiet signal as it is, but for its makeup", () => {
    const quiet = compress(signal(0.01, 0.01), { makeup: 6 });

    expect([...quiet]).toEqual([
      expect.closeTo(0.01 * dB(6)) as unknown,
      expect.closeTo(0.01 * dB(6)) as unknown,
    ]);
  });

  it("keeps every sample under its ceiling, the quiet ones round it as they were", () => {
    const x = gain(osc("sine", 100, 0.5), 0.25);
    x[4410] = 4;

    const limited = limit(x, -6);

    expect({
      under: limited.every((v) => Math.abs(v) <= dB(-6) + 1e-12),
      // Its last cycle, a third of a second past the peak.
      far: rms(limited, SR / 2 - 441) / rms(x, SR / 2 - 441),
    }).toEqual({ under: true, far: expect.closeTo(1, 2) as unknown });
  });

  it("brings a signal's loudest sample to a level, and a unit's to full scale", () => {
    const x = signal(0.2, -0.4);

    expect([[...normalize(x, -6)], [...unit(x)]]).toEqual([
      [
        expect.closeTo(dB(-6) / 2) as unknown,
        expect.closeTo(-dB(-6)) as unknown,
      ],
      [0.5, -1],
    ]);
  });

  it.each([
    ["silence", signal(0, 0)],
    ["what isn't a number", signal(Number.NaN)],
  ])("refuses to normalize %s", (_, x) => {
    expect(() => normalize(x)).toThrow("A sound is silent or not a number.");
  });

  it("takes out what holds a signal off the middle", () => {
    const offset = centered(new Float64Array(SR).fill(0.5));

    expect(Math.abs(offset[SR - 1] ?? 1)).toBeLessThan(0.001);
  });
});

describe("the texture", () => {
  it("scatters its grains over its time, each from its own random", () => {
    const grains: number[] = [];
    const shares: number[] = [];

    const scattered = scatter({
      count: 3,
      seconds: 0.1,
      seed: 5,
      bias: 1,
      grain: (i, _random, share) => {
        grains.push(i);
        shares.push(share);
        return signal(1);
      },
      level: () => 0.5,
    });

    expect({
      grains,
      within: shares.every((share) => share >= 0 && share < 1),
      sum: scattered.reduce((sum, v) => sum + v, 0),
      short: scattered.length <= samples(0.1) + 1,
    }).toEqual({ grains: [0, 1, 2], within: true, sum: 1.5, short: true });
  });

  it("lays every grain at full level unless told", () => {
    const scattered = scatter({
      count: 2,
      seconds: 0,
      seed: 5,
      grain: () => signal(1),
    });

    expect([...scattered]).toEqual([2]);
  });

  it("makes a loop end as its start begins, through an even crossfade", () => {
    const x = Float64Array.from({ length: 30 }, (_, i) => i);

    const loop = looped(x, 20 / SR, 10 / SR);

    expect({
      length: loop.length,
      first: loop[0],
      last: loop[19],
      crossed: loop[15],
    }).toEqual({
      length: 20,
      first: 10,
      last: expect.closeTo(
        Math.cos((9 / 10) * (Math.PI / 2)) * 29 +
          Math.sin((9 / 10) * (Math.PI / 2)) * 9,
      ) as unknown,
      crossed: expect.closeTo(
        Math.cos((5 / 10) * (Math.PI / 2)) * 25 +
          Math.sin((5 / 10) * (Math.PI / 2)) * 5,
      ) as unknown,
    });
  });
});

describe("wav", () => {
  it("writes a 16-bit PCM WAV at the sample rate, mono or stereo", () => {
    const mono = wav(signal(0, 0.5));
    const stereo = wav([signal(0.5), signal(-0.5)]);

    expect(
      [mono, stereo].map((file) => ({
        riff: file.toString("ascii", 0, 4),
        channels: file.readUInt16LE(22),
        rate: file.readUInt32LE(24),
        bits: file.readUInt16LE(34),
        data: file.readUInt32LE(40),
      })),
    ).toEqual([
      { riff: "RIFF", channels: 1, rate: SR, bits: 16, data: 4 },
      { riff: "RIFF", channels: 2, rate: SR, bits: 16, data: 4 },
    ]);
  });

  it("reads back what it wrote, each channel within the dither", () => {
    const left = osc("sine", 1000, 0.01);
    const right = gain(left, -0.5);

    const read2 = wavSamples(wav([left, right]));

    expect(
      read2.map((channel, c) =>
        Math.max(
          ...channel.map((v, i) =>
            Math.abs(v - ((c === 0 ? left : right)[i] ?? 0)),
          ),
        ),
      ),
    ).toEqual([
      expect.toSatisfy((d: number) => d < 3 / 32768) as unknown,
      expect.toSatisfy((d: number) => d < 3 / 32768) as unknown,
    ]);
  });

  it("pads a shorter channel with silence, as long as the longest", () => {
    const [, right] = wavSamples(wav([signal(0.5, 0.5), signal(0.5)]));

    expect({
      length: right?.length,
      padded: Math.abs(right?.[1] ?? 1) <= 1 / 32768,
    }).toEqual({ length: 2, padded: true });
  });

  it("writes the same bytes from the same seed, and other dither from another", () => {
    const x = osc("sine", 1000, 0.01);

    expect({
      same: wav(x).equals(wav(x)),
      other: wav(x).equals(wav(x, 8)),
    }).toEqual({ same: true, other: false });
  });

  it("clips what passes full scale", () => {
    expect([...(wavSamples(wav(signal(2, -2)))[0] ?? [])]).toEqual([
      32767 / 32768,
      -32767 / 32768,
    ]);
  });
});
