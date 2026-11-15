import {
  between,
  clank,
  crack,
  crackle,
  grit,
  knock,
  near,
  rubble,
  slivers,
  thump,
} from "./synth_impacts.ts";
import { amplitudeAt, measure } from "./synth_measure.ts";
import { samples, seeded } from "./synth_signal.ts";

/** Returns a random source that draws the numbers given, in turn. */
function drawing(...numbers: number[]): () => number {
  let next = 0;
  return () => numbers[next++] ?? 0;
}

/** Returns whether two signals hold the same samples. */
function same(a: Float64Array, b: Float64Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

describe("near and between", () => {
  it("draws a number near 1, off by up to a share either way", () => {
    expect([
      near(drawing(0), 0.1),
      near(drawing(0.5), 0.1),
      near(drawing(1), 0.1),
    ]).toEqual([0.9, 1, 1.1]);
  });

  it("draws a number between two by ratio, their geometric middle halfway", () => {
    expect([
      between(drawing(0), 100, 400),
      between(drawing(0.5), 100, 400),
      between(drawing(1), 100, 400),
    ]).toEqual([100, 200, 400]);
  });
});

describe("crack", () => {
  it("is a few milliseconds of noise reaching up into the air", () => {
    const snapped = crack({ seed: 1 });

    const m = measure(snapped);

    expect({
      short: m.seconds < 0.012,
      bright: m.bands.high + m.bands.air,
    }).toEqual({
      short: true,
      bright: expect.toSatisfy((v: number) => v > 0.9) as unknown,
    });
  });

  it("runs its snaps over its time, and one snap alone is shorter", () => {
    const many = crack({ seed: 1, snaps: 4, over: 0.02 });
    const one = crack({ seed: 1, snaps: 1 });

    expect(many.length).toBeGreaterThan(one.length + samples(0.01));
  });

  it("is the same from a seed, and another from another", () => {
    expect({
      again: same(crack({ seed: 1 }), crack({ seed: 1 })),
      other: same(crack({ seed: 1 }), crack({ seed: 2 })),
    }).toEqual({ again: true, other: false });
  });
});

describe("knock", () => {
  it("lasts a quarter past its decay and comes in over a millisecond", () => {
    const knocked = knock({ freq: 345, decay: 0.1, seed: 1 });

    expect({ length: knocked.length, start: knocked[0] }).toEqual({
      length: samples(0.125),
      start: 0,
    });
  });

  it("says by its lowest mode how big the lump is", () => {
    const large = measure(knock({ freq: 200, decay: 0.1, seed: 1 }));
    const small = measure(knock({ freq: 800, decay: 0.1, seed: 1 }));

    expect(small.centroid).toBeGreaterThan(large.centroid * 2);
  });

  it("keeps its upper modes louder with less tilt, as a large lump's carry it", () => {
    const tilted = knock({ freq: 300, decay: 0.2, seed: 1, tilt: 2 });
    const flat = knock({ freq: 300, decay: 0.2, seed: 1, tilt: 0 });

    expect(measure(flat).centroid).toBeGreaterThan(measure(tilted).centroid);
  });
});

describe("thump", () => {
  it("falls from its pitch to another, and dies over its decay", () => {
    const thumped = thump({ from: 400, to: 100, over: 0.1, decay: 0.3 });
    const early = thumped.subarray(0, samples(0.02));
    const late = thumped.subarray(samples(0.15), samples(0.2));

    expect({
      length: thumped.length,
      early: amplitudeAt(early, 400) > amplitudeAt(early, 100),
      late: amplitudeAt(late, 100) > amplitudeAt(late, 400),
    }).toEqual({ length: samples(0.33), early: true, late: true });
  });

  it("speaks higher the harder it is driven", () => {
    const soft = measure(
      thump({ from: 120, to: 60, over: 0.1, decay: 0.3, hard: 1 }),
    );
    const hard = measure(
      thump({ from: 120, to: 60, over: 0.1, decay: 0.3, hard: 8 }),
    );

    expect(hard.phone).toBeGreaterThan(soft.phone);
  });
});

describe("grit", () => {
  it("lies in its band at full scale, faded out at its end", () => {
    const ground = grit({ seconds: 0.25, seed: 1, low: 1000, high: 5000 });

    const m = measure(ground);

    expect({
      length: ground.length,
      peak: m.peak,
      centroid: m.centroid > 1000 && m.centroid < 6000,
      end: Math.abs(ground.at(-1) ?? 1),
    }).toEqual({
      length: samples(0.25),
      peak: expect.closeTo(0, 6) as unknown,
      centroid: true,
      end: 0,
    });
  });
});

describe("rubble", () => {
  it("falls over its time in its band, its grains over its grit", () => {
    const fallen = rubble({
      count: 18,
      seconds: 0.25,
      seed: 1,
      low: 1000,
      high: 5000,
    });

    const m = measure(fallen);

    expect({
      long: fallen.length >= samples(0.25),
      centroid: m.centroid > 1000 && m.centroid < 6000,
    }).toEqual({ long: true, centroid: true });
  });

  it("knocks pebbles rather than hisses as told, which ring lower", () => {
    const pebbles = rubble({
      count: 12,
      seconds: 0.2,
      seed: 1,
      low: 2000,
      high: 4000,
      pebbles: 1,
      bed: 0,
    });
    const hiss = rubble({
      count: 12,
      seconds: 0.2,
      seed: 1,
      low: 2000,
      high: 4000,
      pebbles: 0,
      bed: 0,
    });

    expect(measure(pebbles).centroid).toBeLessThan(measure(hiss).centroid);
  });
});

describe("slivers", () => {
  it("tinkles in its band over its time, thinning out", () => {
    const shards = slivers({
      count: 20,
      seconds: 0.25,
      seed: 1,
      low: 3000,
      high: 6000,
    });

    const m = measure(shards);
    const half = Math.round(shards.length / 2);

    expect({
      centroid: m.centroid > 3000 && m.centroid < 12000,
      thinning:
        measure(shards.subarray(0, half)).rms50 >
        measure(shards.subarray(half)).rms50,
    }).toEqual({ centroid: true, thinning: true });
  });
});

describe("crackle", () => {
  it("spits specks of bright noise, the last fainter than the first", () => {
    const specks = crackle({ count: 30, seconds: 0.3, seed: 1, fade: 0.9 });

    const m = measure(specks);
    const half = Math.round(specks.length / 2);

    expect({
      bright: m.bands.high + m.bands.air > 0.9,
      fading:
        measure(specks.subarray(0, half)).rms50 >
        measure(specks.subarray(half)).rms50,
    }).toEqual({ bright: true, fading: true });
  });
});

describe("clank", () => {
  it("rings on over its ring, at full scale under its strike", () => {
    const clanked = clank({ freq: 800, ring: 0.5, seed: 1 });

    const m = measure(clanked);

    expect({ length: clanked.length, active: m.active > 0.4 }).toEqual({
      length: samples(0.6),
      active: true,
    });
  });

  it("rings its lump's partials as its weights say", () => {
    const low = clank({
      freq: 800,
      ring: 0.5,
      seed: 1,
      weights: [1, 0, 0, 0, 0, 0, 0, 0],
    });
    const high = clank({
      freq: 800,
      ring: 0.5,
      seed: 1,
      weights: [0, 0, 0, 0, 0, 0, 0, 1],
    });

    expect(measure(low).centroid).toBeLessThan(measure(high).centroid);
  });

  it("keeps one lump's tuning however it is struck", () => {
    // The lump's lowest partial, where its tuning puts it.
    const lowest = 800 * near(seeded(9), 0.012);

    const struck = [1, 2].map((seed) =>
      clank({ freq: 800, ring: 0.5, seed, lump: 9, strike: 0 }),
    );

    expect(
      struck.map((x) => amplitudeAt(x, lowest) / amplitudeAt(x, lowest + 15)),
    ).toEqual([
      expect.toSatisfy((ratio: number) => ratio > 5) as unknown,
      expect.toSatisfy((ratio: number) => ratio > 5) as unknown,
    ]);
  });

  it("strikes louder against its ring as told", () => {
    const soft = clank({ freq: 800, ring: 0.5, seed: 1, strike: 0.2 });
    const hard = clank({ freq: 800, ring: 0.5, seed: 1, strike: 2 });

    expect(measure(hard).crest).toBeGreaterThan(measure(soft).crest);
  });
});
