// What the recipes share: the envelope each part of a sound is shaped by,
// a value that settles toward another, and the voices several sounds are
// made of, a soft mallet's note and a rush of air, each built of
// `@fz/dev/synth`'s signals.

import { cents, filter, gain, mix, noise, osc } from "@fz/dev/synth";

/** @import { Signal } from "@fz/dev/synth" */

/**
 * Describes how a part of a sound swells and dies away, each time in
 * seconds.
 *
 * @typedef {object} Envelope
 * @property {number} attack How long it takes to reach its full level.
 * @property {number} [hold] How long it stays there, none unless given.
 * @property {number} decay How long it then takes to fall to about a third, and a third of that again in as long.
 */

/**
 * Returns a sound shaped by an envelope: up to its full level over the
 * attack, held there, then dying away.
 *
 * @param {Signal} x
 * @param {Envelope} envelope
 * @returns {Signal}
 */
export function shaped(x, { attack, hold = 0, decay }) {
  return gain(x, (t) => {
    if (t < attack) return t / attack;
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
