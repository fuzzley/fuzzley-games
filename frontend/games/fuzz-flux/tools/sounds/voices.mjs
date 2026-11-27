// What the recipes share: the envelope each part of a sound is shaped by,
// a value that settles toward another, the voices several sounds are made
// of (a soft mallet's note, a small bell, a buzz, a rush of air and a
// sparkle) and the small room many are heard in, each built of
// `@fz/dev/synth`'s signals.

import {
  SR,
  TAU,
  cents,
  degree,
  fade,
  filter,
  gain,
  mix,
  modes,
  noise,
  osc,
  read,
  reverb,
  samples,
  scatter,
} from "@fz/dev/synth";

/** @import { Param, Signal } from "@fz/dev/synth" */

/**
 * Describes how a part of a sound swells and dies away, each time in
 * seconds.
 *
 * @typedef {object} Envelope
 * @property {number} attack How long it takes to reach its full level.
 * @property {number} [hold] How long it stays there, none unless given.
 * @property {number} decay How long it then takes to fall to about a third, and a third of that again in as long.
 * @property {number} [curve] How its attack bows: above 1 it starts softly, 1 unless given.
 */

/**
 * Returns a sound shaped by an envelope: up to its full level over the
 * attack, held there, then dying away.
 *
 * @param {Signal} x
 * @param {Envelope} envelope
 * @returns {Signal}
 */
export function shaped(x, { attack, hold = 0, decay, curve = 1 }) {
  return gain(x, (t) => {
    if (t < attack) return (t / attack) ** curve;
    if (t < attack + hold) return 1;
    return Math.exp(-(t - attack - hold) / decay);
  });
}

/**
 * Returns a value that moves from one number toward another, most of its
 * way early: two-thirds of it in `seconds`, and two-thirds of what is left
 * in as long again.
 *
 * @param {number} from
 * @param {number} to
 * @param {number} seconds
 * @returns {(t: number) => number}
 */
export function toward(from, to, seconds) {
  return (t) => to + (from - to) * Math.exp(-t / seconds);
}

/**
 * Describes a mallet's note.
 *
 * @typedef {object} MalletHow
 * @property {number} [decay] How long its note takes to fall to a third, in seconds.
 * @property {number} [scoop] How many semitones flat it starts, scooping up to its pitch.
 * @property {number} [air] How loud the puff of air under it is.
 * @property {number} [seed]
 */

/**
 * Returns a soft mallet's note at a pitch, in Hz: a sine with a little of
 * a triangle and of its octave, scooping up to the pitch from a few
 * semitones under, over a short, dark puff of air.
 *
 * @param {number} freq
 * @param {MalletHow} [how]
 * @returns {Signal}
 */
export function mallet(
  freq,
  { decay = 0.06, scoop = 3, air = 0.35, seed = 3 } = {},
) {
  const seconds = Math.min(0.6, decay * 5 + 0.04);
  const scooped = (/** @type {number} */ t) =>
    freq * cents(-100 * scoop * Math.exp(-t / 0.011));
  const puff = filter(
    filter(noise("white", 0.06, seed), "bp", 1500, 0.9),
    "lp",
    3000,
  );
  return mix([
    {
      x: shaped(osc("sine", scooped, seconds), { attack: 0.006, decay }),
      gain: 0.8,
    },
    {
      // From the bottom of its swing, against the sine's rise, which
      // softens the note's first peak.
      x: shaped(osc("tri", scooped, seconds, { phase: 0.75 }), {
        attack: 0.006,
        decay: decay * 0.6,
      }),
      gain: 0.22,
    },
    {
      x: shaped(
        osc("sine", (t) => 2 * scooped(t), seconds),
        {
          attack: 0.005,
          decay: decay * 0.5,
        },
      ),
      gain: 0.16,
    },
    { x: shaped(puff, { attack: 0.003, decay: 0.012 }), gain: air },
  ]);
}

/**
 * Describes a rush of air, its pitches in Hz.
 *
 * @typedef {object} WhooshHow
 * @property {number} seconds
 * @property {number} from Where its band starts.
 * @property {number} peak Where its band is at its loudest.
 * @property {number} to Where its band ends.
 * @property {number} [q] How narrow its band is.
 * @property {number} [seed]
 * @property {number} [lean] How far through it its peak comes, from 0 to 1.
 */

