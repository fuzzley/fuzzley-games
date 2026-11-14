// The synth the uplift's sounds are made with: oscillators, noise, filters,
// resonators, shaping, space and dynamics, each a plain function over arrays
// of samples, so a sound is built offline, in Node, the same bytes every run.
// Nothing here is recorded, sampled or drawn from another work: every sound
// starts as arithmetic.
//
// A signal is a Float64Array of samples at `SR` a second, from -1 to 1. A
// parameter that may move is a `Param`: a number, an array a sample long, or
// a function of the time in seconds.

/** Samples a second. */
export const SR = 44100;

/** @typedef {Float64Array} Signal */
/** @typedef {number | Float64Array | ((t: number) => number)} Param */

const TAU = Math.PI * 2;

// --- Basics -------------------------------------------------------------

/**
 * Returns how many samples a time takes.
 *
 * @param {number} seconds
 * @returns {number}
 */
export function samples(seconds) {
  return Math.max(1, Math.round(seconds * SR));
}

/**
 * Returns silence.
 *
 * @param {number} seconds
 * @returns {Signal}
 */
export function silence(seconds) {
  return new Float64Array(samples(seconds));
}

/**
 * Returns a parameter read at a sample.
 *
 * @param {Param} param
 * @param {number} i
 * @returns {number}
 */
function at(param, i) {
  if (typeof param === "number") return param;
  if (typeof param === "function") return param(i / SR);
  return param[Math.min(i, param.length - 1)] ?? 0;
}

/**
 * Returns a seeded random: the next number from 0 up to 1.
 *
 * @param {number} seed
 * @returns {() => number}
 */
export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a gain for decibels. @param {number} db @returns {number} */
export const dB = (db) => 10 ** (db / 20);

/** Returns a pitch ratio for cents. @param {number} cents @returns {number} */
export const cents = (cents) => 2 ** (cents / 1200);

/** Returns the pitch of a MIDI note, 69 being A at 440 Hz. @param {number} note @returns {number} */
export const hz = (note) => 440 * 2 ** ((note - 69) / 12);

// --- Envelopes ----------------------------------------------------------

/**
 * Returns a curve through points, each a time in seconds and a value, held
 * after its last. Between two points it moves in a straight line, or, with
 * `curve` above 1, bends toward the later point's value early (a fast
 * attack or a fast fall), and below 1 late.
 *
 * @param {readonly (readonly [number, number])[]} points
 * @param {number} seconds
 * @param {number} [curve]
 * @returns {Signal}
 */
