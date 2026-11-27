import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type RunProgram,
  SAMPLE_RATE,
  type Sound,
  type SpriteToEncode,
  arpeggio,
  encodeSprite,
  fakeFfmpeg,
  envelope,
  glide,
  looped,
  missingFfmpeg,
  note,
  packSoundSprite,
  renderSoundSprite,
  spritemapOf,
  takeNames,
  thud,
  withBurst,
  writeSoundSprite,
} from "./sounds.ts";

/** A tenth of a second of a steady tone, at half strength. */
const BEEP: Sound = {
  name: "beep",
  seconds: 0.1,
  peak: 0.5,
  sample: glide(440, 440, 1),
};

/** Two tenths of a second of a thud, at full strength. */
const KNOCK: Sound = {
  name: "knock",
  seconds: 0.2,
  peak: 1,
  sample: thud(7),
};

/** A tenth of a second of a steady level, at half strength, which the game loops. */
const HUM: Sound = {
  name: "hum",
  seconds: 0.1,
  peak: 0.5,
  sample: () => 1,
  loop: true,
};

/** Returns a WAV file's samples, from -1 to 1. */
function samplesOf(wav: Buffer): number[] {
  const samples: number[] = [];
  for (let at = 44; at < wav.length; at += 2) {
    samples.push(wav.readInt16LE(at) / 32767);
  }
  return samples;
}

describe("glide", () => {
  it("holds a pitch that doesn't glide", () => {
    const wave = glide(100, 100, 1);

    // A quarter of a 100 Hz cycle is at its crest.
    expect(wave(0.0025)).toBeCloseTo(1);
  });

  it("reaches the pitch it glides to, then holds it", () => {
    const wave = glide(100, 200, 0.5);
    const cyclesAtEnd = (100 * 0.5 * (2 - 1)) / Math.log(2);

    // A quarter of a 200 Hz cycle past the glide's end.
    const t = 0.5 + (Math.ceil(cyclesAtEnd) - cyclesAtEnd + 0.25) / 200;
    expect(wave(t)).toBeCloseTo(1);
  });

  it("adds its second harmonic for brightness", () => {
    const plain = glide(100, 100, 1);
    const bright = glide(100, 100, 1, 0.5);

    // A twentieth of a cycle in, where the second harmonic (sin 0.2π) and
    // the third (sin 0.3π) differ.
    const cycles = 0.05;

    expect(bright(cycles / 100) - plain(cycles / 100)).toBeCloseTo(
      0.5 * Math.sin(2 * 2 * Math.PI * cycles),
    );
  });
});

describe("envelope", () => {
  it("is silent before it starts", () => {
    expect(envelope(0.01, 0.1)(-0.1)).toBe(0);
  });

  it("rises over its attack", () => {
    const shape = envelope(0.01, 1000);

    expect(shape(0.005)).toBeCloseTo(0.5);
  });

  it("falls to about a third every decay", () => {
    const shape = envelope(0.001, 0.1);

    expect(shape(0.2) / shape(0.1)).toBeCloseTo(Math.exp(-1));
  });
});

describe("thud", () => {
  it("is the same noise from the same seed", () => {
    const first = thud(3);
    const second = thud(3);

    expect([0, 1, 2].map((i) => first(i / SAMPLE_RATE))).toEqual(
      [0, 1, 2].map((i) => second(i / SAMPLE_RATE)),
    );
  });

  it("is the same at a time however often, and in whatever order, it is read", () => {
    const noise = thud(3);
    const later = noise(0.01);

    const again = [noise(0.02), noise(0.01)];

    expect(again[1]).toBe(later);
  });

  it("stays within -1 and 1", () => {
    const noise = thud(11);

    const samples = Array.from({ length: 1000 }, (_, i) =>
      noise(i / SAMPLE_RATE),
    );

    expect(samples.every((s) => s >= -1 && s <= 1)).toBe(true);
  });
});

describe("note", () => {
  it("is silent until it starts", () => {
    const played = note(
      0.5,
      () => 1,
      () => 1,
    );

    expect(played(0.4)).toBe(0);
  });

  it("plays its tone in its shape, from its own start", () => {
    const played = note(
      0.5,
      (t) => t,
      () => 0.25,
    );

    expect(played(0.6)).toBeCloseTo(0.1 * 0.25);
  });
});

