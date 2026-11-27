// A game's sound effects, synthesized from a few oscillators and envelopes
// into one WAV sprite and the spritemap Phaser plays it by, the same bytes
// every run. A game's `tools/build-sounds.mjs` gives its recipes to
// writeSoundSprite(), which writes both files, or, where it renders its takes
// with `@fz/dev/synth`, packs them with packSoundSprite(), and ships the
// sprite as Ogg Vorbis and AAC with encodeSprite().

import { execFile } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";

/** A wave: its value at a time, in seconds. */
export type Wave = (t: number) => number;

/** Describes a sound to synthesize. */
export interface Sound {
  /** Names it in the spritemap, as the game plays it. */
  readonly name: string;
  /** How long it lasts, in seconds. */
  readonly seconds: number;
  /** How loud it is at its loudest, from 0 to 1. */
  readonly peak: number;
  /** Its wave, at any scale; it is scaled to its peak. */
  readonly sample: Wave;
  /**
   * Whether the game loops it, as a held key's hum: it is left unfaded, so
   * the loop runs on unbroken, and its wave should end as it starts, as
   * {@link looped} makes one.
   */
  readonly loop?: boolean;
}

/** Says where a sound lies in the sprite, in seconds, as Phaser reads it. */
export interface SpriteEntry {
  readonly start: number;
  readonly end: number;
  readonly loop: boolean;
}

/** Describes a sprite as rendered: its file and its map. */
export interface RenderedSprite {
  /** The WAV file, mono 16-bit PCM. */
  readonly wav: Buffer;
  /** The spritemap's JSON, as Phaser's `load.audioSprite()` takes it. */
  readonly json: string;
  /** How long the sprite lasts, in seconds. */
  readonly seconds: number;
}

/**
 * Describes how a sprite is packed, each as a sprite of this module's
 * sounds is unless given.
 */
export interface SpriteLayout {
  /** Samples a second, {@link SAMPLE_RATE} unless given. */
  readonly sampleRate?: number;
  /** The silence between two takes, in seconds, a tenth unless given. */
  readonly gap?: number;
  /** How long each take but a looping one fades out at its end, in seconds, 10 ms unless given, and none at 0. */
  readonly fade?: number;
  /** How many decimal places the map's times keep, 3 unless given. */
  readonly places?: number;
}

/** Describes a sound's takes, rendered, to pack into a sprite. */
export interface SpriteSound {
  /** Names it in the spritemap, or, where it has several takes, names each `<name>-<n>`, from 1. */
  readonly name: string;
  /** Its takes' samples, from -1 to 1, at the sprite's rate, in the order the sprite holds them. */
  readonly takes: readonly Float64Array[];
  /** Whether the game loops it, which leaves its takes unfaded. */
  readonly loop?: boolean;
}

/** Describes a sound's takes by their lengths alone, as a sprite lays them out. */
export interface SpriteLengths {
  /** Names it, as {@link SpriteSound} does. */
  readonly name: string;
  /** Each take's length, in samples. */
  readonly lengths: readonly number[];
  /** Whether the game loops it. */
  readonly loop?: boolean;
}

/** Describes a sprite as packed: its samples and its map. */
export interface PackedSprite {
  /** The samples of every take, in order, a gap apart, from -1 to 1. */
  readonly samples: Float64Array;
  /** Where each take lies, by its name, as Phaser reads it. */
  readonly spritemap: Readonly<Record<string, SpriteEntry>>;
  /** The spritemap's JSON, as Phaser's `load.audioSprite()` takes it. */
  readonly json: string;
  /** How long the sprite lasts, in seconds. */
  readonly seconds: number;
}

/** Samples a second: enough for a chime's harmonics, and a small file. */
export const SAMPLE_RATE = 16000;

/** The silence between two takes in the sprite, in seconds. */
const GAP_S = 0.1;