export function points(points, seconds, curve = 1) {
  const out = new Float64Array(samples(seconds));
  let k = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    while (k + 1 < points.length && t >= (points[k + 1]?.[0] ?? Infinity)) k++;
    const a = points[k] ?? [0, 0];
    const b = points[k + 1];
    if (!b || t < a[0]) {
      out[i] = t < a[0] ? (points[0]?.[1] ?? 0) : a[1];
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
 *
 * @param {number} attack
 * @param {number} decay
 * @param {number} seconds
 * @returns {Signal}
 */
export function perc(attack, decay, seconds) {
  const out = new Float64Array(samples(seconds));
  const rate = Math.log(1000) / Math.max(1e-6, decay);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = t < attack ? t / attack : Math.exp(-(t - attack) * rate);
  }
  return out;
}

/**
 * Returns a held envelope: attack, decay to a sustain level, held until
 * `hold` seconds, then a release.
 *
 * @param {{ attack: number, decay: number, sustain: number, hold: number, release: number }} shape
 * @param {number} seconds
 * @returns {Signal}
 */
export function adsr({ attack, decay, sustain, hold, release }, seconds) {
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
 * over a time, then held.
 *
 * @param {number} from
 * @param {number} to
 * @param {number} over
 * @param {number} seconds
 * @param {number} [curve] Above 1 moves most of the way early.
 * @returns {Signal}
 */
export function glide(from, to, over, seconds, curve = 1) {
  const out = new Float64Array(samples(seconds));
  const ratio = to / from;
  for (let i = 0; i < out.length; i++) {
    const share = Math.min(1, i / SR / over);
    out[i] = from * ratio ** (1 - (1 - share) ** curve);
  }
  return out;
}

/**
 * Returns a slow wobble about a middle: a sine, for vibrato or tremolo.
 *
 * @param {number} middle
 * @param {number} depth
 * @param {number} rate In Hz.
 * @param {number} seconds
 * @param {number} [phase] In turns.
 * @returns {Signal}
 */
export function lfo(middle, depth, rate, seconds, phase = 0) {
  const out = new Float64Array(samples(seconds));
  for (let i = 0; i < out.length; i++) {
    out[i] = middle + depth * Math.sin(TAU * (rate * (i / SR) + phase));
  }
  return out;
}

// --- Sources ------------------------------------------------------------

/**
 * Smooths the step of a naive saw or square near its jump, so it doesn't
 * alias.
 *
 * @param {number} phase From 0 to 1.
 * @param {number} step The phase a sample moves.
 * @returns {number}
 */
function blep(phase, step) {
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

/**
 * Returns an oscillator: a sine, a triangle, a saw or a pulse, its pitch
 * free to move.
 *
 * @param {"sine" | "tri" | "saw" | "pulse"} shape
 * @param {Param} freq In Hz.
 * @param {number} seconds
 * @param {{ phase?: number, width?: Param }} [how] Its starting phase, in turns, and a pulse's width, 0.5 for a square.
 * @returns {Signal}
 */
export function osc(shape, freq, seconds, { phase = 0, width = 0.5 } = {}) {
  const out = new Float64Array(samples(seconds));
  let p = phase % 1;
  for (let i = 0; i < out.length; i++) {
    const step = Math.min(0.49, Math.max(0, at(freq, i) / SR));
    switch (shape) {
      case "sine":
        out[i] = Math.sin(TAU * p);
        break;
      case "saw":
        out[i] = 2 * p - 1 - blep(p, step);
        break;
      case "pulse": {
        const w = at(width, i);
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
 * Returns a tone whose phase another tone bends: a carrier, and a modulator
 * at a ratio of its pitch, bending it by an index that may move. Low
 * indexes are warm, high ones metallic; ratios off whole numbers ring like
 * bells and struck metal.
 *
 * @param {Param} freq The carrier's pitch, in Hz.
 * @param {number} ratio The modulator's pitch over the carrier's.
 * @param {Param} index How far the modulator bends the phase, in radians.
 * @param {number} seconds
 * @param {{ feedback?: number }} [how] How much of the modulator feeds itself, which roughens it toward noise.
 * @returns {Signal}
 */
export function fm(freq, ratio, index, seconds, { feedback = 0 } = {}) {
  const out = new Float64Array(samples(seconds));
  let pc = 0;
  let pm = 0;
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const f = at(freq, i);
    const m = Math.sin(TAU * pm + feedback * last);
    last = m;
    out[i] = Math.sin(TAU * pc + at(index, i) * m);
    pc += f / SR;
    pm += (f * ratio) / SR;
    if (pc >= 1) pc -= 1;
    if (pm >= 1) pm -= 1;
  }
  return out;
}

/**
 * Returns noise: white (flat, hissy), pink (even by octave, natural) or
 * brown (dark, rumbling), from a seed.
 *
 * @param {"white" | "pink" | "brown"} color
 * @param {number} seconds
 * @param {number} seed
 * @returns {Signal}
 */
export function noise(color, seconds, seed) {
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
  // Pink: seven noises of their own, each dulled by a one-pole low-pass,
  // their corners a factor of three apart from 15 Hz up, each brought to the
  // same loudness. Power that is even across such corners falls 3 dB an
  // octave between them, which is what pink is.
  const corners = [15, 45, 135, 405, 1215, 3645, 10935];
  const held = new Float64Array(corners.length);
  const coefficients = corners.map((corner) => 1 - Math.exp((-TAU * corner) / SR));
  const levels = coefficients.map((a) => Math.sqrt((2 - a) / a));
  const scale = 0.3 / Math.sqrt(corners.length) / 1.8;
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let k = 0; k < corners.length; k++) {
      const a = coefficients[k] ?? 0;
      held[k] = (held[k] ?? 0) + a * ((random() * 2 - 1) * 1.732 - (held[k] ?? 0));
      sum += (held[k] ?? 0) * (levels[k] ?? 0);
    }
    out[i] = sum * scale;
  }
  return out;
}

/**
 * Returns the sum of struck partials: each a sine at its own pitch that
 * dies away at its own rate, as a rung thing's modes do. Partials at whole
 * multiples sound like a string or a pipe; scattered ones like stone,
 * glass or metal; long decays ring and short ones knock.
 *
 * @param {readonly { freq: number, decay: number, gain?: number, phase?: number, bend?: number }[]} partials
 *   Each partial's pitch in Hz, the seconds it takes to fall 60 dB, its
 *   level, its starting phase in turns, and how many cents it falls over
 *   its decay (a struck thing's pitch drops a little as it rings).
 * @param {number} seconds
 * @returns {Signal}
 */
export function modes(partials, seconds) {
  const out = new Float64Array(samples(seconds));
  for (const { freq, decay, gain = 1, phase = 0, bend = 0 } of partials) {
    if (freq >= SR / 2) continue;
    const rate = Math.log(1000) / Math.max(1e-6, decay);
    let p = phase;
    const n = Math.min(out.length, samples(decay * 1.2));
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = bend ? freq * 2 ** ((-bend * Math.min(1, t / decay)) / 1200) : freq;
      out[i] = (out[i] ?? 0) + gain * Math.sin(TAU * p) * Math.exp(-t * rate);
      p += f / SR;
    }
  }
  return out;
}

/**
 * Returns a plucked string: a burst of noise in a loop a period long, which
 * a gentle filter dulls a little each time round.
 *
 * @param {number} freq
 * @param {number} seconds
 * @param {{ damp?: number, seed?: number, decay?: number }} [how] How dull the string is, 0 bright to 1 dull, and how long it rings.
 * @returns {Signal}
 */
export function pluck(freq, seconds, { damp = 0.5, seed = 1, decay = 1 } = {}) {
  const out = new Float64Array(samples(seconds));
  const period = Math.max(2, Math.round(SR / freq));
  const random = seeded(seed);
  const line = new Float64Array(period);
  for (let i = 0; i < period; i++) line[i] = random() * 2 - 1;
  const keep = 10 ** (-3 / (decay * freq));
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const k = i % period;
    const v = line[k] ?? 0;
    out[i] = v;
    last = (1 - damp * 0.5) * v + damp * 0.5 * last;
    line[k] = last * keep;
  }
  return out;
}

// --- Mixing -------------------------------------------------------------

/**
 * Returns a signal scaled by a gain that may move.
 *
 * @param {Signal} x
 * @param {Param} amount
 * @returns {Signal}
 */
export function gain(x, amount) {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = (x[i] ?? 0) * at(amount, i);
  return out;
}

/**
 * Returns signals summed, each from its own start and at its own level, as
 * long as the one that ends last.
 *
 * @param {readonly (Signal | { x: Signal, at?: number, gain?: number })[]} layers
 * @returns {Signal}
 */
export function mix(layers) {
  const parts = layers.map((layer) =>
    layer instanceof Float64Array ? { x: layer, at: 0, gain: 1 } : { at: 0, gain: 1, ...layer },
  );
  const length = Math.max(...parts.map(({ x, at: start }) => x.length + Math.round(start * SR)));
  const out = new Float64Array(length);
  for (const { x, at: start, gain: level } of parts) {
    const offset = Math.round(start * SR);
    for (let i = 0; i < x.length; i++) {
      out[offset + i] = (out[offset + i] ?? 0) + (x[i] ?? 0) * level;
    }
  }
  return out;
}

/**
 * Returns a signal cut or padded to a length.
 *
 * @param {Signal} x
 * @param {number} seconds
 * @returns {Signal}
 */
export function fit(x, seconds) {
  const out = new Float64Array(samples(seconds));
  out.set(x.subarray(0, out.length));
  return out;
}

/**
 * Returns a signal faded in and out at its ends, so it never clicks.
 *
 * @param {Signal} x
 * @param {number} fadeIn In seconds.
 * @param {number} fadeOut In seconds.
 * @returns {Signal}
 */
export function fade(x, fadeIn, fadeOut) {
  const out = Float64Array.from(x);
  const a = Math.min(x.length, Math.round(fadeIn * SR));
  const b = Math.min(x.length, Math.round(fadeOut * SR));
  for (let i = 0; i < a; i++) out[i] = (out[i] ?? 0) * (i / a);
  for (let i = 0; i < b; i++) {
    const k = x.length - 1 - i;
    out[k] = (out[k] ?? 0) * (0.5 - 0.5 * Math.cos((Math.PI * i) / b));
  }
  return out;
}

/**
 * Returns a signal played faster or slower, its pitch moving with its
 * speed, as a sample played at another rate is.
 *
 * @param {Signal} x
 * @param {number} ratio Above 1 is higher and shorter.
 * @returns {Signal}
 */
export function resample(x, ratio) {
  const out = new Float64Array(Math.max(1, Math.floor(x.length / ratio)));
  for (let i = 0; i < out.length; i++) {
    const p = i * ratio;
    const k = Math.floor(p);
    const f = p - k;
    const a = x[k - 1] ?? x[k] ?? 0;
    const b = x[k] ?? 0;
    const c = x[k + 1] ?? b;
    const d = x[k + 2] ?? c;
    // A cubic through four neighbours.
    out[i] =
      b +
      0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
  }
  return out;
}

/**
 * Returns a signal turned back to front.
 *
 * @param {Signal} x
 * @returns {Signal}
 */
export function reversed(x) {
  return Float64Array.from(x).reverse();
}

// --- Filters ------------------------------------------------------------

/**
 * Returns a signal through a filter whose cutoff and resonance may move:
 * low-pass, high-pass, band-pass (at an even peak whatever its width),
 * notch or peak.
 *
 * @param {Signal} x
 * @param {"lp" | "hp" | "bp" | "notch"} type
 * @param {Param} cutoff In Hz.
 * @param {Param} [q] Its resonance: 0.707 is flat, 4 rings, 20 whistles.
 * @returns {Signal}
 */
export function filter(x, type, cutoff, q = 0.707) {
  const out = new Float64Array(x.length);
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = Math.min(SR * 0.45, Math.max(10, at(cutoff, i)));
    const g = Math.tan((Math.PI * fc) / SR);
    const k = 1 / Math.max(0.05, at(q, i));
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v0 = x[i] ?? 0;
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] =
      type === "lp" ? v2 : type === "bp" ? k * v1 : type === "hp" ? v0 - k * v1 - v2 : v0 - k * v1;
  }
  return out;
}

