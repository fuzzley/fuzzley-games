// A game's sound effects, synthesized from a few oscillators and envelopes
// into one WAV sprite and the spritemap Phaser plays it by, the same bytes
// every run. A game's `tools/build-sounds.mjs` gives its recipes to
// writeSoundSprite(), which writes both files, or, where it renders its takes
// with `@fz/dev/synth`, packs them with packSoundSprite().

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