/** How long each take fades out at its end, so it never clicks. */
const FADE_S = 0.01;

/** How many decimal places the map's times keep: a millisecond's. */
const PLACES = 3;

/** How much of its second harmonic an arpeggio's note carries. */
const ARPEGGIO_BRIGHT = 0.25;

/** How long an arpeggio's note takes to rise, in seconds, so it never clicks. */
const ARPEGGIO_ATTACK_S = 0.005;

/** How long a burst of noise takes to rise, in seconds: at once, as a knock. */
const BURST_ATTACK_S = 0.001;

/**
 * Returns a tone that glides exponentially from one pitch to another, in
 * Hz, then holds, with a share of its second harmonic for brightness.
 */
export function glide(
  from: number,
  to: number,
  seconds: number,
  bright = 0,
): Wave {
  const ratio = to / from;
  return (t) => {
    // The phase of a pitch gliding exponentially, integrated in closed form.
    const u = Math.min(t, seconds) / seconds;
    const cycles =
      ratio === 1
        ? from * t
        : (from * seconds * (ratio ** u - 1)) / Math.log(ratio) +
          to * Math.max(0, t - seconds);
    const phase = 2 * Math.PI * cycles;
    return Math.sin(phase) + bright * Math.sin(2 * phase);
  };
}

/**
 * Returns an envelope: a rise over `attack` seconds, then an exponential
 * fall, to about a third every `decay` seconds.
 */
export function envelope(attack: number, decay: number): Wave {
  return (t) => (t < 0 ? 0 : Math.min(1, t / attack) * Math.exp(-t / decay));
}

/**
 * Returns noise from a seed, smoothed by a one-pole filter into a dull thud,
 * the same at a time however often it is read.
 */
export function thud(seed: number): Wave {
  let state = seed >>> 0;
  let last = 0;
  // Each sample follows from the one before, so they are made in order, as
  // far as a time asks, and kept.
  const made: number[] = [];
  return (t) => {
    const at = Math.max(0, Math.round(t * SAMPLE_RATE));
    while (made.length <= at) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      last += 0.25 * ((state / 2 ** 32) * 2 - 1 - last);
      made.push(last);
    }
    return made[at] ?? 0;
  };
}

/** Returns a tone shaped by an envelope, starting `at` seconds in. */
export function note(at: number, tone: Wave, shape: Wave): Wave {
  return (t) => (t < at ? 0 : tone(t - at) * shape(t - at));
}

/**
 * Returns a tone, which the caller shapes, under a burst of {@link thud}'s
 * noise from a seed, as a knock or a boom has: the noise struck at 0 s,
 * scaled by `loudness`, rising over 1 ms, then falling to about a third
 * every `decay` seconds.
 */
export function withBurst(
  tone: Wave,
  seed: number,
  decay: number,
  loudness: number,
): Wave {
  const burst = thud(seed);
  const shape = envelope(BURST_ATTACK_S, decay);
  return (t) => tone(t) + loudness * burst(t) * shape(t);
}

/**
 * Returns a wave of noise that runs on unbroken when played over and over
 * every `seconds`: the wave's next stretch fades into its first, at an even
 * loudness, so it ends just as it starts. A tone loops by running whole
 * cycles instead.
 */
export function looped(wave: Wave, seconds: number): Wave {
  return (t) => {
    // Equal-power weights, as the two stretches are unrelated noise.
    const into = ((t / seconds) * Math.PI) / 2;
    return Math.cos(into) * wave(t + seconds) + Math.sin(into) * wave(t);
  };
}

/**
 * Returns a chord struck one note at a time, `gap` seconds apart, each pitch
 * (in Hz) a tone, with a quarter of its second harmonic, that rises over
 * 5 ms, then falls to about a third every `decay` seconds.
 */