/**
 * Returns a signal with its lows or its highs lifted or cut, by a shelf.
 *
 * @param {Signal} x
 * @param {"low" | "high"} side
 * @param {number} freq The shelf's corner, in Hz.
 * @param {number} db How much it lifts, or cuts if negative.
 * @returns {Signal}
 */
export function shelf(x, side, freq, db) {
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

/**
 * Returns a signal through a fixed two-pole, two-zero filter.
 *
 * @param {Signal} x
 * @param {readonly [number, number, number, number, number]} c Its b0, b1, b2, a1 and a2.
 * @returns {Signal}
 */
export function biquad(x, [b0, b1, b2, a1, a2]) {
  const out = new Float64Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i] ?? 0;
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
 * Returns a signal rung through a bank of resonators, each at its own
 * pitch and decay: what a hollow or solid thing does to whatever strikes
 * or scrapes it. Unlike `modes()`, which is struck once, this takes any
 * signal, so noise through it sounds like the thing being scraped,
 * shattered or blown.
 *
 * @param {Signal} x
 * @param {readonly { freq: number, decay: number, gain?: number }[]} partials
 * @param {number} [tail] Seconds added for the ringing to die in.
 * @returns {Signal}
 */
export function resonate(x, partials, tail = 0) {
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
      out[i] = (out[i] ?? 0) + y;
    }
  }
  return out;
}

