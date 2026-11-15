// The synth's signals and what makes and shapes them: oscillators, noise,
// struck partials, filters, resonators, shaping, space, dynamics, texture
// and the WAV file, each a plain function over arrays of samples, so a sound
// is built offline, in Node, the same bytes every run. Nothing here is
// recorded, sampled or drawn from another work: every sound starts as
// arithmetic.
//
// A signal is a Float64Array of samples at `SR` a second, from -1 to 1. A
// parameter that may move is a `Param`: a number, an array a sample long, or
// a function of the time in seconds.

/** Samples a second. */
export const SR = 44100;

/** A whole turn, in radians. */
export const TAU = Math.PI * 2;

/** A sound's samples, at {@link SR} a second, from -1 to 1. */
export type Signal = Float64Array;

/** A parameter that may move: a number, an array a sample long, or a function of the time in seconds. */
export type Param = number | Float64Array | ((t: number) => number);

/** A signal laid into a mix at its own start, in seconds, and at its own level. */
export interface Layer {
  readonly x: Signal;
  readonly at?: number;
  readonly gain?: number;
}

/** A partial of a struck thing, as {@link modes} rings it. */
export interface Mode {
  /** Its pitch, in Hz. */
  readonly freq: number;
  /** The seconds it takes to fall 60 dB. */
  readonly decay: number;
  /** Its level, 1 unless given. */
  readonly gain?: number;
  /** Its starting phase, in turns. */
  readonly phase?: number;
  /** How many cents it falls over its decay, as a struck thing's pitch drops a little as it rings. */
  readonly bend?: number;
}

/** A resonator of a bank, as {@link resonate} rings a signal through it. */
export interface Resonance {
  /** Its pitch, in Hz. */
  readonly freq: number;
  /** The seconds it takes to fall 60 dB. */
  readonly decay: number;
  /** Its level, 1 unless given. */
  readonly gain?: number;
}

/** A room, as {@link reverb} and {@link reverbStereo} put a signal in one. */
export interface Room {
  /** Seconds for its tail to fall 60 dB. */
  readonly decay?: number;
  /** How much of its tail is heard under the dry signal. */
  readonly mix?: number;
  /** How fast its highs die, 0 to 1. */
  readonly damp?: number;
  /** Its size against the stock one, 0.5 to 2. */
  readonly size?: number;
  /** Seconds before its tail starts. */
  readonly predelay?: number;
}

// --- Basics -------------------------------------------------------------

/** Returns how many samples a time takes, one at least. */
export function samples(seconds: number): number {
  return Math.max(1, Math.round(seconds * SR));
}

/** Returns silence. */
export function silence(seconds: number): Signal {
  return new Float64Array(samples(seconds));
}

/** Returns a parameter read at a sample. */
export function read(param: Param, i: number): number {
  if (typeof param === "number") return param;
  if (typeof param === "function") return param(i / SR);
  return param[Math.min(i, param.length - 1)] ?? 0;
}

/** Returns a seeded random: a function that returns the next number from 0 up to 1. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a gain for decibels. */
export function dB(db: number): number {
  return 10 ** (db / 20);
}

/** Returns a pitch ratio for cents. */
export function cents(amount: number): number {
  return 2 ** (amount / 1200);
}

/** Returns the pitch of a MIDI note, in Hz, 69 being A at 440 Hz. */
export function hz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

// --- Envelopes ----------------------------------------------------------

/**
 * Returns a curve through points, each a time in seconds and a value, held
 * after its last. Between two points it moves in a straight line, or, with
 * `curve` above 1, bends toward the later point's value early (a fast
 * attack or a fast fall), and below 1 late.
 */
export function points(
  through: readonly (readonly [number, number])[],
  seconds: number,
  curve = 1,
): Signal {
  const out = new Float64Array(samples(seconds));
  let k = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let b = through[k + 1];
    while (b && t >= b[0]) {
      k++;
      b = through[k + 1];
    }
    const a = through[k] ?? [0, 0];
    // Before its first point, the curve holds that point's value.
    if (!b || t < a[0]) {
      out[i] = a[1];
    } else {
      const share = (t - a[0]) / Math.max(1e-9, b[0] - a[0]);
      out[i] = a[1] + (b[1] - a[1]) * (1 - (1 - share) ** curve);
    }
  }
  return out;
}

