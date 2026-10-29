// A game's sound effects, synthesized from a few oscillators and envelopes
// into one WAV sprite and the spritemap Phaser plays it by, the same bytes
// every run. A game's `tools/build-sounds.mjs` gives its recipes to
// writeSoundSprite(), which writes both files.

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

/** Samples a second: enough for a chime's harmonics, and a small file. */
export const SAMPLE_RATE = 16000;

/** The silence between two sounds in the sprite, in seconds. */
const GAP_S = 0.1;

/** How long each sound fades out at its end, so it never clicks. */
const FADE_S = 0.01;

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
 * Returns noise from a seed, smoothed by a one-pole filter into a dull thud.
 *
 * Each call is the next sample, whatever time it is given, so a sound reads
 * it once per sample, in order, as the sprite is rendered.
 */
export function thud(seed: number): Wave {
  let state = seed >>> 0;
  let last = 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    last += 0.25 * ((state / 2 ** 32) * 2 - 1 - last);
    return last;
  };
}

/** Returns a tone shaped by an envelope, starting `at` seconds in. */
export function note(at: number, tone: Wave, shape: Wave): Wave {
  return (t) => (t < at ? 0 : tone(t - at) * shape(t - at));
}

/** Returns a sound's samples, scaled to its peak and faded out at the end. */
function render(sound: Sound): Float64Array {
  const samples = new Float64Array(Math.round(sound.seconds * SAMPLE_RATE));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = sound.sample(i / SAMPLE_RATE);
  }
  const loudest = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
  const fade = FADE_S * SAMPLE_RATE;
  for (let i = 0; i < samples.length; i++) {
    const left = samples.length - 1 - i;
    const tail = left < fade ? left / fade : 1;
    samples[i] = ((samples[i] ?? 0) / loudest) * sound.peak * tail;
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

/**
 * Renders sounds into one sprite, in order, with a gap of silence between
 * two, so one never runs into the next.
 */
export function renderSoundSprite(sounds: readonly Sound[]): RenderedSprite {
  const spritemap: Record<string, SpriteEntry> = {};
  const parts: Float64Array[] = [];
  const gap = new Float64Array(Math.round(GAP_S * SAMPLE_RATE));
  let at = 0;
  for (const [i, sound] of sounds.entries()) {
    const samples = render(sound);
    spritemap[sound.name] = {
      start: Number((at / SAMPLE_RATE).toFixed(3)),
      end: Number(((at + samples.length) / SAMPLE_RATE).toFixed(3)),
      loop: false,
    };
    const after = i < sounds.length - 1 ? gap : new Float64Array(0);
    parts.push(samples, after);
    at += samples.length + after.length;
  }
  const all = new Float64Array(at);
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.length;
  }
  return {
    wav: wav(all),
    json: `${JSON.stringify({ spritemap }, null, 2)}\n`,
    seconds: at / SAMPLE_RATE,
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