/**
 * Returns a signal through a comb: itself, delayed and fed back, which
 * rings at the pitch its delay sets, or thickens a sound when the delay is
 * swept. With `damp`, each pass round loses highs.
 *
 * @param {Signal} x
 * @param {Param} seconds The delay, which may move, in seconds.
 * @param {number} feedback From -0.98 to 0.98.
 * @param {{ damp?: number, tail?: number, mix?: number }} [how]
 * @returns {Signal}
 */
export function comb(x, seconds, feedback, { damp = 0, tail = 0, mix: wet = 1 } = {}) {
  const out = new Float64Array(x.length + (tail ? samples(tail) : 0));
  const size = 1 << 16;
  const line = new Float64Array(size);
  let write = 0;
  let low = 0;
  for (let i = 0; i < out.length; i++) {
    const delay = Math.min(size - 4, Math.max(1, at(seconds, i) * SR));
    const read = write - delay;
    const k = Math.floor(read);
    const f = read - k;
    const a = line[(k + size) & (size - 1)] ?? 0;
    const b = line[(k + 1 + size) & (size - 1)] ?? 0;
    const delayed = a + (b - a) * f;
    low = delayed * (1 - damp) + low * damp;
    const v = (x[i] ?? 0) + low * feedback;
    line[write & (size - 1)] = v;
    write++;
    out[i] = (x[i] ?? 0) * (1 - wet) + delayed * wet;
  }
  return out;
}

