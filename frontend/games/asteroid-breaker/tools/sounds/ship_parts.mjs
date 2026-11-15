// The parts the ship's, the pickups' and the stingers' sounds are built
// from: small instruments (a glass bell, a mallet, a sung tone, a pad), the
// textures laid over them (a click, a puff of air, sparkle, crackle), a tape
// that changes speed, and a phrase of notes in the game's key.

import {
  adsr,
  cents,
  degree,
  drive,
  filter,
  fit,
  fm,
  gain,
  mix,
  modes,
  noise,
  osc,
  perc,
  points,
  read,
  reverb,
  samples,
  scatter,
  seeded,
} from "@fz/dev/synth";

/** @import { Param, Signal } from "@fz/dev/synth" */

/**
 * Returns a parameter written out a sample at a time, scaled if told, so a
 * pitch that moves can be handed to a second voice a little off it.
 *
 * @param {Param} param
 * @param {number} seconds
 * @param {number} [times]
 * @returns {Signal}
 */
export function curve(param, seconds, times = 1) {
  const out = new Float64Array(samples(seconds));
  for (let i = 0; i < out.length; i++) out[i] = read(param, i) * times;
  return out;
}

/**
 * Returns a function that draws a number near 1, off by up to a share of it
 * either way: a take's own pitch, or its own decay.
 *
 * @param {() => number} random
 * @returns {(share: number) => number}
 */
export function varied(random) {
  return (share) => 1 + (random() * 2 - 1) * share;
}

/**
 * Returns only the room a sound would be heard in, without the sound
 * itself: its tail, for a sound that is an echo of another.
 *
 * @param {Signal} x
 * @param {{ decay?: number, damp?: number }} [how] The tail in seconds, and how fast its highs die.
 * @returns {Signal}
 */
export function roomOf(x, { decay = 0.3, damp = 0.4 } = {}) {
  return mix([reverb(x, { decay, mix: 1, damp }), { x, gain: -1 }]);
}

/**
 * Returns a click: a few milliseconds of bright noise, which says when.
 *
 * @param {number} seed
 * @param {{ seconds?: number, freq?: number }} [how] How long it takes to die, and the pitch its noise lies above, in Hz.
 * @returns {Signal}
 */
export function click(seed, { seconds = 0.004, freq = 2500 } = {}) {
  const length = seconds + 0.002;
  return gain(
    filter(noise("white", length, seed), "hp", freq, 0.7),
    perc(0.0002, seconds, length),
  );
}

/**
 * Returns a puff of air: noise in a band, which may move, that swells and
 * dies.
 *
 * @param {number} seed
 * @param {number} seconds
 * @param {{ freq: Param, q?: number, attack?: number, decay?: number, color?: "white" | "pink" | "brown" }} how
 *   The band's middle in Hz and its sharpness, the rise and the fall in
 *   seconds, and the noise it is cut from.
 * @returns {Signal}
 */
export function puff(
  seed,
  seconds,
  { freq, q = 1, attack = 0.005, decay = seconds, color = "white" },
) {
  return gain(
    filter(noise(color, seconds, seed), "bp", freq, q),
    perc(attack, decay, seconds),
  );
}

/**
 * Returns a small glass bell: a fundamental and a twin a few cents above
 * it, which beat as a shimmer, with an octave, a twelfth and a high partial
 * that die sooner, behind a soft attack and a breath of air.
 *
 * @param {number} freq
 * @param {number} ring How long it rings, in seconds.
 * @param {number} seed
 * @param {{ detune?: number, attack?: number, bright?: number, bend?: number }} [how]
 *   How far the twin sits above, in cents, the rise in seconds, how strong
 *   the upper partials are, and how many cents the bell falls as it rings.
 * @returns {Signal}
 */
export function glass(
  freq,
  ring,
  seed,
  { detune = 6, attack = 0.003, bright = 1, bend = 0 } = {},
) {
  const random = seeded(seed);
  const seconds = ring * 1.1;
  const body = modes(
    [
      { freq, decay: ring, gain: 1, bend },
      {
        freq: freq * cents(detune),
        decay: ring * 0.85,
        gain: 0.4,
        phase: random(),
        bend,
      },
      {
        freq: freq * 2.003,
        decay: ring * 0.55,
        gain: 0.3 * bright,
        phase: random(),
        bend,
      },
      {
        freq: freq * 3.01,
        decay: ring * 0.3,
        gain: 0.15 * bright,
        phase: random(),
        bend,
      },
      {
        freq: freq * 5.4,
        decay: ring * 0.12,
        gain: 0.07 * bright,
        phase: random(),
        bend,
      },
    ],
    seconds,
  );
  const air = puff(seed + 5, 0.03, {
    freq: Math.min(9000, freq * 6),
    q: 1.2,
    attack: 0.001,
    decay: 0.025,
  });
  return mix([
    gain(
      body,
      points(
        [
          [0, 0],
          [attack, 1],
        ],
        seconds,
      ),
    ),
    { x: air, gain: 0.1 * bright },
  ]);
}