/**
 * Returns a struck envelope: a rise over `attack` seconds, then an
 * exponential fall that reaches a thousandth (-60 dB) after `decay` seconds.
 */
export function perc(attack: number, decay: number, seconds: number): Signal {
  const out = new Float64Array(samples(seconds));
  const rate = Math.log(1000) / Math.max(1e-6, decay);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = t < attack ? t / attack : Math.exp(-(t - attack) * rate);
  }
  return out;
}

/** Describes a held envelope, its times in seconds. */
export interface Adsr {
  readonly attack: number;
  readonly decay: number;
  /** The level it is held at, from 0 to 1. */
  readonly sustain: number;
  /** When its release starts. */
  readonly hold: number;
  readonly release: number;
}

/**
 * Returns a held envelope: attack, decay to a sustain level, held until
 * `hold` seconds, then a release.
 */
export function adsr(
  { attack, decay, sustain, hold, release }: Adsr,
  seconds: number,
): Signal {
  return points(
    [
      [0, 0],
      [attack, 1],
      [attack + decay, sustain],
      [Math.max(attack + decay, hold), sustain],
      [Math.max(attack + decay, hold) + release, 0],
    ],
    seconds,
  );
}

/**
 * Returns a glide from one value to another, exponential (as pitch moves),
 * over a time, then held; with `curve` above 1 it moves most of the way
 * early.
 */
export function glide(
  from: number,
  to: number,
  over: number,
  seconds: number,
  curve = 1,
): Signal {
  const out = new Float64Array(samples(seconds));
  const ratio = to / from;
  for (let i = 0; i < out.length; i++) {
    const share = Math.min(1, i / SR / over);
    out[i] = from * ratio ** (1 - (1 - share) ** curve);
  }
  return out;
}

/**
 * Returns a slow wobble about a middle, a sine at a rate in Hz from a phase
 * in turns, for vibrato or tremolo.
 */
export function lfo(
  middle: number,
  depth: number,
  rate: number,
  seconds: number,
  phase = 0,
): Signal {
  const out = new Float64Array(samples(seconds));
  for (let i = 0; i < out.length; i++) {
    out[i] = middle + depth * Math.sin(TAU * (rate * (i / SR) + phase));
  }
  return out;
}

// --- Sources ------------------------------------------------------------

/**
 * Returns what smooths the step of a naive saw or square near its jump, so
 * it doesn't alias, at a phase from 0 to 1 that moves `step` a sample.
 */
function blep(phase: number, step: number): number {
  if (phase < step) {
    const t = phase / step;
    return t + t - t * t - 1;
  }
  if (phase > 1 - step) {
    const t = (phase - 1) / step;
    return t * t + t + t + 1;
  }
  return 0;
}

/** The shapes {@link osc} plays. */
export type Waveform = "sine" | "tri" | "saw" | "pulse";

/** Describes how an oscillator starts, and a pulse's width. */
export interface OscHow {
  /** Its starting phase, in turns. */
  readonly phase?: number;
  /** A pulse's width, 0.5 for a square. */
  readonly width?: Param;
}

/**
 * Returns an oscillator, a sine, a triangle, a saw or a pulse, its pitch in
 * Hz free to move.
 */
export function osc(
  shape: Waveform,
  freq: Param,
  seconds: number,
  { phase = 0, width = 0.5 }: OscHow = {},
): Signal {
  const out = new Float64Array(samples(seconds));
  let p = phase % 1;
  for (let i = 0; i < out.length; i++) {
    const step = Math.min(0.49, Math.max(0, read(freq, i) / SR));
    switch (shape) {
      case "sine":
        out[i] = Math.sin(TAU * p);
        break;
      case "saw":
        out[i] = 2 * p - 1 - blep(p, step);
        break;
      case "pulse": {
        const w = read(width, i);
        let v = p < w ? 1 : -1;
        v += blep(p, step);
        v -= blep((p - w + 1) % 1, step);
        out[i] = v;
        break;
      }
      case "tri":
        // Its corners are gentle enough to need no smoothing: its harmonics
        // fall 12 dB an octave by themselves.
        out[i] = 1 - 4 * Math.abs(((p + 0.25) % 1) - 0.5);
        break;
    }
    p += step;
    if (p >= 1) p -= 1;
  }
  return out;
}

