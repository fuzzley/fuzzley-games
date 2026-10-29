import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SAMPLE_RATE,
  type Sound,
  envelope,
  glide,
  note,
  renderSoundSprite,
  thud,
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

    expect(bright(0.001) - plain(0.001)).toBeCloseTo(
      0.5 * Math.sin(2 * 2 * Math.PI * 0.1),
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

    expect([first(0), first(0), first(0)]).toEqual([
      second(0),
      second(0),
      second(0),
    ]);
  });

  it("stays within -1 and 1", () => {
    const noise = thud(11);

    const samples = Array.from({ length: 1000 }, () => noise(0));

    expect(samples.every((s) => s >= -1 && s <= 1)).toBe(true);
  });
});

describe("note", () => {
  it("is silent until it starts, then plays its tone in its shape", () => {
    const played = note(
      0.5,
      () => 2,
      () => 0.25,
    );

    expect([played(0.4), played(0.6)]).toEqual([0, 0.5]);
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
      data: wav.length - 44,
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

  it("renders the same bytes every time", () => {
    const sounds = (): Sound[] => [BEEP, { ...KNOCK, sample: thud(7) }];

    const first = renderSoundSprite(sounds());
    const second = renderSoundSprite(sounds());

    expect(first.wav.equals(second.wav)).toBe(true);
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