/**
 * Returns a mallet's note, warm and round: a fundamental with a twin beside
 * it, a soft octave, the bar's own partial two octaves up that dies fast,
 * and the knock of the mallet's head, all driven a little.
 *
 * @param {number} freq
 * @param {number} ring How long it rings, in seconds.
 * @param {number} seed
 * @param {{ attack?: number, bright?: number }} [how] The rise in seconds, and how strong the upper partials and the knock are.
 * @returns {Signal}
 */
export function mallet(freq, ring, seed, { attack = 0.004, bright = 1 } = {}) {
  const random = seeded(seed);
  const seconds = ring * 1.1;
  const body = modes(
    [
      { freq, decay: ring, gain: 1 },
      { freq: freq * cents(4), decay: ring * 0.9, gain: 0.35, phase: 0.1 },
      { freq: freq * 2, decay: ring * 0.5, gain: 0.2 },
      {
        freq: freq * 3.98,
        decay: ring * 0.2,
        gain: 0.24 * bright,
        phase: random(),
      },
      {
        freq: freq * 9.1,
        decay: ring * 0.06,
        gain: 0.06 * bright,
        phase: random(),
      },
    ],
    seconds,
  );
  const knock = gain(
    filter(
      noise("pink", 0.014, seed + 3),
      "bp",
      Math.min(3200, freq * 2.5),
      0.9,
    ),
    perc(0.001, 0.012, 0.014),
  );
  return drive(
    mix([
      {
        x: gain(
          body,
          points(
            [
              [0, 0],
              [attack, 1],
            ],
            seconds,
          ),
        ),
        gain: 0.45,
      },
      { x: knock, gain: 1.2 * bright },
    ]),
    1.4,
  );
}

/**
 * Returns a mallet's note with a glass bell laid over it: the stingers'
 * and the menus' one instrument, a small celesta.
 *
 * @param {number} freq
 * @param {number} ring How long it rings, in seconds.
 * @param {number} seed
 * @param {number} [bright] How much of the bell is heard over the mallet.
 * @returns {Signal}
 */
export function keys(freq, ring, seed, bright = 1) {
  return mix([
    mallet(freq, ring, seed),
    {
      x: glass(freq, ring * 0.8, seed + 11, { attack: 0.004 }),
      gain: 0.3 * bright,
    },
  ]);
}

/**
 * Returns a sung tone whose pitch is free to move: a tone bent by itself
 * into a few warm harmonics, with a twin a few cents above it. It has no
 * shape of its own, so give it an envelope.
 *
 * @param {Param} freq In Hz.
 * @param {number} seconds
 * @param {{ index?: Param, ratio?: number, detune?: number }} [how]
 *   How rich it is (0.3 is nearly pure, 1.5 brassy), the modulator's pitch
 *   over its own, and how far the twin sits above, in cents.
 * @returns {Signal}
 */
export function sungTone(
  freq,
  seconds,
  { index = 0.7, ratio = 1, detune = 5 } = {},
) {
  return mix([
    { x: fm(curve(freq, seconds), ratio, index, seconds), gain: 0.7 },
    {
      x: fm(curve(freq, seconds, cents(detune)), ratio, index, seconds),
      gain: 0.3,
    },
  ]);
}

/**
 * Returns a pad's note: two saws a few cents apart over a triangle, dulled
 * by a low-pass that opens as it swells, held and let go.
 *
 * @param {number} freq
 * @param {number} seconds
 * @param {{ attack?: number, release?: number, bright?: number }} [how] The rise and the fall in seconds, and how far the low-pass opens.
 * @returns {Signal}
 */
export function pad(
  freq,
  seconds,
  { attack = 0.08, release = 0.3, bright = 1 } = {},
) {
  const saws = mix([
    { x: osc("saw", freq * cents(-7), seconds), gain: 0.4 },
    { x: osc("saw", freq * cents(7), seconds, { phase: 0.37 }), gain: 0.4 },
    { x: osc("tri", freq, seconds, { phase: 0.2 }), gain: 0.7 },
  ]);
  const top = Math.min(7000, freq * 3.2 * bright);
  const open = points(
    [
      [0, top * 0.4],
      [attack, top],
      [seconds, top * 0.6],
    ],
    seconds,
  );
  return gain(
    filter(saws, "lp", open, 0.8),
    adsr(
      {
        attack,
        decay: 0.1,
        sustain: 0.8,
        hold: seconds - release,
        release,
      },
      seconds,
    ),
  );
}

