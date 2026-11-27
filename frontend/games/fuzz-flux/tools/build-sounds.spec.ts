import { readFileSync, statSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordingPrinter } from "@fz/dev/script";
import { type RunProgram, fakeFfmpeg, missingFfmpeg } from "@fz/dev/sounds";
import {
  SR,
  type Signal,
  centsOf,
  loudness,
  measure,
  osc,
  spectrum,
  wav,
} from "@fz/dev/synth";
import shipped from "../src/scene/sounds/sprite.json";
import { designText } from "../src/testing/design_files";
import { LADDER_CENTS } from "../src/view/effects/ladder";
import { SOUNDS } from "../src/view/effects/sounds";
import {
  RECIPES,
  type Recipe,
  SPRITE_DIGEST,
  SPRITE_FOLDER,
  digestOf,
  finished,
  run,
  spriteOf,
} from "./build-sounds.mjs";
import { type DesignSound, designSounds } from "./sounds/measures.mjs";

/** Describes a sound by the measures the design's table gives it. */
type Measures = Omit<DesignSound, "when">;

/** The design's measures of its sounds, by name, from its table. */
const DESIGN = designSounds(designText("sound/measures.md"));

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

/** Describes a recipe's sound, finished. */
interface Finished {
  readonly recipe: Recipe;
  readonly x: Signal;
}

/** Every recipe's sound, finished once for every case. */
const FINISHED: readonly Finished[] = RECIPES.map((recipe) => ({
  recipe,
  x: finished(recipe),
}));