/**
 * Returns a tone whose phase another tone bends: a carrier at a pitch in
 * Hz, and a modulator at a ratio of it, bending its phase by an index in
 * radians that may move. Low indexes are warm, high ones metallic; ratios
 * off whole numbers ring like bells and struck metal. `feedback` is how
 * much of the modulator feeds itself, which roughens it toward noise.
 */
export function fm(
  freq: Param,
  ratio: number,
  index: Param,
  seconds: number,
  { feedback = 0 }: { readonly feedback?: number } = {},
): Signal {
  const out = new Float64Array(samples(seconds));
  let pc = 0;
  let pm = 0;
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const f = read(freq, i);
    const m = Math.sin(TAU * pm + feedback * last);
    last = m;
    out[i] = Math.sin(TAU * pc + read(index, i) * m);
    pc += f / SR;
    pm += (f * ratio) / SR;
    if (pc >= 1) pc -= 1;
    if (pm >= 1) pm -= 1;
  }
  return out;
}

/** The colors {@link noise} comes in. */
export type NoiseColor = "white" | "pink" | "brown";

/** The corners of the low-passes pink noise is made of, in Hz, a factor of three apart from 15 Hz up. */
const PINK_CORNERS = [15, 45, 135, 405, 1215, 3645, 10935];

/**
 * Returns noise from a seed: white (flat, hissy), pink (even by octave,
 * natural) or brown (dark, rumbling).
 */
export function noise(
  color: NoiseColor,
  seconds: number,
  seed: number,
): Signal {
  const out = new Float64Array(samples(seconds));
  const random = seeded(seed);
  if (color === "white") {
    for (let i = 0; i < out.length; i++) out[i] = random() * 2 - 1;
    return out;
  }
  if (color === "brown") {
    let v = 0;
    for (let i = 0; i < out.length; i++) {
      v = (v + 0.02 * (random() * 2 - 1)) / 1.02;
      out[i] = v * 3.5;
    }
    return out;
  }
  // Pink: seven noises of their own, each dulled by a one-pole low-pass, at
  // its corner, each brought to the same loudness. Power that is even across
  // such corners falls 3 dB an octave between them, which is what pink is.
  const held = new Float64Array(PINK_CORNERS.length);
  const coefficients = PINK_CORNERS.map(
    (corner) => 1 - Math.exp((-TAU * corner) / SR),
  );
  const levels = coefficients.map((a) => Math.sqrt((2 - a) / a));
  const scale = 0.3 / Math.sqrt(PINK_CORNERS.length) / 1.8;
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let k = 0; k < PINK_CORNERS.length; k++) {
      const a = coefficients[k]!;
      held[k] = held[k]! + a * ((random() * 2 - 1) * 1.732 - held[k]!);
      sum += held[k]! * levels[k]!;
    }
    out[i] = sum * scale;
  }
  return out;
}

/**
 * Returns the sum of struck partials: each a sine at its own pitch that
 * dies away at its own rate, as a rung thing's modes do. Partials at whole
 * multiples sound like a string or a pipe; scattered ones like stone, glass
 * or metal; long decays ring and short ones knock.
 */
export function modes(partials: readonly Mode[], seconds: number): Signal {
  const out = new Float64Array(samples(seconds));
  for (const { freq, decay, gain = 1, phase = 0, bend = 0 } of partials) {
    if (freq >= SR / 2) continue;
    const rate = Math.log(1000) / Math.max(1e-6, decay);
    let p = phase;
    const n = Math.min(out.length, samples(decay * 1.2));
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = bend
        ? freq * 2 ** ((-bend * Math.min(1, t / decay)) / 1200)
        : freq;
      out[i] = out[i]! + gain * Math.sin(TAU * p) * Math.exp(-t * rate);
      p += f / SR;
    }
  }
  return out;
}

/** Describes a plucked string. */
export interface PluckHow {
  /** How dull it is, 0 bright to 1 dull. */
  readonly damp?: number;
  readonly seed?: number;
  /** How long it rings, in seconds. */
  readonly decay?: number;
}

