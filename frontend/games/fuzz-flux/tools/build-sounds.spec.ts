import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordingPrinter } from "@fz/dev/script";
import {
  SR,
  type Signal,
  loudness,
  measure,
  osc,
  spectrum,
  wav,
} from "@fz/dev/synth";
import { designText } from "../src/testing/design_files";
import { SOUNDS } from "../src/view/effects/sounds";
import { RECIPES, type Recipe, finished, run } from "./build-sounds.mjs";

/** Describes a sound as the design's table of measures gives it. */
interface Measures {
  /** Its length, in milliseconds. */
  readonly ms: number;
  /** Its loudest sample, in dB below full scale. */
  readonly peak: number;
  /** Its level over its whole length, in dB below full scale. */
  readonly average: number;
  /** Where its energy centers, in Hz. */
  readonly centroid: number;
}

/** The design's measures of its sounds, by name, from its table. */
const DESIGN: ReadonlyMap<string, Measures> = new Map(
  designText("sound/measures.md")
    .split("\n")
    .flatMap((line) => {
      const row =
        /^\| `([\w-]+)` \|[^|]+\| (\d+) \| (-?[\d.]+) \| (-?[\d.]+) \| (\d+) \|$/.exec(
          line,
        );
      if (row === null) return [];
      const [, name = "", ms, peak, average, centroid] = row;
      return [
        [
          name,
          {
            ms: Number(ms),
            peak: Number(peak),
            average: Number(average),
            centroid: Number(centroid),
          },
        ],
      ];
    }),
);

/** How long each frame a sound's spectrum is read over is, in samples, as the design read its sounds. */
const FRAME = 1024;

/** How far apart the frames start, in samples. */
const HOP = 256;

/**
 * Returns a sound's power at each frequency up to half the sample rate,
 * summed over Hann-windowed frames from its start, as the design's table was
 * read, so its numbers mean the same.
 */
function powerOf(x: Signal): Float64Array {
  const power = new Float64Array(FRAME / 2);
  const frame = new Float64Array(FRAME);
  for (let start = 0; start + 64 < x.length; start += HOP) {
    for (let i = 0; i < FRAME; i++) {
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));
      frame[i] = (x[start + i] ?? 0) * window;
    }
    spectrum(frame).forEach((magnitude, bin) => {
      power[bin] = (power[bin] ?? 0) + magnitude ** 2;
    });
  }
  return power;
}

/** Returns the frequency of a bin of {@link powerOf}'s, in Hz. */
function frequencyOf(bin: number): number {
  return (bin * SR) / FRAME;
}

/** Returns the sum of some numbers. */
function sum(values: Iterable<number>): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

/** Describes a recipe's sound as the spec measures it, beside the design's measures of it. */
interface Measured extends Measures {
  readonly name: string;
  /** The share of its energy above 6 kHz, from 0 to 1. */
  readonly aboveSixKhz: number;
  readonly design: Measures;
}

/** Returns a recipe's sound measured, with the design's measures of it, or throws for one the design has none of. */
function measured(recipe: Recipe): Measured {
  const design = DESIGN.get(recipe.name);
  if (design === undefined) {
    throw new Error(`The design measures no sound "${recipe.name}".`);
  }
  const x = finished(recipe);
  const power = powerOf(x);
  const all = sum(power);
  return {
    name: recipe.name,
    ms: (x.length / SR) * 1000,
    peak: loudness(x).peak,
    average: 10 * Math.log10(sum(x.map((v) => v ** 2)) / x.length),
    centroid: sum(power.map((p, bin) => p * frequencyOf(bin))) / all,
    aboveSixKhz: sum(power.filter((_, bin) => frequencyOf(bin) > 6000)) / all,
    design,
  };
}

/** Every recipe's sound, measured once for every case. */
const MEASURED = RECIPES.map(measured);

describe("the recipes", () => {
  it("are named by the view's sounds, in the order the sprite holds them", () => {
    expect(RECIPES.map(({ name }) => name)).toEqual(
      SOUNDS.slice(0, RECIPES.length),
    );
  });
});