export function arpeggio(
  pitches: readonly number[],
  gap: number,
  decay: number,
): Wave {
  const notes = pitches.map((pitch, i) =>
    note(
      i * gap,
      glide(pitch, pitch, 1, ARPEGGIO_BRIGHT),
      envelope(ARPEGGIO_ATTACK_S, decay),
    ),
  );
  return (t) => notes.reduce((sum, played) => sum + played(t), 0);
}

/**
 * Returns a sound's samples, scaled to its peak, or throws for one that is
 * silent or not a number, which can't be scaled.
 */
function render(sound: Sound): Float64Array {
  const samples = new Float64Array(Math.round(sound.seconds * SAMPLE_RATE));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = sound.sample(i / SAMPLE_RATE);
  }
  const loudest = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
  if (!(loudest > 0 && Number.isFinite(loudest))) {
    throw new Error(`The sound "${sound.name}" is silent or not a number.`);
  }
  for (let i = 0; i < samples.length; i++) {
    samples[i] = ((samples[i] ?? 0) / loudest) * sound.peak;
  }
  return samples;
}

/** Returns a mono 16-bit PCM WAV file of samples from -1 to 1. */
function wav(samples: Float64Array): Buffer {
  const data = samples.length * 2;
  const file = Buffer.alloc(44 + data);
  file.write("RIFF", 0, "ascii");
  file.writeUInt32LE(36 + data, 4);
  file.write("WAVE", 8, "ascii");
  file.write("fmt ", 12, "ascii");
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(1, 22);
  file.writeUInt32LE(SAMPLE_RATE, 24);
  file.writeUInt32LE(SAMPLE_RATE * 2, 28);
  file.writeUInt16LE(2, 32);
  file.writeUInt16LE(16, 34);
  file.write("data", 36, "ascii");
  file.writeUInt32LE(data, 40);
  samples.forEach((sample, i) => {
    file.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, sample)) * 32767),
      44 + i * 2,
    );
  });
  return file;
}

/** Returns the names of a sound's takes in a sprite: its own for one, and `<name>-<n>`, from 1, for each of more. */
export function takeNames(name: string, takes: number): string[] {
  return takes === 1
    ? [name]
    : Array.from({ length: takes }, (_, take) => `${name}-${String(take + 1)}`);
}

/** Describes where a sprite's takes lie: in its map, and as samples from its start. */
interface Laid {
  readonly spritemap: Record<string, SpriteEntry>;
  /** Where each take starts, in samples, in the order the sounds give them. */
  readonly starts: readonly number[];
  /** How many samples the sprite holds. */
  readonly length: number;
}

/**
 * Returns where each take lies in a sprite, in order, each a gap after the
 * one before, or throws for no sounds, a sound with no take, or two takes
 * of one name.
 */
function layOut(
  sounds: readonly SpriteLengths[],
  { sampleRate = SAMPLE_RATE, gap = GAP_S, places = PLACES }: SpriteLayout,
): Laid {
  if (sounds.length === 0) throw new Error("A sprite needs a sound.");
  const between = Math.round(gap * sampleRate);
  const spritemap: Record<string, SpriteEntry> = {};
  const starts: number[] = [];
  const names = new Set<string>();
  let at = 0;
  for (const { name, lengths, loop = false } of sounds) {
    if (lengths.length === 0) {
      throw new Error(`The sound "${name}" has no take.`);
    }
    takeNames(name, lengths.length).forEach((take, i) => {
      if (names.has(take)) throw new Error(`Two sounds are named "${take}".`);
      names.add(take);
      if (starts.length > 0) at += between;
      const length = lengths[i] ?? 0;
      spritemap[take] = {
        start: Number((at / sampleRate).toFixed(places)),
        end: Number(((at + length) / sampleRate).toFixed(places)),
        loop,
      };
      starts.push(at);
      at += length;
    });
  }
  return { spritemap, starts, length: at };
}