/**
 * Returns a plucked string at a pitch in Hz: a burst of noise in a loop a
 * period long, which a gentle filter dulls a little each time round.
 */
export function pluck(
  freq: number,
  seconds: number,
  { damp = 0.5, seed = 1, decay = 1 }: PluckHow = {},
): Signal {
  const out = new Float64Array(samples(seconds));
  const period = Math.max(2, Math.round(SR / freq));
  const random = seeded(seed);
  const line = new Float64Array(period);
  for (let i = 0; i < period; i++) line[i] = random() * 2 - 1;
  const keep = 10 ** (-3 / (decay * freq));
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const k = i % period;
    const v = line[k]!;
    out[i] = v;
    last = (1 - damp * 0.5) * v + damp * 0.5 * last;
    line[k] = last * keep;
  }
  return out;
}

// --- Mixing -------------------------------------------------------------

/** Returns a signal scaled by a gain that may move. */
export function gain(x: Signal, amount: Param): Signal {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i]! * read(amount, i);
  return out;
}

/**
 * Returns signals summed, each from its own start and at its own level, as
 * long as the one that ends last.
 */
export function mix(layers: readonly (Signal | Layer)[]): Signal {
  const parts = layers.map((layer) =>
    layer instanceof Float64Array
      ? { x: layer, at: 0, gain: 1 }
      : { at: 0, gain: 1, ...layer },
  );
  const length = Math.max(
    ...parts.map(({ x, at: start }) => x.length + Math.round(start * SR)),
  );
  const out = new Float64Array(length);
  for (const { x, at: start, gain: level } of parts) {
    const offset = Math.round(start * SR);
    for (let i = 0; i < x.length; i++) {
      out[offset + i] = out[offset + i]! + x[i]! * level;
    }
  }
  return out;
}

/** Returns a signal cut or padded to a length. */
export function fit(x: Signal, seconds: number): Signal {
  const out = new Float64Array(samples(seconds));
  out.set(x.subarray(0, out.length));
  return out;
}

/**
 * Returns a signal faded in and out at its ends, each over a time in
 * seconds, so it never clicks.
 */
export function fade(x: Signal, fadeIn: number, fadeOut: number): Signal {
  const out = Float64Array.from(x);
  const a = Math.min(x.length, Math.round(fadeIn * SR));
  const b = Math.min(x.length, Math.round(fadeOut * SR));
  for (let i = 0; i < a; i++) out[i] = out[i]! * (i / a);
  for (let i = 0; i < b; i++) {
    const k = x.length - 1 - i;
    out[k] = out[k]! * (0.5 - 0.5 * Math.cos((Math.PI * i) / b));
  }
  return out;
}

/**
 * Returns a signal played faster, at a ratio above 1, or slower, its pitch
 * moving with its speed, as a sample played at another rate is.
 */
export function resample(x: Signal, ratio: number): Signal {
  const out = new Float64Array(Math.max(1, Math.floor(x.length / ratio)));
  for (let i = 0; i < out.length; i++) {
    const p = i * ratio;
    const k = Math.floor(p);
    const f = p - k;
    const b = x[k] ?? 0;
    const a = x[k - 1] ?? b;
    const c = x[k + 1] ?? b;
    const d = x[k + 2] ?? c;
    // A cubic through four neighbours.
    out[i] =
      b +
      0.5 *
        f *
        (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
  }
  return out;
}

/** Returns a signal turned back to front. */
export function reversed(x: Signal): Signal {
  return Float64Array.from(x).reverse();
}

// --- Filters ------------------------------------------------------------

/** The filters {@link filter} passes a signal through. */
export type FilterType = "lp" | "hp" | "bp" | "notch";

/**
 * Returns a signal through a filter whose cutoff, in Hz, and resonance may
 * move: low-pass, high-pass, band-pass (at an even peak whatever its width)
 * or notch. A resonance of 0.707 is flat, 4 rings and 20 whistles.
 */
export function filter(
  x: Signal,
  type: FilterType,
  cutoff: Param,
  q: Param = 0.707,
): Signal {
  const out = new Float64Array(x.length);
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = Math.min(SR * 0.45, Math.max(10, read(cutoff, i)));
    const g = Math.tan((Math.PI * fc) / SR);
    const k = 1 / Math.max(0.05, read(q, i));
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v0 = x[i]!;
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] =
      type === "lp"
        ? v2
        : type === "bp"
          ? k * v1
          : type === "hp"
            ? v0 - k * v1 - v2
            : v0 - k * v1;
  }
  return out;
}

