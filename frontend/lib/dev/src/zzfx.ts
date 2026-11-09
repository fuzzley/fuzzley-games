// ZzFX's synthesis, ported to render the same samples from the same
// parameters, in Node or a page, with nothing drawn at random: a sound
// designed in ZzFX's designer (https://killedbyapixel.github.io/ZzFX/)
// renders here as it plays there, but for the pitch ZzFX varies at each
// play, which a player of these samples varies instead.
//
// Ported from ZzFX v1.4.0, https://github.com/KilledByAPixel/ZzFX:
//
//   ZzFX MIT License
//
//   Copyright (c) 2019 - Frank Force
//
//   Permission is hereby granted, free of charge, to any person obtaining a
//   copy of this software and associated documentation files (the
//   "Software"), to deal in the Software without restriction, including
//   without limitation the rights to use, copy, modify, merge, publish,
//   distribute, sublicense, and/or sell copies of the Software, and to permit
//   persons to whom the Software is furnished to do so, subject to the
//   following conditions:
//
//   The above copyright notice and this permission notice shall be included
//   in all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//   OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
//   NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
//   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
//   OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
//   USE OR OTHER DEALINGS IN THE SOFTWARE.

/** ZzFX's parameters, in the order its designer writes them. */
export const ZZFX_PARAMETERS = [
  "volume",
  "randomness",
  "frequency",
  "attack",
  "sustain",
  "release",
  "shape",
  "shapeCurve",
  "slide",
  "deltaSlide",
  "pitchJump",
  "pitchJumpTime",
  "repeatTime",
  "noise",
  "modulation",
  "bitCrush",
  "delay",
  "sustainVolume",
  "decay",
  "tremolo",
  "filter",
] as const;

/** Names one of ZzFX's parameters. */
export type ZzfxParameter = (typeof ZZFX_PARAMETERS)[number];

/**
 * Describes a sound by ZzFX's parameters, each left out taking ZzFX's
 * default: times in seconds, pitches in Hz, `shape` 0 to 5 for a sine, a
 * triangle, a saw, a tangent, noise or a square, and `filter` a high-pass
 * above 0 and a low-pass below it, at twice its size in Hz.
 */
export type ZzfxSound = Readonly<Partial<Record<ZzfxParameter, number>>>;

/** The rate ZzFX renders at, and its designer plays at, in samples a second. */
export const ZZFX_SAMPLE_RATE = 44100;

/** The least attack ZzFX gives a sound, in samples, so it never pops. */
const MIN_ATTACK_SAMPLES = 9;

/** The filter's resonance. */
const FILTER_Q = 2;

/** Returns 1 for a number of 0 or more, and -1 for one below it, as ZzFX's sign does. */
function signOf(value: number): number {
  return value < 0 ? -1 : 1;
}

/**
 * Returns a sound's samples, from -1 to 1 times its volume, at a rate, as
 * ZzFX renders them with its randomness at 0.
 */