/**
 * Returns where each take of the sounds lies in a sprite, from the takes'
 * lengths alone, as {@link packSoundSprite} lays them out, so a spec can
 * hold a sprite's map to its takes without rendering them. It throws for no
 * sounds, a sound with no take, or two takes of one name.
 */
export function spritemapOf(
  sounds: readonly SpriteLengths[],
  layout: SpriteLayout = {},
): Record<string, SpriteEntry> {
  return layOut(sounds, layout).spritemap;
}

/**
 * Packs sounds' takes into one sprite, in order, with a gap of silence
 * between two, so one never runs into the next, each but a looping one's
 * faded out at its end. It throws for no sounds, a sound with no take, or
 * two takes of one name.
 */
export function packSoundSprite(
  sounds: readonly SpriteSound[],
  layout: SpriteLayout = {},
): PackedSprite {
  const { sampleRate = SAMPLE_RATE, fade = FADE_S } = layout;
  const { spritemap, starts, length } = layOut(
    sounds.map(({ name, takes, loop }) => ({
      name,
      lengths: takes.map((take) => take.length),
      ...(loop === undefined ? {} : { loop }),
    })),
    layout,
  );
  const fadeSamples = fade * sampleRate;
  const laid = sounds.flatMap(({ takes, loop = false }) =>
    takes.map((take) => ({ take, loop })),
  );
  // A new array is silent, so the gaps need no writing.
  const samples = new Float64Array(length);
  laid.forEach(({ take, loop }, k) => {
    const at = starts[k] ?? 0;
    for (let i = 0; i < take.length; i++) {
      const left = take.length - 1 - i;
      const tail = loop || left >= fadeSamples ? 1 : left / fadeSamples;
      samples[at + i] = (take[i] ?? 0) * tail;
    }
  });
  return {
    samples,
    spritemap,
    json: `${JSON.stringify({ spritemap }, null, 2)}\n`,
    seconds: length / sampleRate,
  };
}

/**
 * Returns a sprite's samples with one more gap of silence after its last
 * take, at its layout's rate, as a sprite is handed to a lossy encoder,
 * which pads the end of what it is handed: the gap keeps the last take
 * clear of it.
 */
export function endedByGap(
  samples: Float64Array,
  { sampleRate = SAMPLE_RATE, gap = GAP_S }: SpriteLayout = {},
): Float64Array {
  const ended = new Float64Array(samples.length + Math.round(gap * sampleRate));
  ended.set(samples);
  return ended;
}

/**
 * Renders sounds into one sprite, in order, with a gap of silence between
 * two, so one never runs into the next. It throws for no sounds, two of one
 * name, or one that can't be scaled to its peak.
 */
export function renderSoundSprite(sounds: readonly Sound[]): RenderedSprite {
  const sprite = packSoundSprite(
    sounds.map((sound) => ({
      name: sound.name,
      takes: [render(sound)],
      loop: sound.loop ?? false,
    })),
  );
  return {
    wav: wav(sprite.samples),
    json: sprite.json,
    seconds: sprite.seconds,
  };
}

/**
 * Renders sounds into one sprite and writes it into a folder, as
 * `sounds.wav` and `sounds.json`, and returns what it wrote.
 */
export async function writeSoundSprite(
  sounds: readonly Sound[],
  folder: string,
): Promise<RenderedSprite> {
  const sprite = renderSoundSprite(sounds);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, "sounds.wav"), sprite.wav);
  await writeFile(join(folder, "sounds.json"), sprite.json);
  return sprite;
}

/**
 * Runs a program on its arguments: it resolves once the program exits well,
 * and rejects where it can't be run or fails, as `execFile()` does.
 */
export type RunProgram = (
  program: string,
  args: readonly string[],
) => Promise<unknown>;