describe("withBurst", () => {
  it("plays its tone under its seed's noise, which rises over 1 ms", () => {
    const noise = thud(7);

    const knock = withBurst((t) => t, 7, 0.1, 1);

    expect(knock(0.0005)).toBeCloseTo(
      0.0005 + 0.5 * Math.exp(-0.005) * noise(0.0005),
      12,
    );
  });

  it("fades the noise to about a third every decay, scaled by its loudness, not the tone", () => {
    const noise = thud(11);

    const blast = withBurst(() => 0.25, 11, 0.1, 2);

    expect(blast(0.1)).toBeCloseTo(0.25 + 2 * Math.exp(-1) * noise(0.1), 12);
  });
});

describe("looped", () => {
  it("starts as the wave's next stretch, and ends as the wave, so it runs on unbroken", () => {
    const noise = thud(3);
    const hum = looped(noise, 0.5);

    expect(hum(0)).toBe(noise(0.5));
    expect(hum(0.5)).toBeCloseTo(noise(0.5), 12);
  });

  it("fades the one into the other at an even loudness", () => {
    const noise = thud(3);
    const hum = looped(noise, 0.5);

    expect(hum(0.125)).toBeCloseTo(
      Math.cos(Math.PI / 8) * noise(0.625) +
        Math.sin(Math.PI / 8) * noise(0.125),
    );
  });
});

// Each time read is a whole number of eighths of a cycle into every note
// sounding, where its sine and its harmonic's are round numbers.
describe("arpeggio", () => {
  it("raises a note over its first 5 ms", () => {
    const chord = arpeggio([100], 0.5, 0.1);

    expect(chord(0.0025)).toBeCloseTo(0.5 * Math.exp(-0.025), 6);
  });

  it("plays its first note alone, with a quarter of its second harmonic, until the next is struck", () => {
    const chord = arpeggio([100, 200], 0.5, 0.1);

    expect(chord(0.30125)).toBeCloseTo(
      (Math.SQRT1_2 + 0.25) * Math.exp(-3.0125),
      6,
    );
  });

  it("strikes the next note gap seconds later, at its own pitch", () => {
    const chord = arpeggio([100, 200], 0.5, 0.1);

    const first = (0.25 - Math.SQRT1_2) * Math.exp(-5.0625);
    const second = Math.exp(-0.0625);

    expect(chord(0.50625)).toBeCloseTo(first + second, 6);
  });

  it("strikes each later note gap seconds after the one before, at its own pitch", () => {
    const chord = arpeggio([100, 200, 600], 0.5, 0.1);

    const first = (0.25 - Math.SQRT1_2) * Math.exp(-10.0625);
    const second = Math.exp(-5.0625);
    const third = -Math.exp(-0.0625);

    expect(chord(1.00625)).toBeCloseTo(first + second + third, 6);
  });
});

