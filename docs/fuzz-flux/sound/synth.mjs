/**
 * Makes sound from arithmetic alone: oscillators, noise, envelopes, filters
 * and a small room, each a plain function over an array of samples.
 *
 * It runs the same in Node, which writes the sounds to files, and in a
 * browser, which plays them, so the design's sounds are heard as written.
 */

/** Samples a second. */
export const SR = 44100;

/**
 * A value fixed for the whole sound, or one that changes over its seconds.
 * @typedef {number | ((t: number) => number)} Over
 */

/**
 * Returns the value of something that may change over time, at one moment.
 * @param {Over} v
 * @param {number} t Seconds from the sound's start.
 * @returns {number}
 */
function now(v, t) {
  return typeof v === "function" ? v(t) : v;
}

/**
 * Returns a silent buffer.
 * @param {number} seconds
 * @returns {Float32Array}
 */
export function silence(seconds) {
  return new Float32Array(Math.max(1, Math.round(seconds * SR)));
}

/**
 * Returns the frequency of a MIDI note, 69 being the A above middle C.
 * @param {number} note
 * @returns {number}
 */
export function hz(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

/**
 * Returns a glide between two values that covers most of its way early.
 * @param {number} from
 * @param {number} to
 * @param {number} seconds How long until it is two-thirds of the way.
 * @returns {(t: number) => number}
 */
export function glide(from, to, seconds) {
  return (t) => to + (from - to) * Math.exp(-t / seconds);
}

/**
 * Returns a straight ramp between two values, held at its end.
 * @param {number} from
 * @param {number} to
 * @param {number} seconds
 * @returns {(t: number) => number}
 */
export function ramp(from, to, seconds) {
  return (t) => (t >= seconds ? to : from + ((to - from) * t) / seconds);
}

/**
 * Returns an oscillator's samples.
 * @param {'sine' | 'triangle' | 'square' | 'saw'} shape
 * @param {Over} freq In hertz.
 * @param {number} seconds
 * @returns {Float32Array}
 */
export function tone(shape, freq, seconds) {
  const out = silence(seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const f = now(freq, i / SR);
    phase += f / SR;
    phase -= Math.floor(phase);
    if (shape === "sine") out[i] = Math.sin(phase * 2 * Math.PI);
    else if (shape === "triangle") out[i] = 1 - 4 * Math.abs(phase - 0.5);
    else if (shape === "square") out[i] = phase < 0.5 ? 1 : -1;
    else out[i] = 2 * phase - 1;
  }
  return out;
}

/**
 * Returns a note built from a few sine partials, which never aliases the way
 * a raw saw does at a fuzzball's high pitch.
 * @param {Over} freq
 * @param {number} seconds
 * @param {number} [top] No partial above this many hertz.
 * @param {number} [tilt] How fast the partials fall away: 1 is a saw's.
 * @returns {Float32Array}
 */
export function buzz(freq, seconds, top = 7000, tilt = 1) {
  const out = silence(seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const f = now(freq, i / SR);
    phase += f / SR;
    phase -= Math.floor(phase);
    const count = Math.max(1, Math.min(24, Math.floor(top / f)));
    let v = 0;
    for (let n = 1; n <= count; n++)
      v += Math.sin(phase * 2 * Math.PI * n) / n ** tilt;
    out[i] = v * 0.6;
  }
  return out;
}

/**
 * Returns white noise, the same every time for a seed.
 * @param {number} seconds
 * @param {number} [seed]
 * @returns {Float32Array}
 */
export function noise(seconds, seed = 1) {
  const out = silence(seconds);
  let a = (seed * 2654435761) >>> 0 || 1;
  for (let i = 0; i < out.length; i++) {
    a ^= a << 13;
    a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5;
    a >>>= 0;
    out[i] = a / 2147483648 - 1;
  }
  return out;
}

/**
 * Shapes a sound's loudness: up in `attack` seconds, held, then dying away.
 * @param {Float32Array} buf Changed in place.
 * @param {object} o
 * @param {number} [o.attack] Seconds to full.
 * @param {number} [o.hold] Seconds at full.
 * @param {number} o.decay Seconds to fall to about a third.
 * @param {number} [o.curve] Above 1 the attack bows in softly.
 * @returns {Float32Array}
 */
export function shape(buf, { attack = 0.003, hold = 0, decay, curve = 1 }) {
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    let g;
    if (t < attack) g = (t / attack) ** curve;
    else if (t < attack + hold) g = 1;
    else g = Math.exp(-(t - attack - hold) / decay);
    buf[i] *= g;
  }
  return buf;
}

/**
 * Scales a sound by a gain that may change over time.
 * @param {Float32Array} buf Changed in place.
 * @param {Over} g
 * @returns {Float32Array}
 */
export function gain(buf, g) {
  for (let i = 0; i < buf.length; i++) buf[i] *= now(g, i / SR);
  return buf;
}

/**
 * Filters a sound with a state-variable filter, whose corner may sweep.
 * @param {Float32Array} buf
 * @param {'low' | 'high' | 'band'} kind
 * @param {Over} freq The corner or the center, in hertz.
 * @param {number} [q] The resonance: 0.7 is flat, higher rings.
 * @returns {Float32Array} A new buffer.
 */
export function filter(buf, kind, freq, q = 0.707) {
  const out = new Float32Array(buf.length);
  let ic1 = 0;
  let ic2 = 0;
  const k = 1 / q;
  for (let i = 0; i < buf.length; i++) {
    const f = Math.min(now(freq, i / SR), SR * 0.45);
    const g = Math.tan((Math.PI * f) / SR);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = buf[i] - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    if (kind === "low") out[i] = v2;
    else if (kind === "band") out[i] = v1 * k;
    else out[i] = buf[i] - k * v1 - v2;
  }
  return out;
}