/** Returns a recipe's sound measured, with the design's measures of it, or throws for one the design has none of. */
function measured({ recipe, x }: Finished): Measured {
  const design = DESIGN.get(recipe.name);
  if (design === undefined) {
    throw new Error(`The design measures no sound "${recipe.name}".`);
  }
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
const MEASURED = FINISHED.map(measured);

/** The sprite the recipes make now. */
const SPRITE = spriteOf(
  FINISHED.map(({ recipe, x }) => ({ name: recipe.name, takes: [x] })),
);

/** The most a format of the sprite may weigh, in bytes. */
const SPRITE_BUDGET = 300 * 1024;

describe("the recipes", () => {
  it("are named by the view's sounds, in the order the sprite holds them", () => {
    expect(RECIPES.map(({ name }) => name)).toEqual(SOUNDS);
  });
});

describe("the ladder", () => {
  it("raises the sprite's notes, made at its foot, C5, by the steps of the key the recipes climb, to A6", () => {
    expect(LADDER_CENTS).toEqual(
      Array.from({ length: 10 }, (_, step) => centsOf(step)),
    );
  });
});

describe("the shipped sprite", () => {
  it("holds the view's sounds, by name, in their order", () => {
    expect(Object.keys(shipped.spritemap)).toEqual(SOUNDS);
  });

  it("lays each sound where the recipes lay it now, to the byte", () => {
    expect(SPRITE.packed.json).toBe(
      readFileSync(join(SPRITE_FOLDER, "sprite.json"), "utf8"),
    );
  });

  it("was encoded from the sprite the recipes make now: once a recipe changes, `yarn build:sounds` encodes it again", () => {
    expect(digestOf(SPRITE.wav)).toBe(
      readFileSync(join(SPRITE_FOLDER, SPRITE_DIGEST), "utf8"),
    );
  });

  it.each(["sprite.ogg", "sprite.m4a"])(
    "is encoded as %s, in 300 KB or less",
    (file) => {
      expect(statSync(join(SPRITE_FOLDER, file)).size).toBeLessThanOrEqual(
        SPRITE_BUDGET,
      );
    },
  );
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
  // How long a recipe's fade-out is, as it gives it, and in seconds.
  it.each([
    ["12 ms unless its recipe says", {}, 0.012],
    ["as long as its recipe's fade-out", { fadeOut: 0.05 }, 0.05],
  ] as const)(
    "brings a sound to its peak, and keeps %s of its tail once it has died away under -52 dB",
    (_, fading, seconds) => {
      // A tone that falls 200 dB a second.
      const make = (): Signal =>
        osc("sine", 1000, 0.3).map((v, i) => v * 10 ** ((-10 * i) / SR));

      const x = finished({ name: "tone", peak: -6, make, ...fading });

      const kept = Math.round(seconds * SR);
      expect({
        peak: loudness(x).peak,
        lastOverTheFloor: loudness(x.subarray(-kept - 1, -kept)).peak >= -52,
        tail: loudness(x.subarray(-kept)).peak < -52,
      }).toEqual({
        peak: expect.closeTo(-6, 6) as unknown,
        lastOverTheFloor: true,
        tail: true,
      });
    },
  );

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

describe("digestOf", () => {
  it("writes a file's SHA-256 as `sha256sum` does, for the sprite's WAV", () => {
    expect(digestOf(Buffer.alloc(0))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  sprite.wav\n",
    );
  });
});

describe("run", () => {
  let wavFolder = "";
  let spriteFolder = "";

  beforeEach(async () => {
    wavFolder = await mkdtemp(join(tmpdir(), "fuzz-flux-sounds-"));
    spriteFolder = await mkdtemp(join(tmpdir(), "fuzz-flux-sprite-"));
  });

  afterEach(async () => {
    await rm(wavFolder, { recursive: true, force: true });
    await rm(spriteFolder, { recursive: true, force: true });
  });

  /** Runs the build over the spec's tones, into its folders, with an ffmpeg that runs or none, as where it isn't on the path. */
  async function build(
    args: readonly string[],
    runFfmpeg: RunProgram = missingFfmpeg,
  ) {
    const printer = recordingPrinter();
    const code = await run(args, {
      ...printer,
      recipes: [LOW, HIGH],
      wavFolder,
      spriteFolder,
      runFfmpeg,
    });
    return { code, out: printer.out, err: printer.err };
  }

  it("writes each sound, finished, as a WAV named for it, and the sprite of them with its map, leaving the game's as it is without ffmpeg", async () => {
    const { code, out } = await build([]);

    const high = await readFile(join(wavFolder, "high.wav"));
    const spriteWav = await readFile(join(wavFolder, "sprite.wav"));
    expect({
      code,
      out,
      wavs: (await readdir(wavFolder)).sort(),
      high: high.equals(wav(finished(HIGH))),
      spriteBytes: spriteWav.length,
      map: Object.keys(
        (
          JSON.parse(
            await readFile(join(wavFolder, "sprite.json"), "utf8"),
          ) as { spritemap: object }
        ).spritemap,
      ),
      game: await readdir(spriteFolder),
    }).toEqual({
      code: 0,
      out: [
        `Wrote 2 sounds to ${wavFolder}.`,
        `The sprite: 0.2 s, in ${join(wavFolder, "sprite.wav")}.`,
        expect.stringContaining("ffmpeg isn't on the path") as unknown,
      ],
      wavs: ["high.wav", "low.wav", "sprite.json", "sprite.wav"],
      high: true,
      // The two tones, and a tenth of a second after each, the last's too.
      spriteBytes: 44 + 2 * (0.05 * SR + 0.1 * SR + 0.03 * SR + 0.1 * SR),
      map: ["low", "high"],
      game: [],
    });
  });

  it("encodes the sprite into the game's sounds with ffmpeg, AAC at 72 kb/s, its map and its WAV's digest beside it", async () => {
    const { code } = await build([], fakeFfmpeg);

    const spriteWav = await readFile(join(wavFolder, "sprite.wav"));
    const shippedText = (file: string): Promise<string> =>
      readFile(join(spriteFolder, file), "utf8");
    expect({
      code,
      game: (await readdir(spriteFolder)).sort(),
      m4a: await shippedText("sprite.m4a"),
      map: await shippedText("sprite.json"),
      digest: await shippedText(SPRITE_DIGEST),
    }).toEqual({
      code: 0,
      game: ["sprite.json", "sprite.m4a", "sprite.ogg", SPRITE_DIGEST],
      m4a: expect.stringContaining(" -b:a 72k ") as unknown,
      map: await readFile(join(wavFolder, "sprite.json"), "utf8"),
      digest: digestOf(spriteWav),
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