describe("renderSoundSprite", () => {
  it("writes a mono 16-bit WAV at the sample rate", () => {
    const { wav } = renderSoundSprite([BEEP]);

    expect({
      riff: wav.toString("ascii", 0, 4),
      wave: wav.toString("ascii", 8, 12),
      channels: wav.readUInt16LE(22),
      rate: wav.readUInt32LE(24),
      bits: wav.readUInt16LE(34),
      data: wav.readUInt32LE(40),
    }).toEqual({
      riff: "RIFF",
      wave: "WAVE",
      channels: 1,
      rate: SAMPLE_RATE,
      bits: 16,
      // A tenth of a second: 1,600 samples of 2 bytes.
      data: 3200,
    });
  });

  it("maps each sound where it lies, with a tenth of a second between", () => {
    const { json, seconds } = renderSoundSprite([BEEP, KNOCK]);

    expect({ map: JSON.parse(json) as unknown, seconds }).toEqual({
      map: {
        spritemap: {
          beep: { start: 0, end: 0.1, loop: false },
          knock: { start: 0.2, end: 0.4, loop: false },
        },
      },
      seconds: 0.4,
    });
  });

  it("scales each sound to its peak", () => {
    const { wav } = renderSoundSprite([BEEP]);

    const loudest = Math.max(...samplesOf(wav).map(Math.abs));

    expect(loudest).toBeCloseTo(0.5, 2);
  });

  it("fades each sound out, so it ends in silence", () => {
    const { wav } = renderSoundSprite([BEEP]);

    expect(samplesOf(wav).at(-1)).toBe(0);
  });

  it("leaves a sound that loops unfaded, so it ends as loud as it goes on", () => {
    const { wav } = renderSoundSprite([HUM]);

    expect(samplesOf(wav).at(-1)).toBeCloseTo(0.5, 3);
  });

  it("maps a sound that loops as looping", () => {
    const { json } = renderSoundSprite([HUM]);

    expect(JSON.parse(json)).toEqual({
      spritemap: { hum: { start: 0, end: 0.1, loop: true } },
    });
  });

  it("renders the same bytes every time", () => {
    const first = renderSoundSprite([BEEP, KNOCK]);

    const second = renderSoundSprite([BEEP, KNOCK]);

    expect(first.wav.equals(second.wav)).toBe(true);
  });

  it("refuses no sounds", () => {
    expect(() => renderSoundSprite([])).toThrow("A sprite needs a sound.");
  });

  it("takes a sound named as a member every object inherits", () => {
    const { json } = renderSoundSprite([{ ...BEEP, name: "toString" }]);

    expect(
      Object.keys((JSON.parse(json) as { spritemap: object }).spritemap),
    ).toEqual(["toString"]);
  });

  it("refuses two sounds of one name", () => {
    expect(() => renderSoundSprite([BEEP, { ...KNOCK, name: "beep" }])).toThrow(
      'Two sounds are named "beep".',
    );
  });

  it.each([
    ["silent", (): number => 0],
    ["not a number", (): number => Number.NaN],
  ])("refuses a sound that is %s", (_, sample) => {
    expect(() =>
      renderSoundSprite([{ ...BEEP, name: "hush", sample }]),
    ).toThrow('The sound "hush" is silent or not a number.');
  });
});

describe("takeNames", () => {
  it("names one take as its sound, and each of more by its number from 1", () => {
    expect([takeNames("ping", 1), takeNames("shot", 3)]).toEqual([
      ["ping"],
      ["shot-1", "shot-2", "shot-3"],
    ]);
  });
});

describe("packSoundSprite", () => {
  /** Returns a take of a steady level, as many samples long as given. */
  function take(length: number, level = 0.5): Float64Array {
    return new Float64Array(length).fill(level);
  }

  /** Packs at a sample a millisecond, a gap of 2 and no fade, to a millisecond. */
  const MILLIS = { sampleRate: 1000, gap: 0.002, fade: 0, places: 3 };

  it("lays each take a gap after the one before, named by its number", () => {
    const sprite = packSoundSprite(
      [
        { name: "shot", takes: [take(3), take(4)] },
        { name: "hum", takes: [take(2)], loop: true },
      ],
      MILLIS,
    );

    expect({ map: sprite.spritemap, seconds: sprite.seconds }).toEqual({
      map: {
        "shot-1": { start: 0, end: 0.003, loop: false },
        "shot-2": { start: 0.005, end: 0.009, loop: false },
        hum: { start: 0.011, end: 0.013, loop: true },
      },
      seconds: 0.013,
    });
  });

  it("writes each take's samples where its map lays it, the gaps silent", () => {
    const sprite = packSoundSprite(
      [{ name: "shot", takes: [take(2, 0.25), take(1, -0.5)] }],
      MILLIS,
    );

    expect([...sprite.samples]).toEqual([0.25, 0.25, 0, 0, -0.5]);
  });

  it("keeps the map's times to as many places as told", () => {
    const sprite = packSoundSprite([{ name: "a", takes: [take(1250)] }], {
      ...MILLIS,
      sampleRate: 44100,
      places: 4,
    });

    expect(sprite.spritemap["a"]?.end).toBe(0.0283);
  });

  it("fades each take out over its fade but a looping one's", () => {
    const sprite = packSoundSprite(
      [
        { name: "once", takes: [take(4, 1)] },
        { name: "hum", takes: [take(4, 1)], loop: true },
      ],
      { ...MILLIS, gap: 0, fade: 0.002 },
    );

    expect([...sprite.samples]).toEqual([1, 1, 0.5, 0, 1, 1, 1, 1]);
  });

  it("writes the map's JSON as Phaser takes it", () => {
    const sprite = packSoundSprite([{ name: "a", takes: [take(2)] }], MILLIS);

    expect(JSON.parse(sprite.json)).toEqual({ spritemap: sprite.spritemap });
  });

  it("leaves the takes it is handed as they were", () => {
    const given = take(4, 1);

    packSoundSprite([{ name: "a", takes: [given] }], {
      fade: 0.002,
      sampleRate: 1000,
    });

    expect([...given]).toEqual([1, 1, 1, 1]);
  });

  it("refuses a sound with no take", () => {
    expect(() => packSoundSprite([{ name: "hush", takes: [] }])).toThrow(
      'The sound "hush" has no take.',
    );
  });

  it("refuses two takes of one name", () => {
    expect(() =>
      packSoundSprite([
        { name: "shot", takes: [take(1), take(1)] },
        { name: "shot-2", takes: [take(1)] },
      ]),
    ).toThrow('Two sounds are named "shot-2".');
  });
});