/**
 * Adds one sound into another.
 * @param {Float32Array} into Changed in place.
 * @param {Float32Array} src
 * @param {number} [at] Seconds into `into`.
 * @param {number} [level] A gain.
 * @returns {Float32Array}
 */
export function add(into, src, at = 0, level = 1) {
  const start = Math.round(at * SR);
  const end = Math.min(into.length, start + src.length);
  for (let i = Math.max(0, start); i < end; i++)
    into[i] += src[i - start] * level;
  return into;
}

/**
 * Lays sounds over one another, each at its own moment and level.
 * @param {[buf: Float32Array, at?: number, level?: number][]} parts
 * @param {number} [tail] Seconds of silence kept after the last one ends.
 * @returns {Float32Array}
 */
export function layer(parts, tail = 0) {
  let seconds = 0;
  for (const [buf, at = 0] of parts)
    seconds = Math.max(seconds, at + buf.length / SR);
  const out = silence(seconds + tail);
  for (const [buf, at = 0, level = 1] of parts) add(out, buf, at, level);
  return out;
}

/**
 * Rounds a sound's loud peaks off, which thickens it a little.
 * @param {Float32Array} buf Changed in place.
 * @param {number} [drive]
 * @returns {Float32Array}
 */
export function warm(buf, drive = 1.5) {
  const norm = Math.tanh(drive);
  for (let i = 0; i < buf.length; i++)
    buf[i] = Math.tanh(buf[i] * drive) / norm;
  return buf;
}

/**
 * Puts a sound in a small soft room.
 * @param {Float32Array} buf
 * @param {object} [o]
 * @param {number} [o.seconds] How long the room rings.
 * @param {number} [o.wet] How much of the room is mixed in.
 * @param {number} [o.dark] The hertz above which the room is dull.
 * @returns {Float32Array} A new buffer, longer by the room's ring.
 */
export function room(buf, { seconds = 0.5, wet = 0.2, dark = 3800 } = {}) {
  const out = silence(buf.length / SR + seconds);
  const wetBuf = new Float32Array(out.length);
  const combs = [0.0297, 0.0371, 0.0411, 0.0437];
  for (const delay of combs) {
    const d = Math.round(delay * SR);
    const feedback = 10 ** ((-3 * delay) / seconds);
    const line = new Float32Array(out.length);
    let low = 0;
    const a = Math.exp((-2 * Math.PI * dark) / SR);
    for (let i = 0; i < out.length; i++) {
      const dry = i < buf.length ? buf[i] : 0;
      const back = i >= d ? line[i - d] : 0;
      low = back * (1 - a) + low * a;
      line[i] = dry + low * feedback;
      wetBuf[i] += back * 0.25;
    }
  }
  for (const delay of [0.005, 0.0017]) {
    const d = Math.round(delay * SR);
    const pass = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) {
      const back = i >= d ? pass[i - d] : 0;
      const inp = wetBuf[i];
      pass[i] = inp + back * 0.5;
      wetBuf[i] = back - inp * 0.5;
    }
  }
  for (let i = 0; i < out.length; i++)
    out[i] = (i < buf.length ? buf[i] : 0) + wetBuf[i] * wet;
  return out;
}

/**
 * Finishes a sound: takes out any offset, sets its loudest peak, cuts the
 * tail once it has died away, and fades its two ends so that it never clicks.
 * @param {Float32Array} buf
 * @param {number} peakDb The peak, in decibels under full scale, as a negative number.
 * @param {number} [fadeOut] Seconds.
 * @returns {Float32Array} The same samples, shortened.
 */
export function finish(buf, peakDb, fadeOut = 0.012) {
  let mean = 0;
  for (let i = 0; i < buf.length; i++) mean += buf[i];
  mean /= buf.length;
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    buf[i] -= mean;
    peak = Math.max(peak, Math.abs(buf[i]));
  }
  const g = peak > 0 ? 10 ** (peakDb / 20) / peak : 0;
  // What is left under -52 dBFS is cut, however long a room would ring on.
  const floor = 10 ** (-52 / 20);
  let end = buf.length - 1;
  while (end > 0 && Math.abs(buf[end] * g) < floor) end--;
  const out = buf.subarray(
    0,
    Math.min(buf.length, end + Math.round(fadeOut * SR)),
  );
  const fadeIn = Math.round(0.0015 * SR);
  const tail = Math.min(out.length, Math.round(fadeOut * SR));
  for (let i = 0; i < out.length; i++) {
    let fade = 1;
    if (i < fadeIn) fade = i / fadeIn;
    const left = out.length - 1 - i;
    if (left < tail) fade *= left / tail;
    out[i] *= g * fade;
  }
  return out;
}

/**
 * Cuts the silence off a sound's end.
 * @param {Float32Array} buf
 * @param {number} [floorDb] What counts as silence.
 * @returns {Float32Array}
 */
export function trim(buf, floorDb = -66) {
  const floor = 10 ** (floorDb / 20);
  let end = buf.length - 1;
  while (end > 0 && Math.abs(buf[end]) < floor) end--;
  return buf.slice(0, Math.min(buf.length, end + Math.round(0.01 * SR)));
}

/**
 * Returns a sound as the bytes of a 16-bit mono WAV file.
 * @param {Float32Array} buf
 * @returns {Uint8Array}
 */
export function wav(buf) {
  const bytes = new Uint8Array(44 + buf.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (/** @type {number} */ at, /** @type {string} */ s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + buf.length * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, buf.length * 2, true);
  for (let i = 0; i < buf.length; i++) {
    const v = Math.max(-1, Math.min(1, buf[i]));
    view.setInt16(44 + i * 2, Math.round(v * 32767), true);
  }
  return bytes;
}