describe("each sound, held to the design's measures", () => {
  it.each(MEASURED)(
    "$name lasts as long as the design's, within 10%",
    ({ ms, design }) => {
      expect(Math.abs(ms / design.ms - 1)).toBeLessThanOrEqual(0.1);
    },
  );

  it.each(MEASURED)(
    "$name peaks at the design's peak, within 1 dB",
    ({ peak, design }) => {
      expect(Math.abs(peak - design.peak)).toBeLessThanOrEqual(1);
    },
  );

  it.each(MEASURED)(
    "$name sits at the design's average level, within 1.5 dB",
    ({ average, design }) => {
      expect(Math.abs(average - design.average)).toBeLessThanOrEqual(1.5);
    },
  );

  it.each(MEASURED)(
    "$name centers its energy where the design's does, within 15%",
    ({ centroid, design }) => {
      expect(Math.abs(centroid / design.centroid - 1)).toBeLessThanOrEqual(
        0.15,
      );
    },
  );

  it.each(MEASURED)(
    "$name keeps nothing above 6 kHz: under 1% of its energy",
    ({ aboveSixKhz }) => {
      expect(aboveSixKhz).toBeLessThan(0.01);
    },
  );
});

describe("finished", () => {
  it("brings a sound to its peak, and keeps 12 ms of its tail once it has died away under -52 dB", () => {
    // A tone that falls 200 dB a second.
    const make = (): Signal =>
      osc("sine", 1000, 0.3).map((v, i) => v * 10 ** ((-10 * i) / SR));

    const x = finished({ name: "tone", peak: -6, make });

    const kept = Math.round(0.012 * SR);
    expect({
      peak: loudness(x).peak,
      lastOverTheFloor: loudness(x.subarray(-kept - 1, -kept)).peak >= -52,
      tail: loudness(x.subarray(-kept)).peak < -52,
    }).toEqual({
      peak: expect.closeTo(-6, 6) as unknown,
      lastOverTheFloor: true,
      tail: true,
    });
  });

  it("centers a sound and fades its ends in and out, so it never clicks", () => {
    // A tone off the middle, as loud at its end as at its start.
    const make = (): Signal => osc("sine", 1000, 1).map((v) => v + 0.5);

    const { edge, dc } = measure(finished({ name: "tone", peak: -6, make }));

    expect({ edge, offTheMiddle: Math.abs(dc) > 0.01 }).toEqual({
      edge: 0,
      offTheMiddle: false,
    });
  });
});

/** A short, low tone, which a spec builds in place of the game's sounds. */
const LOW: Recipe = {
  name: "low",
  peak: -10,
  make: () => osc("sine", 500, 0.05),
};

/** A shorter, higher tone. */
const HIGH: Recipe = {
  name: "high",
  peak: -20,
  make: () => osc("sine", 1500, 0.03),
};

describe("run", () => {
  let wavFolder = "";

  beforeEach(async () => {
    wavFolder = await mkdtemp(join(tmpdir(), "fuzz-flux-sounds-"));
  });

  afterEach(async () => {
    await rm(wavFolder, { recursive: true, force: true });
  });

  /** Runs the build over the spec's tones, into its folder. */
  async function build(args: readonly string[]) {
    const printer = recordingPrinter();
    const code = await run(args, {
      ...printer,
      recipes: [LOW, HIGH],
      wavFolder,
    });
    return { code, out: printer.out, err: printer.err };
  }

  it("writes each sound, finished, as a WAV named for it, and says so", async () => {
    const { code, out } = await build([]);

    const high = await readFile(join(wavFolder, "high.wav"));
    expect({
      code,
      out,
      wavs: (await readdir(wavFolder)).sort(),
      high: high.equals(wav(finished(HIGH))),
    }).toEqual({
      code: 0,
      out: [`Wrote 2 sounds to ${wavFolder}.`],
      wavs: ["high.wav", "low.wav"],
      high: true,
    });
  });

  it("prints the usage asked for and exits with 0, writing nothing", async () => {
    const { code, out } = await build(["--help"]);

    expect({
      code,
      usage: out.join("\n").startsWith("Usage: yarn build:sounds"),
      wavs: await readdir(wavFolder),
    }).toEqual({ code: 0, usage: true, wavs: [] });
  });

  it("prints what is wrong with a command line and the usage as an error, and exits with 2, writing nothing", async () => {
    const { code, err } = await build(["--only", "pop"]);

    expect({
      code,
      err: /^Unknown option '--only'[^]*\n\nUsage:/.test(err.join("\n")),
      wavs: await readdir(wavFolder),
    }).toEqual({ code: 2, err: true, wavs: [] });
  });
});