// --- Shaping ------------------------------------------------------------

/**
 * Returns a signal driven into a soft clip, which thickens it with
 * harmonics and evens its peaks: warmth at a drive of 1 to 2, grit above 4.
 *
 * @param {Signal} x
 * @param {Param} amount How hard it is driven.
 * @returns {Signal}
 */
export function drive(x, amount) {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const d = at(amount, i);
    out[i] = Math.tanh((x[i] ?? 0) * d) / Math.tanh(Math.max(1e-3, d));
  }
  return out;
}

/**
 * Returns a signal folded back on itself wherever it passes full scale,
 * which adds a bright, glassy buzz that grows with the drive.
 *
 * @param {Signal} x
 * @param {Param} amount
 * @returns {Signal}
 */
export function fold(x, amount) {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    out[i] = Math.sin(((x[i] ?? 0) * at(amount, i) * Math.PI) / 2);
  }
  return out;
}

/**
 * Returns a signal held for several samples at a time and cut to fewer
 * levels: the grit of an old sound chip, to use sparingly.
 *
 * @param {Signal} x
 * @param {number} hold How many samples each value is held.
 * @param {number} [bits] How many bits its levels take.
 * @returns {Signal}
 */
export function crush(x, hold, bits = 16) {
  const out = new Float64Array(x.length);
  const levels = 2 ** (bits - 1);
  let held = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % hold === 0) held = Math.round((x[i] ?? 0) * levels) / levels;
    out[i] = held;
  }
  return out;
}

// --- Space --------------------------------------------------------------

/**
 * Returns a signal with echoes: itself again after a time, fainter each
 * time, each echo duller if told.
 *
 * @param {Signal} x
 * @param {{ time: number, feedback?: number, mix?: number, damp?: number, tail?: number }} how
 * @returns {Signal}
 */
export function echo(x, { time, feedback = 0.35, mix: wet = 0.3, damp = 0.3, tail = time * 4 }) {
  const delayed = comb(x, time, feedback, { damp, tail });
  const out = new Float64Array(delayed.length);
  for (let i = 0; i < out.length; i++) out[i] = (x[i] ?? 0) + (delayed[i] ?? 0) * wet;
  return out;
}

/** The delays of the reverb's combs and all-passes, in samples at 44.1 kHz, none a multiple of another. */
const COMBS = [1117, 1193, 1277, 1361, 1433, 1499, 1559, 1621];
const ALLPASSES = [557, 443, 349, 229];

/**
 * Returns one channel of a small room's reverb: early taps, then eight
 * damped combs side by side, then four all-passes in a row to smear them.
 *
 * @param {Signal} x
 * @param {number} decay Seconds for the tail to fall 60 dB.
 * @param {number} damp How fast its highs die, 0 to 1.
 * @param {number} size The room's size against the stock one, 0.5 to 2.
 * @param {number} spread Samples added to each delay, for a second channel.
 * @returns {Signal}
 */