/**
 * Returns a rush of air: noise through a band that sweeps from where it
 * starts to its peak and on to where it ends, loudest at the peak.
 *
 * @param {WhooshHow} how
 * @returns {Signal}
 */
export function whoosh({
  seconds,
  from,
  peak,
  to,
  q = 1.3,
  seed = 5,
  lean = 0.4,
}) {
  const band = (/** @type {number} */ t) => {
    const u = t / seconds;
    return u < lean
      ? from * (peak / from) ** (u / lean)
      : peak * (to / peak) ** ((u - lean) / (1 - lean));
  };
  const air = filter(
    filter(noise("white", seconds, seed), "bp", band, q),
    "lp",
    5200,
  );
  return gain(air, (t) => {
    const u = t / seconds;
    return u < lean ? (u / lean) ** 1.6 : (1 - (u - lean) / (1 - lean)) ** 1.8;
  });
}

/**
 * Returns a small bell at a pitch, in Hz: three partials a little out of
 * tune with one another, the higher ones dying first, and none above 6 kHz.
 *
 * @param {number} freq
 * @param {number} [decay] How long its lowest partial takes to fall to a third, in seconds.
 * @returns {Signal}
 */
export function bell(freq, decay = 0.16) {
  const partials = [
    { ratio: 1, gain: 0.8, decay: 1 },
    { ratio: 2.76, gain: 0.26, decay: 0.5 },
    { ratio: 4.07, gain: 0.1, decay: 0.3 },
  ];
  return fade(
    modes(
      partials
        .filter(({ ratio }) => freq * ratio <= 6000)
        .map((partial) => ({
          freq: freq * partial.ratio,
          gain: partial.gain,
          // A fall to a third every `decay` is 60 dB down, as a mode's decay
          // is told, after ln(1000) of them.
          decay: decay * partial.decay * Math.log(1000),
        })),
      Math.min(1.2, decay * 5),
    ),
    0.005,
    0,
  );
}

/**
 * Describes the small, soft room a sound is heard in.
 *
 * @typedef {object} RoomHow
 * @property {number} seconds How long it rings, until 60 dB down.
 * @property {number} wet How much of it is heard under the sound.
 */

/** How the room's walls dull its echoes: by a corner near 3.8 kHz. */
const ROOM_DAMP = Math.exp((-2 * Math.PI * 3800) / SR);

/**
 * Returns a sound in a small, soft room, its echoes dull, so it never stops
 * dead.
 *
 * @param {Signal} x
 * @param {RoomHow} how
 * @returns {Signal}
 */
export function room(x, { seconds, wet }) {
  // The house's room made as near the design's as it comes: smaller, its
  // tail starting at once, and a quarter quieter, as eight combs ring on
  // more than four.
  return reverb(x, {
    decay: seconds,
    mix: wet * 0.75,
    damp: ROOM_DAMP,
    size: 0.8,
    predelay: 0,
  });
}

/**
 * Returns a few bright specks scattered at random over a time, each a quick
 * sine an octave above a step of the ladder's top octave, the earliest the
 * loudest.
 *
 * @param {number} seconds
 * @param {number} count
 * @param {number} seed
 * @returns {Signal}
 */
export function sparkle(seconds, count, seed) {
  return filter(
    scatter({
      count,
      seconds,
      seed,
      bias: 1,
      grain: (_, random) =>
        shaped(osc("sine", degree(10 + Math.floor(random() * 5)), 0.09), {
          attack: 0.004,
          decay: 0.022,
        }),
      level: (share) => 0.35 + 0.3 * (1 - share),
    }),
    "lp",
    5600,
  );
}

/**
 * Returns a buzz at a pitch, in Hz, that may move: its harmonics as sines,
 * as many as fit under `top`, 24 at most, the nth at 1/n to the power of
 * `tilt`, 1 being a saw's, so it never aliases however high it goes.
 *
 * @param {Param} freq
 * @param {number} seconds
 * @param {number} top In Hz.
 * @param {number} tilt
 * @returns {Signal}
 */
export function buzz(freq, seconds, top, tilt) {
  const out = new Float64Array(samples(seconds));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const f = read(freq, i);
    phase = (phase + f / SR) % 1;
    const count = Math.max(1, Math.min(24, Math.floor(top / f)));
    let v = 0;
    for (let n = 1; n <= count; n++) v += Math.sin(TAU * n * phase) / n ** tilt;
    out[i] = 0.6 * v;
  }
  return out;
}