describe("spritemapOf", () => {
  it("lays the takes out from their lengths alone, as the sprite packs them", () => {
    const takes = [new Float64Array(30), new Float64Array(41)];

    const map = spritemapOf([
      { name: "shot", lengths: takes.map(({ length }) => length) },
      { name: "hum", lengths: [7], loop: true },
    ]);

    expect(map).toEqual(
      packSoundSprite([
        { name: "shot", takes },
        { name: "hum", takes: [new Float64Array(7)], loop: true },
      ]).spritemap,
    );
  });

  it("refuses no sounds", () => {
    expect(() => spritemapOf([])).toThrow("A sprite needs a sound.");
  });
});

describe("writeSoundSprite", () => {
  let folder = "";

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), "fz-sounds-"));
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it("writes the sprite and its map into a folder it makes", async () => {
    const into = join(folder, "sounds");

    const sprite = await writeSoundSprite([BEEP], into);

    const [wav, json] = await Promise.all([
      readFile(join(into, "sounds.wav")),
      readFile(join(into, "sounds.json"), "utf8"),
    ]);
    expect({ wav: wav.equals(sprite.wav), json }).toEqual({
      wav: true,
      json: sprite.json,
    });
  });
});

describe("fakeFfmpeg", () => {
  it("fails, as ffmpeg does, a command line that names no file to write", async () => {
    const run = fakeFfmpeg("ffmpeg", []);

    await expect(run).rejects.toThrow("ffmpeg was handed no file to write.");
  });
});