function room(x, decay, damp, size, spread) {
  const length = x.length + samples(decay * 1.1);
  const wet = new Float64Array(length);
  for (const base of COMBS) {
    const delay = Math.round(base * size) + spread;
    const fb = 10 ** ((-3 * delay) / (decay * SR));
    const line = new Float64Array(delay);
    let low = 0;
    for (let i = 0; i < length; i++) {
      const k = i % delay;
      const out = line[k] ?? 0;
      low = out * (1 - damp) + low * damp;
      line[k] = (x[i] ?? 0) + low * fb;
      wet[i] = (wet[i] ?? 0) + out;
    }
  }
  let y = wet;
  for (const base of ALLPASSES) {
    const delay = Math.round(base * size) + spread;
    const line = new Float64Array(delay);
    const next = new Float64Array(length);
    for (let i = 0; i < length; i++) {
      const k = i % delay;
      const held = line[k] ?? 0;
      const v = y[i] ?? 0;
      next[i] = held - v * 0.5;
      line[k] = v + held * 0.5;
    }
    y = next;
  }
  for (let i = 0; i < length; i++) y[i] = (y[i] ?? 0) * 0.12;
  return y;
}

/**
 * Returns a signal in a room: itself, dry, with the room's tail under it.
 * A little (a mix of 0.1 to 0.2, a decay under half a second) is what keeps
 * a synthesized sound from stopping dead.
 *
 * @param {Signal} x
 * @param {{ decay?: number, mix?: number, damp?: number, size?: number, predelay?: number }} [how]
 * @returns {Signal}
 */
export function reverb(x, { decay = 0.4, mix: wet = 0.15, damp = 0.4, size = 1, predelay = 0.008 } = {}) {
  const tail = room(x, decay, damp, size, 0);
  return mix([x, { x: tail, at: predelay, gain: wet }]);
}

/**
 * Returns a signal in a room, in stereo: the same dry signal in both ears,
 * the room's tail a little different in each, which is what makes it wide.
 *
 * @param {Signal} x
 * @param {{ decay?: number, mix?: number, damp?: number, size?: number, predelay?: number }} [how]
 * @returns {[Signal, Signal]}
 */
export function reverbStereo(x, { decay = 1.2, mix: wet = 0.25, damp = 0.4, size = 1.2, predelay = 0.012 } = {}) {
  return [
    mix([x, { x: room(x, decay, damp, size, 0), at: predelay, gain: wet }]),
    mix([x, { x: room(x, decay, damp, size, 23), at: predelay, gain: wet }]),
  ];
}

// --- Dynamics -----------------------------------------------------------

/**
 * Returns a signal with its loud parts turned down: above a threshold, each
 * decibel in comes out as a fraction of one. It evens a sound's body under
 * its attack, and glues layers into one.
 *
 * @param {Signal} x
 * @param {{ threshold?: number, ratio?: number, attack?: number, release?: number, makeup?: number }} [how] The threshold and makeup in dB, the times in seconds.
 * @returns {Signal}
 */
export function compress(x, { threshold = -18, ratio = 3, attack = 0.003, release = 0.08, makeup = 0 } = {}) {
  const out = new Float64Array(x.length);
  const up = Math.exp(-1 / (attack * SR));
  const down = Math.exp(-1 / (release * SR));
  let level = 0;
  for (let i = 0; i < x.length; i++) {
    const v = Math.abs(x[i] ?? 0);
    level = v > level ? up * level + (1 - up) * v : down * level + (1 - down) * v;
    const db = 20 * Math.log10(Math.max(1e-9, level));
    const over = Math.max(0, db - threshold);
    out[i] = (x[i] ?? 0) * dB(makeup - over * (1 - 1 / ratio));
  }
  return out;
}

/**
 * Returns a signal that never passes a ceiling: it looks a few
 * milliseconds ahead and turns down before a peak arrives, so nothing
 * clips and nothing distorts.
 *
 * @param {Signal} x
 * @param {number} [ceiling] In dB below full scale.
 * @param {number} [release] In seconds.
 * @returns {Signal}
 */