/**
 * Returns a signal with its lows or its highs lifted by a shelf at a corner
 * in Hz, or cut where the decibels are negative.
 */
export function shelf(
  x: Signal,
  side: "low" | "high",
  freq: number,
  db: number,
): Signal {
  const a = 10 ** (db / 40);
  const w = (TAU * freq) / SR;
  const cos = Math.cos(w);
  const alpha = (Math.sin(w) / 2) * Math.SQRT2;
  const s = 2 * Math.sqrt(a) * alpha;
  const sign = side === "low" ? 1 : -1;
  const b0 = a * (a + 1 - sign * (a - 1) * cos + s);
  const b1 = sign * 2 * a * (a - 1 - sign * (a + 1) * cos);
  const b2 = a * (a + 1 - sign * (a - 1) * cos - s);
  const a0 = a + 1 + sign * (a - 1) * cos + s;
  const a1 = -sign * 2 * (a - 1 + sign * (a + 1) * cos);
  const a2 = a + 1 + sign * (a - 1) * cos - s;
  return biquad(x, [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0]);
}

/** Returns a signal through a fixed two-pole, two-zero filter, given its b0, b1, b2, a1 and a2. */
export function biquad(
  x: Signal,
  [b0, b1, b2, a1, a2]: readonly [number, number, number, number, number],
): Signal {
  const out = new Float64Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i]!;
    const y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = v;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/**
 * Returns a signal rung through a bank of resonators, each at its own pitch
 * and decay, with `tail` seconds added for the ringing to die in: what a
 * hollow or solid thing does to whatever strikes or scrapes it. Unlike
 * {@link modes}, which is struck once, this takes any signal, so noise
 * through it sounds like the thing being scraped, shattered or blown.
 */
export function resonate(
  x: Signal,
  partials: readonly Resonance[],
  tail = 0,
): Signal {
  const out = new Float64Array(x.length + (tail ? samples(tail) : 0));
  for (const { freq, decay, gain: level = 1 } of partials) {
    if (freq >= SR / 2) continue;
    const r = 10 ** (-3 / (Math.max(1e-4, decay) * SR));
    const w = (TAU * freq) / SR;
    const c1 = 2 * r * Math.cos(w);
    const c2 = r * r;
    // Scaled so a partial's level doesn't grow with its decay.
    const scale = level * (1 - r) * 2;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < out.length; i++) {
      const y = (x[i] ?? 0) * scale + c1 * y1 - c2 * y2;
      y2 = y1;
      y1 = y;
      out[i] = out[i]! + y;
    }
  }
  return out;
}

/** Describes a comb's damping, the tail it rings on in, and how much of it is heard. */
export interface CombHow {
  /** How much of its highs each pass round loses, 0 to 1. */
  readonly damp?: number;
  /** Seconds added for it to ring on in. */
  readonly tail?: number;
  /** How much of it is heard against the dry signal, 0 to 1. */
  readonly mix?: number;
}

/** The longest delay a comb holds, in samples: a power of two, so its line wraps by a mask. */
const COMB_LINE = 1 << 16;

/**
 * Returns a signal through a comb: itself, delayed by a time in seconds
 * that may move, and fed back by -0.98 to 0.98, which rings at the pitch its
 * delay sets, or thickens a sound when the delay is swept.
 */
export function comb(
  x: Signal,
  seconds: Param,
  feedback: number,
  { damp = 0, tail = 0, mix: wet = 1 }: CombHow = {},
): Signal {
  const out = new Float64Array(x.length + (tail ? samples(tail) : 0));
  const line = new Float64Array(COMB_LINE);
  const mask = COMB_LINE - 1;
  let write = 0;
  let low = 0;
  for (let i = 0; i < out.length; i++) {
    const delay = Math.min(COMB_LINE - 4, Math.max(1, read(seconds, i) * SR));
    const back = write - delay;
    const k = Math.floor(back);
    const f = back - k;
    const a = line[(k + COMB_LINE) & mask]!;
    const b = line[(k + 1 + COMB_LINE) & mask]!;
    const delayed = a + (b - a) * f;
    low = delayed * (1 - damp) + low * damp;
    const v = (x[i] ?? 0) + low * feedback;
    line[write & mask] = v;
    write++;
    out[i] = (x[i] ?? 0) * (1 - wet) + delayed * wet;
  }
  return out;
}