describe("encodeSprite", () => {
  let folder = "";

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), "fz-encode-"));
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  /** Returns a sprite and a bed in the spec's folder, the sprite's map to ship alongside, shipped into a game's folder from a staging one. */
  function spriteToEncode(): SpriteToEncode {
    return {
      wav: join(folder, "wav", "sprite.wav"),
      beds: [join(folder, "wav", "beds", "hum.wav")],
      alongside: { "sprite.json": "{}\n" },
      into: join(folder, "game"),
      staging: join(folder, "encoded"),
    };
  }

  /** Returns the text of a file a sprite shipped, which {@link fakeFfmpeg} writes as the command line that made it. */
  function shippedText(sprite: SpriteToEncode, file: string): Promise<string> {
    return readFile(join(sprite.into, file), "utf8");
  }

  /** Returns how every ffmpeg command line encoding a WAV starts: quiet, bit-exact and with no metadata. */
  function quietlyFrom(wav: string): string {
    return `ffmpeg -hide_banner -loglevel error -y -i ${wav} -map_metadata -1 -fflags +bitexact -flags:a +bitexact`;
  }

  /** Returns the files in a folder and its folders, by their paths from it, in order. */
  async function filesIn(at: string): Promise<string[]> {
    const entries = await readdir(at, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(at.length + 1))
      .sort();
  }

  it("ships the sprite and each bed as Ogg and M4A, named for their WAVs, with the files alongside", async () => {
    const sprite = spriteToEncode();

    const shipped = await encodeSprite(sprite, fakeFfmpeg);

    expect({ shipped, game: await filesIn(sprite.into) }).toEqual({
      shipped: true,
      game: [
        "beds/hum.m4a",
        "beds/hum.ogg",
        "sprite.json",
        "sprite.m4a",
        "sprite.ogg",
      ],
    });
  });

  it("encodes bit-exact, with no metadata: the sprite at Vorbis's quality 5 and AAC's 96 kb/s, a bed at 4 and 128 kb/s", async () => {
    const sprite = spriteToEncode();
    const [bed = ""] = sprite.beds;

    await encodeSprite(sprite, fakeFfmpeg);

    expect({
      ogg: await shippedText(sprite, "sprite.ogg"),
      m4a: await shippedText(sprite, "sprite.m4a"),
      bedOgg: await shippedText(sprite, "beds/hum.ogg"),
      bedM4a: await shippedText(sprite, "beds/hum.m4a"),
    }).toEqual({
      ogg: `${quietlyFrom(sprite.wav)} -c:a libvorbis -q:a 5 ${join(sprite.staging, "sprite.ogg")}`,
      m4a: `${quietlyFrom(sprite.wav)} -c:a aac -b:a 96k -movflags +faststart ${join(sprite.staging, "sprite.m4a")}`,
      bedOgg: `${quietlyFrom(bed)} -c:a libvorbis -q:a 4 ${join(sprite.staging, "beds", "hum.ogg")}`,
      bedM4a: `${quietlyFrom(bed)} -c:a aac -b:a 128k -movflags +faststart ${join(sprite.staging, "beds", "hum.m4a")}`,
    });
  });

  it("encodes the sprite at the encoding it gives, and a bed as before", async () => {
    const sprite = {
      ...spriteToEncode(),
      encoding: { vorbis: 3, aac: "72k" },
    };
    const [bed = ""] = sprite.beds;

    await encodeSprite(sprite, fakeFfmpeg);

    expect({
      ogg: await shippedText(sprite, "sprite.ogg"),
      m4a: await shippedText(sprite, "sprite.m4a"),
      bedOgg: await shippedText(sprite, "beds/hum.ogg"),
      bedM4a: await shippedText(sprite, "beds/hum.m4a"),
    }).toEqual({
      ogg: `${quietlyFrom(sprite.wav)} -c:a libvorbis -q:a 3 ${join(sprite.staging, "sprite.ogg")}`,
      m4a: `${quietlyFrom(sprite.wav)} -c:a aac -b:a 72k -movflags +faststart ${join(sprite.staging, "sprite.m4a")}`,
      bedOgg: `${quietlyFrom(bed)} -c:a libvorbis -q:a 4 ${join(sprite.staging, "beds", "hum.ogg")}`,
      bedM4a: `${quietlyFrom(bed)} -c:a aac -b:a 128k -movflags +faststart ${join(sprite.staging, "beds", "hum.m4a")}`,
    });
  });

  it("ships nothing, and says so, where ffmpeg can't be run", async () => {
    const sprite = spriteToEncode();

    const shipped = await encodeSprite(sprite, missingFfmpeg);

    expect({ shipped, made: await readdir(folder) }).toEqual({
      shipped: false,
      made: [],
    });
  });

  it("ships none of them where an encode fails", async () => {
    const sprite = spriteToEncode();
    const failing: RunProgram = (program, args) =>
      args.includes(sprite.beds[0] ?? "")
        ? Promise.reject(new Error("This ffmpeg has no Vorbis."))
        : fakeFfmpeg(program, args);

    const failed = await encodeSprite(sprite, failing).catch(String);

    expect({ failed, made: await readdir(folder) }).toEqual({
      failed: "Error: This ffmpeg has no Vorbis.",
      made: ["encoded"],
    });
  });

  it("empties the staging folder first, so nothing left there ships", async () => {
    const sprite = spriteToEncode();
    await mkdir(sprite.staging, { recursive: true });
    await writeFile(join(sprite.staging, "stale.ogg"), "stale");

    await encodeSprite(sprite, fakeFfmpeg);

    expect(await filesIn(sprite.into)).not.toContain("stale.ogg");
  });
});