export function limit(x, ceiling = -1, release = 0.06) {
  const top = dB(ceiling);
  const ahead = Math.round(0.004 * SR);
  const out = new Float64Array(x.length);
  const down = Math.exp(-1 / (release * SR));
  let g = 1;
  for (let i = 0; i < x.length; i++) {
    let peak = 0;
    for (let k = 0; k <= ahead; k++) peak = Math.max(peak, Math.abs(x[i + k] ?? 0));
    const want = peak > top ? top / peak : 1;
    g = want < g ? want : Math.min(1, down * g + (1 - down) * want);
    out[i] = (x[i] ?? 0) * Math.min(g, want);
  }
  return out;
}

/**
 * Returns a signal scaled so its loudest sample is at a level.
 *
 * @param {Signal} x
 * @param {number} [db] The level, in dB below full scale.
 * @returns {Signal}
 */
export function normalize(x, db = -1) {
  let loudest = 0;
  for (let i = 0; i < x.length; i++) loudest = Math.max(loudest, Math.abs(x[i] ?? 0));
  if (!(loudest > 0 && Number.isFinite(loudest))) {
    throw new Error("A sound is silent or not a number.");
  }
  return gain(x, dB(db) / loudest);
}

/**
 * Returns a signal with whatever holds it off the middle taken out: a
 * gentle high-pass at 20 Hz, so a sound starts and ends at zero.
 *
 * @param {Signal} x
 * @returns {Signal}
 */
export function centered(x) {
  return filter(x, "hp", 20, 0.707);
}

// --- Texture ------------------------------------------------------------

/**
 * Returns many small sounds scattered over a time: debris, crackle,
 * sparkle. Each grain is made by a function handed its number, a random
 * and how far through the scatter it falls, and is laid where the density
 * puts it: most grains early with `bias` above 1, late below.
 *
 * @param {{ count: number, seconds: number, seed: number, bias?: number, grain: (i: number, random: () => number, share: number) => Signal, level?: (share: number) => number }} how
 * @returns {Signal}
 */
export function scatter({ count, seconds, seed, bias = 2, grain, level = () => 1 }) {
  const random = seeded(seed);
  /** @type {{ x: Signal, at: number, gain: number }[]} */
  const layers = [];
  for (let i = 0; i < count; i++) {
    const share = random() ** bias;
    layers.push({ x: grain(i, random, share), at: share * seconds, gain: level(share) });
  }
  return mix(layers);
}

/**
 * Returns a looping sound's samples made to run on unbroken: its last
 * stretch faded into what came just before its start, at an even loudness.
 * Hand it a signal longer than the loop by the overlap.
 *
 * @param {Signal} x
 * @param {number} seconds The loop's length.
 * @param {number} [overlap] The stretch that is faded, in seconds.
 * @returns {Signal}
 */
export function looped(x, seconds, overlap = 0.25) {
  const n = samples(seconds);
  const o = Math.min(samples(overlap), x.length - n);
  const out = Float64Array.from(x.subarray(o, o + n));
  for (let i = 0; i < o; i++) {
    const into = ((i / o) * Math.PI) / 2;
    const k = n - o + i;
    out[k] = Math.cos(into) * (out[k] ?? 0) + Math.sin(into) * (x[i] ?? 0);
  }
  return out;
}

// --- Files --------------------------------------------------------------

/**
 * Returns a 16-bit PCM WAV file of one channel or two, dithered, so a quiet
 * tail fades into noise too faint to hear rather than into steps.
 *
 * @param {Signal | [Signal, Signal]} channels
 * @param {number} [seed]
 * @returns {Buffer}
 */
export function wav(channels, seed = 7) {
  const list = channels instanceof Float64Array ? [channels] : channels;
  const count = list.length;
  const length = Math.max(...list.map((c) => c.length));
  const data = length * count * 2;
  const file = Buffer.alloc(44 + data);
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
      file.writeInt16LE(Math.round(v * 32767), 44 + (i * count + c) * 2);
    }
  }
  return file;
}