/**
 * Returns sparkle: tiny glass pings scattered over a time, each on a note
 * of the game's scale, so a shower of them is a chord and never a clash.
 *
 * @param {{ seconds: number, seed: number, count: number, low?: number, high?: number, ring?: number, bias?: number }} how
 *   How many pings over how long, the lowest and highest steps of the scale
 *   above C5 they are drawn from (10 is C7, 15 is C8), how long each rings,
 *   and how early most fall (above 1) or late (below).
 * @returns {Signal}
 */
export function sparkle({
  seconds,
  seed,
  count,
  low = 10,
  high = 16,
  ring = 0.07,
  bias = 1.3,
}) {
  return scatter({
    count,
    seconds,
    seed,
    bias,
    grain: (_i, random) => {
      const freq = degree(low + Math.floor(random() * (high - low + 1)));
      const length = ring * (0.7 + 0.6 * random());
      return gain(
        modes(
          [
            { freq, decay: length, gain: 0.6 + 0.4 * random() },
            { freq: freq * 2.01, decay: length * 0.4, gain: 0.18 },
          ],
          length * 1.1,
        ),
        points(
          [
            [0, 0],
            [0.001, 1],
          ],
          length * 1.1,
        ),
      );
    },
    level: (share) => 1 - 0.55 * share,
  });
}

/**
 * Returns crackle: clicks of noise scattered over a time, each in a narrow
 * band of its own, as static or small debris sounds.
 *
 * @param {{ seconds: number, seed: number, count: number, low?: number, high?: number, length?: number, bias?: number }} how
 *   How many clicks over how long, the band their pitches are drawn from,
 *   in Hz, a click's length in seconds, and how early most fall.
 * @returns {Signal}
 */
export function staticCrackle({
  seconds,
  seed,
  count,
  low = 1500,
  high = 7000,
  length = 0.004,
  bias = 1,
}) {
  return scatter({
    count,
    seconds,
    seed,
    bias,
    grain: (i, random) => {
      const freq = low * (high / low) ** random();
      const lasts = length * (0.5 + random());
      const level = 0.4 + 0.6 * random();
      return gain(
        filter(
          noise("white", lasts + 0.004, seed + 17 * i + 1),
          "bp",
          freq,
          1.5 + 3 * random(),
        ),
        gain(perc(0.0003, lasts, lasts + 0.004), level),
      );
    },
  });
}

/**
 * Returns a signal played at a speed that changes, its pitch moving with
 * its speed, as a record does when the turntable slows or spins back up.
 *
 * @param {Signal} x
 * @param {Param} rate Its speed at each moment of the result: 1 as written, 0.5 an octave down and half as fast.
 * @param {number} seconds The result's length.
 * @returns {Signal}
 */
export function warp(x, rate, seconds) {
  const out = new Float64Array(samples(seconds));
  let p = 0;
  for (let i = 0; i < out.length; i++) {
    const k = Math.floor(p);
    const f = p - k;
    const a = x[k] ?? 0;
    const b = x[k + 1] ?? 0;
    out[i] = a + (b - a) * f;
    p += read(rate, i);
  }
  return out;
}

/**
 * @typedef {object} Note A note of a phrase.
 * @property {number} step Its step of the scale above C5: 0 is C5, 5 is C6, -2 is G4.
 * @property {number} at When it starts, in seconds.
 * @property {number} ring How long it rings, in seconds.
 * @property {number} [gain] Its level, 1 unless given.
 */

/**
 * Returns a phrase: notes of the game's scale, each played by a voice at
 * its own time.
 *
 * @param {readonly Note[]} notes
 * @param {(freq: number, ring: number, seed: number) => Signal} voice
 * @param {number} seed
 * @returns {Signal}
 */
export function phrase(notes, voice, seed) {
  return mix(
    notes.map(({ step, at, ring, gain: level = 1 }, i) => ({
      x: voice(degree(step), ring, seed + 31 * i),
      at,
      gain: level,
    })),
  );
}

/**
 * Returns a sound in a small room, cut to a length: what every sound here
 * is finished with, so none stops dead and none runs on.
 *
 * @param {Signal} x
 * @param {number} seconds The length it is cut to.
 * @param {{ decay?: number, mix?: number, damp?: number }} [how] The room's tail in seconds, how much of it is heard, and how fast its highs die.
 * @returns {Signal}
 */
export function roomed(
  x,
  seconds,
  { decay = 0.3, mix: wet = 0.12, damp = 0.4 } = {},
) {
  return fit(reverb(x, { decay, mix: wet, damp }), seconds);
}