// --- Shaping ------------------------------------------------------------

/**
 * Returns a signal driven into a soft clip, which thickens it with
 * harmonics and evens its peaks: warmth at a drive of 1 to 2, grit above 4.
 */
export function drive(x: Signal, amount: Param): Signal {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const d = read(amount, i);
    out[i] = Math.tanh(x[i]! * d) / Math.tanh(Math.max(1e-3, d));
  }
  return out;
}

/**
 * Returns a signal folded back on itself wherever it passes full scale,
 * which adds a bright, glassy buzz that grows with the drive.
 */
export function fold(x: Signal, amount: Param): Signal {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    out[i] = Math.sin((x[i]! * read(amount, i) * Math.PI) / 2);
  }
  return out;
}

/**
 * Returns a signal held for `hold` samples at a time and cut to the levels
 * `bits` bits take: the grit of an old sound chip, to use sparingly.
 */
export function crush(x: Signal, hold: number, bits = 16): Signal {
  const out = new Float64Array(x.length);
  const levels = 2 ** (bits - 1);
  let held = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % hold === 0) held = Math.round(x[i]! * levels) / levels;
    out[i] = held;
  }
  return out;
}

// --- Space --------------------------------------------------------------

/** Describes an echo: its time in seconds, and how it is fed back, heard, dulled and rung on. */
export interface EchoHow {
  readonly time: number;
  readonly feedback?: number;
  readonly mix?: number;
  readonly damp?: number;
  /** Seconds added for the echoes to ring on in, four echoes' unless given. */
  readonly tail?: number;
}

/**
 * Returns a signal with echoes: itself again after a time, fainter each
 * time, each echo duller if told.
 */
export function echo(
  x: Signal,
  {
    time,
    feedback = 0.35,
    mix: wet = 0.3,
    damp = 0.3,
    tail = time * 4,
  }: EchoHow,
): Signal {
  const delayed = comb(x, time, feedback, { damp, tail });
  const out = new Float64Array(delayed.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = (x[i] ?? 0) + delayed[i]! * wet;
  }
  return out;
}

/** The delays of the reverb's combs, in samples at 44.1 kHz, none a multiple of another. */
const COMBS = [1117, 1193, 1277, 1361, 1433, 1499, 1559, 1621];

/** The delays of the reverb's all-passes, in samples at 44.1 kHz. */
const ALLPASSES = [557, 443, 349, 229];

/**
 * Returns one channel of a small room's reverb: eight damped combs side by
 * side, then four all-passes in a row to smear them, each delay `spread`
 * samples longer for a second channel.
 */
function room(
  x: Signal,
  decay: number,
  damp: number,
  size: number,
  spread: number,
): Signal {
  const length = x.length + samples(decay * 1.1);
  const wet = new Float64Array(length);
  for (const base of COMBS) {
    const delay = Math.round(base * size) + spread;
    const fb = 10 ** ((-3 * delay) / (decay * SR));
    const line = new Float64Array(delay);
    let low = 0;
    for (let i = 0; i < length; i++) {
      const k = i % delay;
      const out = line[k]!;
      low = out * (1 - damp) + low * damp;
      line[k] = (x[i] ?? 0) + low * fb;
      wet[i] = wet[i]! + out;
    }
  }
  let y = wet;
  for (const base of ALLPASSES) {
    const delay = Math.round(base * size) + spread;
    const line = new Float64Array(delay);
    const next = new Float64Array(length);
    for (let i = 0; i < length; i++) {
      const k = i % delay;
      const held = line[k]!;
      const v = y[i]!;
      next[i] = held - v * 0.5;
      line[k] = v + held * 0.5;
    }
    y = next;
  }
  for (let i = 0; i < length; i++) y[i] = y[i]! * 0.12;
  return y;
}