export function zzfxSamples(
  sound: ZzfxSound,
  sampleRate: number = ZZFX_SAMPLE_RATE,
): Float32Array<ArrayBuffer> {
  const {
    volume = 1,
    frequency: pitch = 220,
    shape = 0,
    shapeCurve = 1,
    noise = 0,
    bitCrush = 0,
    sustainVolume = 1,
    tremolo = 0,
    filter = 0,
  } = sound;
  const tau = Math.PI * 2;
  const startSlide = ((sound.slide ?? 0) * 500 * tau) / sampleRate ** 2;
  let slide = startSlide;
  let startFrequency = (pitch * tau) / sampleRate;
  let frequency = startFrequency;
  const attack = (sound.attack ?? 0) * sampleRate || MIN_ATTACK_SAMPLES;
  const decay = (sound.decay ?? 0) * sampleRate;
  const sustain = (sound.sustain ?? 0) * sampleRate;
  const release = (sound.release ?? 0.1) * sampleRate;
  const delay = (sound.delay ?? 0) * sampleRate;
  const deltaSlide = ((sound.deltaSlide ?? 0) * 500 * tau) / sampleRate ** 3;
  const modulation = ((sound.modulation ?? 0) * tau) / sampleRate;
  const pitchJump = ((sound.pitchJump ?? 0) * tau) / sampleRate;
  const pitchJumpTime = (sound.pitchJumpTime ?? 0) * sampleRate;
  const repeatTime = Math.trunc((sound.repeatTime ?? 0) * sampleRate);
  const crushEvery = Math.trunc(bitCrush * 100);

  // A biquad, a low-pass or a high-pass by the filter's sign.
  const w = (tau * Math.abs(filter) * 2) / sampleRate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / 2 / FILTER_Q;
  const a0 = 1 + alpha;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const b0 = (1 + signOf(filter) * cos) / 2 / a0;
  const b1 = -(signOf(filter) + cos) / a0;
  const b2 = b0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  const length = Math.trunc(attack + decay + sustain + release + delay);
  const samples = new Float32Array(Math.max(length, 0));
  let phase = 0;
  let sample = 0;
  let modOffset = 0;
  let repeat = 0;
  let crush = 0;
  let jump = 1;
  for (let i = 0; i < length; i++) {
    // A crushed sample holds its value; 0 % 0 is NaN, so no crush holds none.
    if (!(++crush % crushEvery)) {
      sample = waveAt(phase, shape, shapeCurve);
      const swell = repeatTime
        ? 1 - tremolo + tremolo * Math.sin((tau * i) / repeatTime)
        : 1;
      const curved =
        shape > 4 ? sample : signOf(sample) * Math.abs(sample) ** shapeCurve;
      const level =
        i < attack
          ? i / attack
          : i < attack + decay
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
            : i < attack + decay + sustain
              ? sustainVolume
              : i < length - delay
                ? ((length - i - delay) / release) * sustainVolume
                : 0;
      sample = swell * curved * level;
      if (delay) {
        const echo =
          delay > i
            ? 0
            : ((i < length - delay ? 1 : (length - i) / delay) *
                (samples[Math.trunc(i - delay)] ?? 0)) /
              2 /
              volume;
        sample = sample / 2 + echo;
      }
      if (filter) {
        const filtered = b2 * x2 + b1 * x1 + b0 * sample - a2 * y2 - a1 * y1;
        x2 = x1;
        x1 = sample;
        y2 = y1;
        y1 = filtered;
        sample = filtered;
      }
    }
    samples[i] = sample * volume;

    slide += deltaSlide;
    frequency += slide;
    const step = frequency * Math.cos(modulation * modOffset++);
    phase += step + step * noise * (((i * i * tau) % 2) - 1);

    if (jump && ++jump > pitchJumpTime) {
      frequency += pitchJump;
      startFrequency += pitchJump;
      jump = 0;
    }
    if (repeatTime && !(++repeat % repeatTime)) {
      frequency = startFrequency;
      slide = startSlide;
      jump ||= 1;
    }
  }
  return samples;
}

/** Returns a wave's value at a phase, in radians, by ZzFX's shape. */
function waveAt(phase: number, shape: number, shapeCurve: number): number {
  const tau = Math.PI * 2;
  if (shape > 4) return (phase / tau) % 1 < shapeCurve / 2 ? 1 : -1;
  if (shape > 3) return Math.sin(phase ** 3);
  if (shape > 2) return Math.max(Math.min(Math.tan(phase), 1), -1);
  if (shape > 1) return 1 - (((((2 * phase) / tau) % 2) + 2) % 2);
  if (shape > 0) return 1 - 4 * Math.abs(Math.round(phase / tau) - phase / tau);
  return Math.sin(phase);
}

/**
 * Returns the sound a ZzFX call or parameter list describes, as the designer
 * copies one (`zzfx(...[,,925,.04])` or `[,,925,.04]`), a blank taking the
 * default, or null for text that is neither.
 */
export function parseZzfx(text: string): ZzfxSound | null {
  const list = /\[([^\]]*)\]/.exec(text)?.[1];
  if (list === undefined) return null;
  const values = list.split(",").map((value) => value.trim());
  if (values.length > ZZFX_PARAMETERS.length) return null;
  const sound: Partial<Record<ZzfxParameter, number>> = {};
  for (const [i, value] of values.entries()) {
    if (value === "") continue;
    const number = Number(value);
    const name = ZZFX_PARAMETERS[i];
    if (!Number.isFinite(number) || name === undefined) return null;
    sound[name] = number;
  }
  return sound;
}

/**
 * Returns a sound as the designer copies its parameters, each left out a
 * blank and the list ending at the last one given, so the designer takes it
 * back as it is.
 */
export function formatZzfx(sound: ZzfxSound): string {
  const values = ZZFX_PARAMETERS.map((name) => {
    const value = sound[name];
    return value === undefined ? "" : String(value).replace(/^(-?)0\./, "$1.");
  });
  while (values.at(-1) === "") values.pop();
  return `[${values.join(",")}]`;
}

/**
 * Returns a sound as TypeScript writes it, an object of the parameters it
 * gives, in ZzFX's order, to keep a sound designed by ear in code.
 */
export function zzfxCode(sound: ZzfxSound): string {
  const fields = ZZFX_PARAMETERS.flatMap((name) => {
    const value = sound[name];
    return value === undefined ? [] : [`${name}: ${String(value)}`];
  });
  return `{ ${fields.join(", ")} }`;
}
