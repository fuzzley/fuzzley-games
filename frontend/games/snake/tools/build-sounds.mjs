// Writes Snake's sounds: three short effects synthesized from a few
// oscillators and envelopes, the same bytes every run, into one WAV sprite and
// the spritemap Phaser plays it by, both in src/scene/sounds/.
//
//   yarn build:sounds

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Samples a second: enough for a chime's harmonics, and a small file. */
const RATE = 16000;

/** The silence between two sounds in the sprite, in seconds. */
const GAP_S = 0.1;

/** How long each sound fades out at its end, so it never clicks. */
const FADE_S = 0.01;

const OUT = join(import.meta.dirname, "../src/scene/sounds");

/**
 * @typedef {object} Sound
 * @property {string} name The sprite's name for it, as the view's `SOUNDS`.
 * @property {number} seconds How long it lasts.
 * @property {number} peak How loud it is at its loudest, from 0 to 1.
 * @property {(t: number) => number} sample Its wave at a time, in seconds.
 */

/**
 * Returns a tone that glides from one pitch to another, as a function of
 * time, with a share of its second harmonic for brightness.
 *
 * @param {number} from The pitch it starts at, in Hz.
 * @param {number} to The pitch it ends at, in Hz.
 * @param {number} seconds How long the glide takes.
 * @param {number} [bright] How much of the second harmonic it has.
 * @returns {(t: number) => number}
 */
function glide(from, to, seconds, bright = 0) {
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
 * Returns an envelope: a quick rise, then an exponential fall.
 *
 * @param {number} attack How long it takes to rise, in seconds.
 * @param {number} decay How long it takes to fall to a third, in seconds.
 * @returns {(t: number) => number}
 */
function envelope(attack, decay) {
  return (t) => (t < 0 ? 0 : Math.min(1, t / attack) * Math.exp(-t / decay));
}

/**
 * Returns noise from a seed, the same each run, smoothed by a one-pole
 * filter into a dull thud.
 *
 * @param {number} seed
 * @returns {(t: number) => number}
 */
function thud(seed) {
  let state = seed >>> 0;
  let last = 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    last += 0.25 * ((state / 2 ** 32) * 2 - 1 - last);
    return last;
  };
}

/**
 * Returns a note that starts at a time, as a function of time.
 *
 * @param {number} at When it starts, in seconds.
 * @param {(t: number) => number} tone
 * @param {(t: number) => number} shape
 * @returns {(t: number) => number}
 */
function note(at, tone, shape) {
  return (t) => (t < at ? 0 : tone(t - at) * shape(t - at));
}

/** @type {readonly Sound[]} */
const SOUNDS = [
  // A bite: two quick blips, rising.
  {
    name: "eat",
    seconds: 0.13,
    peak: 0.55,
    sample: (() => {
      const first = note(0, glide(520, 900, 0.06, 0.2), envelope(0.003, 0.025));
      const second = note(
        0.05,
        glide(780, 1300, 0.06, 0.2),
        envelope(0.003, 0.025),
      );
      return (t) => first(t) + second(t);
    })(),
  },
  // A bump: a low tone falling away, with a dull knock of noise.
  {
    name: "crash",
    seconds: 0.34,
    peak: 0.75,
    sample: (() => {
      const tone = note(0, glide(220, 55, 0.3, 0.3), envelope(0.004, 0.09));
      const knock = thud(7);
      const knockShape = envelope(0.001, 0.03);
      return (t) => tone(t) + 1.6 * knock(t) * knockShape(t);
    })(),
  },
  // A chime: three notes of a major chord, rising.
  {
    name: "best",
    seconds: 0.62,
    peak: 0.5,
    sample: (() => {
      const notes = [1047, 1319, 1568].map((pitch, i) =>
        note(i * 0.09, glide(pitch, pitch, 1, 0.25), envelope(0.005, 0.15)),
      );
      return (t) => notes.reduce((sum, played) => sum + played(t), 0);
    })(),
  },
];

/**
 * Returns a sound's samples, scaled to its peak and faded out at the end.
 *
 * @param {Sound} sound
 * @returns {Float64Array}
 */
function render(sound) {
  const samples = new Float64Array(Math.round(sound.seconds * RATE));
  for (let i = 0; i < samples.length; i++) samples[i] = sound.sample(i / RATE);
  const loudest = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
  const fade = FADE_S * RATE;
  for (let i = 0; i < samples.length; i++) {
    const left = samples.length - 1 - i;
    const tail = left < fade ? left / fade : 1;
    samples[i] = ((samples[i] ?? 0) / loudest) * sound.peak * tail;
  }
  return samples;
}

/**
 * Returns a mono 16-bit PCM WAV file of samples from -1 to 1.
 *
 * @param {Float64Array} samples
 * @returns {Buffer}
 */
function wav(samples) {
  const data = samples.length * 2;
  const file = Buffer.alloc(44 + data);
  file.write("RIFF", 0, "ascii");
  file.writeUInt32LE(36 + data, 4);
  file.write("WAVE", 8, "ascii");
  file.write("fmt ", 12, "ascii");
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(1, 22);
  file.writeUInt32LE(RATE, 24);
  file.writeUInt32LE(RATE * 2, 28);
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

/** @type {Record<string, { start: number, end: number, loop: boolean }>} */
const spritemap = {};
/** @type {Float64Array[]} */
const parts = [];
let at = 0;
const gap = new Float64Array(Math.round(GAP_S * RATE));
for (const [i, sound] of SOUNDS.entries()) {
  const samples = render(sound);
  spritemap[sound.name] = {
    start: Number((at / RATE).toFixed(3)),
    end: Number(((at + samples.length) / RATE).toFixed(3)),
    loop: false,
  };
  // A gap between two sounds, so one never runs into the next.
  const after = i < SOUNDS.length - 1 ? gap : new Float64Array(0);
  parts.push(samples, after);
  at += samples.length + after.length;
}
const all = new Float64Array(at);
let offset = 0;
for (const part of parts) {
  all.set(part, offset);
  offset += part.length;
}

await mkdir(OUT, { recursive: true });
const file = wav(all);
await writeFile(join(OUT, "sounds.wav"), file);
await writeFile(
  join(OUT, "sounds.json"),
  `${JSON.stringify({ spritemap }, null, 2)}\n`,
);
console.log(
  `Wrote ${SOUNDS.length} sounds, ${(all.length / RATE).toFixed(2)} s, ${file.length} bytes.`,
);