/**
 * Returns a signal in a room: itself, dry, with the room's tail under it. A
 * little (a mix of 0.1 to 0.2, a decay under half a second) is what keeps a
 * synthesized sound from stopping dead.
 */
export function reverb(
  x: Signal,
  {
    decay = 0.4,
    mix: wet = 0.15,
    damp = 0.4,
    size = 1,
    predelay = 0.008,
  }: Room = {},
): Signal {
  const tail = room(x, decay, damp, size, 0);
  return mix([x, { x: tail, at: predelay, gain: wet }]);
}

/**
 * Returns a signal in a room, in stereo: the same dry signal in both ears,
 * the room's tail a little different in each, which is what makes it wide.
 */
export function reverbStereo(
  x: Signal,
  {
    decay = 1.2,
    mix: wet = 0.25,
    damp = 0.4,
    size = 1.2,
    predelay = 0.012,
  }: Room = {},
): [Signal, Signal] {
  return [
    mix([x, { x: room(x, decay, damp, size, 0), at: predelay, gain: wet }]),
    mix([x, { x: room(x, decay, damp, size, 23), at: predelay, gain: wet }]),
  ];
}

// --- Dynamics -----------------------------------------------------------

/** Describes a compressor: its threshold and makeup in dB, its ratio, and its times in seconds. */
export interface CompressHow {
  readonly threshold?: number;
  readonly ratio?: number;
  readonly attack?: number;
  readonly release?: number;
  readonly makeup?: number;
}

/**
 * Returns a signal with its loud parts turned down: above a threshold, each
 * decibel in comes out as a fraction of one. It evens a sound's body under
 * its attack, and glues layers into one.
 */
export function compress(
  x: Signal,
  {
    threshold = -18,
    ratio = 3,
    attack = 0.003,
    release = 0.08,
    makeup = 0,
  }: CompressHow = {},
): Signal {
  const out = new Float64Array(x.length);
  const up = Math.exp(-1 / (attack * SR));
  const down = Math.exp(-1 / (release * SR));
  let level = 0;
  for (let i = 0; i < x.length; i++) {
    const v = Math.abs(x[i]!);
    level =
      v > level ? up * level + (1 - up) * v : down * level + (1 - down) * v;
    const db = 20 * Math.log10(Math.max(1e-9, level));
    const over = Math.max(0, db - threshold);
    out[i] = x[i]! * dB(makeup - over * (1 - 1 / ratio));
  }
  return out;
}

/**
 * Returns a signal that never passes a ceiling, in dB below full scale: it
 * looks a few milliseconds ahead and turns down before a peak arrives, then
 * back up over `release` seconds, so nothing clips and nothing distorts.
 */
export function limit(x: Signal, ceiling = -1, release = 0.06): Signal {
  const top = dB(ceiling);
  const ahead = Math.round(0.004 * SR);
  const out = new Float64Array(x.length);
  const down = Math.exp(-1 / (release * SR));
  let g = 1;
  for (let i = 0; i < x.length; i++) {
    let peak = 0;
    for (let k = 0; k <= ahead; k++) {
      peak = Math.max(peak, Math.abs(x[i + k] ?? 0));
    }
    const want = peak > top ? top / peak : 1;
    g = want < g ? want : Math.min(1, down * g + (1 - down) * want);
    out[i] = x[i]! * Math.min(g, want);
  }
  return out;
}

/**
 * Returns a signal scaled so its loudest sample is at a level, in dB below
 * full scale, or throws for one that is silent or not a number.
 */
export function normalize(x: Signal, db = -1): Signal {
  let loudest = 0;
  for (const v of x) loudest = Math.max(loudest, Math.abs(v));
  if (!(loudest > 0 && Number.isFinite(loudest))) {
    throw new Error("A sound is silent or not a number.");
  }
  return gain(x, dB(db) / loudest);
}

/** Returns a signal at full scale, so layers mix by the gains they are given. */
export function unit(x: Signal): Signal {
  return normalize(x, 0);
}

/**
 * Returns a signal with whatever holds it off the middle taken out, by a
 * gentle high-pass at 20 Hz, so a sound starts and ends at zero.
 */