/** Describes a sprite to encode, the beds that ship with it, and where they ship. */
export interface SpriteToEncode {
  /** The sprite's WAV, whose encodes are named for it. */
  readonly wav: string;
  /** Each bed's WAV, in stereo, encoded into `beds/`, named for it. */
  readonly beds: readonly string[];
  /** The files that ship with the encodes, by name, such as the sprite's map. */
  readonly alongside: Readonly<Record<string, string>>;
  /** The folder they ship into, the game's. */
  readonly into: string;
  /** The folder they are made in first, emptied before, so what ships changes all at once. */
  readonly staging: string;
  /** How the sprite is encoded, Vorbis's quality 5 and AAC's 96 kb/s unless given. */
  readonly encoding?: Encoding;
}

/** Says how a WAV is encoded: Vorbis's quality, from 0 to 10, and AAC's bit rate, such as "96k". */
export interface Encoding {
  readonly vorbis: number;
  readonly aac: string;
}

/** How a sprite is encoded unless its own encoding is given. */
const SPRITE_ENCODING: Encoding = { vorbis: 5, aac: "96k" };

/** How a bed, whose WAV is stereo, is encoded: AAC at a higher rate, for its two channels. */
const BED_ENCODING: Encoding = { vorbis: 4, aac: "128k" };

/** The folder of the game's encodes the beds are in. */
const BEDS = "beds";

/** Runs a program with `execFile()`. */
const runProgram: RunProgram = promisify(execFile);

/**
 * A stand-in for ffmpeg, for a spec of a build, which passes the version
 * check and writes each file it is asked to encode as the command line
 * that asked for it, failing, as ffmpeg does, a command line that names no
 * file.
 */
export const fakeFfmpeg: RunProgram = async (program, args) => {
  if (args.includes("-version")) return;
  const output = args.at(-1);
  if (output === undefined) {
    throw new Error("ffmpeg was handed no file to write.");
  }
  await writeFile(output, [program, ...args].join(" "));
};

/** A stand-in for a machine without ffmpeg, for a spec of a build, where running it fails. */
export const missingFfmpeg: RunProgram = () =>
  Promise.reject(new Error("spawn ffmpeg ENOENT"));

/**
 * Encodes a sprite's WAV and its beds' as Ogg Vorbis, which every browser
 * but Safari plays, and as AAC in an M4A, which Safari plays, and ships
 * them into a game's folder with the files that go alongside, returning
 * whether it did: not where ffmpeg can't be run, which changes nothing.
 *
 * The same WAV gives the same bytes every run. It throws where an encode
 * fails, having shipped none of them.
 */
export async function encodeSprite(
  {
    wav,
    beds,
    alongside,
    into,
    staging,
    encoding = SPRITE_ENCODING,
  }: SpriteToEncode,
  run: RunProgram = runProgram,
): Promise<boolean> {
  try {
    await run("ffmpeg", ["-hide_banner", "-version"]);
  } catch {
    return false;
  }
  const encode = async (
    from: string,
    folder: string,
    { vorbis, aac }: Encoding,
  ): Promise<void> => {
    const to = join(folder, basename(from, ".wav"));
    // Bit-exact, with no date and no encoder's name written in.
    const quiet = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      from,
      "-map_metadata",
      "-1",
      "-fflags",
      "+bitexact",
      "-flags:a",
      "+bitexact",
    ];
    await mkdir(folder, { recursive: true });
    await run("ffmpeg", [
      ...quiet,
      ...["-c:a", "libvorbis", "-q:a", String(vorbis), `${to}.ogg`],
    ]);
    await run("ffmpeg", [
      ...quiet,
      ...["-c:a", "aac", "-b:a", aac, "-movflags", "+faststart", `${to}.m4a`],
    ]);
  };
  await rm(staging, { recursive: true, force: true });
  await encode(wav, staging, encoding);
  for (const [name, text] of Object.entries(alongside)) {
    await writeFile(join(staging, name), text);
  }
  for (const bed of beds) {
    await encode(bed, join(staging, BEDS), BED_ENCODING);
  }
  await cp(staging, into, { recursive: true });
  return true;
}