export function centered(x: Signal): Signal {
  return filter(x, "hp", 20, 0.707);
}

// --- Texture ------------------------------------------------------------

/** Describes a scatter of grains. */
export interface ScatterHow {
  /** How many grains. */
  readonly count: number;
  /** The time they fall over. */
  readonly seconds: number;
  readonly seed: number;
  /** How early most of them fall: above 1 early, below 1 late. */
  readonly bias?: number;
  /** Makes a grain from its number, a random, and how far through the scatter it falls, from 0 to 1. */
  readonly grain: (i: number, random: () => number, share: number) => Signal;
  /** How loud a grain is by how far through the scatter it falls, 1 unless given. */
  readonly level?: (share: number) => number;
}

/**
 * Returns many small sounds scattered over a time: debris, crackle,
 * sparkle, each grain laid where the density puts it.
 */
export function scatter({
  count,
  seconds,
  seed,
  bias = 2,
  grain,
  level = () => 1,
}: ScatterHow): Signal {
  const random = seeded(seed);
  const layers: Layer[] = [];
  for (let i = 0; i < count; i++) {
    const share = random() ** bias;
    layers.push({
      x: grain(i, random, share),
      at: share * seconds,
      gain: level(share),
    });
  }
  return mix(layers);
}

/**
 * Returns a looping sound's samples, `seconds` long, made to run on
 * unbroken: its last stretch faded, over `overlap` seconds, into what came
 * just before its start, at an even loudness. Hand it a signal longer than
 * the loop by the overlap.
 */
export function looped(x: Signal, seconds: number, overlap = 0.25): Signal {
  const n = samples(seconds);
  const o = Math.min(samples(overlap), x.length - n);
  const out = Float64Array.from(x.subarray(o, o + n));
  for (let i = 0; i < o; i++) {
    const into = ((i / o) * Math.PI) / 2;
    const k = n - o + i;
    out[k] = Math.cos(into) * out[k]! + Math.sin(into) * x[i]!;
  }
  return out;
}

// --- Files --------------------------------------------------------------

/** Where a WAV file's samples start, past its header. */
const WAV_HEADER = 44;

/**
 * Returns a 16-bit PCM WAV file of one channel or two at {@link SR},
 * dithered from a seed, so a quiet tail fades into noise too faint to hear
 * rather than into steps.
 */
export function wav(
  channels: Signal | readonly [Signal, Signal],
  seed = 7,
): Buffer {
  const list = channels instanceof Float64Array ? [channels] : channels;
  const count = list.length;
  const length = Math.max(...list.map((c) => c.length));
  const data = length * count * 2;
  const file = Buffer.alloc(WAV_HEADER + data);
  file.write("RIFF", 0, "ascii");
  file.writeUInt32LE(36 + data, 4);
  file.write("WAVE", 8, "ascii");
  file.write("fmt ", 12, "ascii");
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(count, 22);
  file.writeUInt32LE(SR, 24);
  file.writeUInt32LE(SR * count * 2, 28);
  file.writeUInt16LE(count * 2, 32);
  file.writeUInt16LE(16, 34);
  file.write("data", 36, "ascii");
  file.writeUInt32LE(data, 40);
  const random = seeded(seed);
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < count; c++) {
      const dither = (random() - random()) / 32768;
      const v = Math.max(-1, Math.min(1, (list[c]?.[i] ?? 0) + dither));
      file.writeInt16LE(
        Math.round(v * 32767),
        WAV_HEADER + (i * count + c) * 2,
      );
    }
  }
  return file;
}

/**
 * Returns the samples of a 16-bit PCM WAV file {@link wav} wrote, a signal
 * for each channel, each sample its 16 bits over 32,768.
 */
export function wavSamples(file: Buffer): Signal[] {
  const count = file.readUInt16LE(22);
  const length = (file.length - WAV_HEADER) / 2 / count;
  const channels = Array.from(
    { length: count },
    () => new Float64Array(length),
  );
  for (let i = 0; i < length; i++) {
    channels.forEach((channel, c) => {
      channel[i] = file.readInt16LE(WAV_HEADER + (i * count + c) * 2) / 32768;
    });
  }
  return channels;
}
