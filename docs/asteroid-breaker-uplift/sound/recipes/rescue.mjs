// The rescue's sounds: a stray's bubble drifting in, the bloop of a catch
// with its notes rising, the tow line snapping and springing, and the bells
// of a fuzzball floating home. A bubble is a round note that climbs as it
// closes; the line is a plucked string; every pitched note is in the key.

import { degree, pitch } from "../lib/music.mjs";
import {
  SR,
  drive,
  filter,
  gain,
  glide,
  mix,
  modes,
  noise,
  osc,
  perc,
  pluck,
  points,
  reverb,
  samples,
  scatter,
  seeded,
} from "../lib/synth.mjs";
import { bell } from "./chain.mjs";

/** @import { Recipe } from "../build.mjs" */
/** @import { Signal } from "../lib/synth.mjs" */

/**
 * Returns a number near 1, off it by up to a share either way.
 *
 * @param {() => number} random
 * @param {number} share
 * @returns {number}
 */
const near = (random, share) => 1 + (random() * 2 - 1) * share;

/**
 * Returns a signal played at a speed that moves, its pitch moving with it,
 * as a string's does while its pull changes.
 *
 * @param {Signal} x
 * @param {(t: number) => number} speed The speed at a time of the result, 1 being as made.
 * @param {number} seconds The result's length.
 * @returns {Signal}
 */
function bent(x, speed, seconds) {
  const out = new Float64Array(samples(seconds));
  let p = 0;
  for (let i = 0; i < out.length; i++) {
    const k = Math.floor(p);
    const f = p - k;
    out[i] = (x[k] ?? 0) * (1 - f) + (x[k + 1] ?? 0) * f;
    p += speed(i / SR);
  }
  return out;
}

/**
 * Returns a sound without the silence its room leaves after it: cut a
 * moment after it last passes 70 dB under its loudest sample, where the
 * build's fade ends it.
 *
 * @param {Signal} x
 * @returns {Signal}
 */
function trimmed(x) {
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i] ?? 0));
  let last = x.length - 1;
  while (last > 0 && Math.abs(x[last] ?? 0) < peak / 3000) last--;
  return x.slice(0, Math.min(x.length, last + samples(0.015)));
}

/**
 * Returns one bubble's note: a round tone that dips as the bubble forms and
 * climbs more than an octave as it closes, with a wet tick at its start.
 *
 * @param {number} freq Where its note starts, in Hz.
 * @param {number} seconds
 * @param {number} seed
 * @returns {Signal}
 */
function bubble(freq, seconds, seed) {
  const note = points(
    [
      [0, freq * 1.12],
      [seconds * 0.16, freq * 0.84],
      [seconds, freq * 2.35],
    ],
    seconds,
  );
  const body = gain(
    drive(osc("sine", note, seconds), 1.5),
    perc(0.007, seconds * 0.95, seconds),
  );
  const lip = gain(
    filter(noise("white", 0.012, seed), "bp", freq * 3.2, 1.5),
    perc(0.001, 0.01, 0.012),
  );
  return mix([body, { x: lip, gain: 0.25 }]);
}

/**
 * Returns the bloop of a bubble taking someone in: one large bubble's note
 * and a smaller, higher one close behind it.
 *
 * @param {number} freq
 * @param {number} seed
 * @returns {Signal}
 */
function bloop(freq, seed) {
  const random = seeded(seed);
  return mix([
    bubble(freq, 0.13 * near(random, 0.1), seed),
    {
      x: bubble(freq * (1.45 + 0.2 * random()), 0.07, seed + 1),
      at: 0.05 + 0.015 * random(),
      gain: 0.4,
    },
  ]);
}

/** @type {Recipe[]} */
export const SOUNDS = [
  {
    name: "stray-appear",
    about:
      "A stray's bubble drifts onto the field: a scatter of small watery drips on the key's high notes under a faint breath, and a glint that slides from G6 up to a small bell on C7.",
    level: "small",
    plays: ["a stray arrives"],
    make: (_take, seed) => {
      const shimmer = scatter({
        count: 11,
        seconds: 0.34,
        seed,
        bias: 1,
        grain: (_i, random) => {
          const note = degree(Math.floor(random() * 7), 6);
          const length = 0.035 + 0.025 * random();
          return gain(
            osc("sine", glide(note * 0.9, note * 1.2, length, length), length),
            perc(0.005, length, length),
          );
        },
        level: (share) => 0.35 + 0.65 * Math.sin(Math.PI * share) ** 0.7,
      });
      const film = gain(
        filter(noise("pink", 0.42, seed + 3), "bp", 2400, 1),
        points(
          [
            [0, 0],
            [0.2, 1],
            [0.42, 0],
          ],
          0.42,
        ),
      );
      const rise = glide(pitch("G6"), pitch("C7"), 0.26, 0.3, 0.8);
      const glint = gain(
        mix([
          osc("sine", rise, 0.3),
          {
            x: osc(
              "sine",
              rise.map((f) => f * 2.004),
              0.3,
            ),
            gain: 0.18,
          },
        ]),
        points(
          [
            [0, 0],
            [0.2, 1],
            [0.3, 0],
          ],
          0.3,
          1.6,
        ),
      );
      return trimmed(
        reverb(
          mix([
            { x: shimmer, gain: 0.5 },
            { x: film, gain: 0.6 },
            { x: glint, at: 0.09, gain: 0.5 },
            { x: bell(pitch("C7"), 0.15, seed + 5), at: 0.33, gain: 0.45 },
          ]),
          { decay: 0.22, mix: 0.14 },
        ),
      );
    },
  },
  {
    name: "stray-catch",
    about:
      "The pod catches a stray, which joins the tow line: a round bloop of two bubbles, then two bright bells rising a sixth, from G5 to E6.",
    takes: 2,
    level: "medium",
    plays: ["a stray caught"],
    make: (take, seed) => {
      const random = seeded(seed);
      const second = 0.125 + 0.015 * take + 0.01 * random();
      return trimmed(
        reverb(
          mix([
            bloop(410 * near(random, 0.07) * (1 + 0.08 * take), seed),
            {
              x: bell(pitch("G5"), 0.17 * near(random, 0.15), seed + 2),
              at: 0.055 + 0.01 * random(),
              gain: 0.6,
            },
            {
              x: bell(pitch("E6"), 0.2 * near(random, 0.15), seed + 3),
              at: second,
              gain: 0.7,
            },
          ]),
          { decay: 0.22, mix: 0.1 },
        ),
      );
    },
  },
  {
    name: "crew-loose",
    about:
      "The tow line snaps and a bubble is flung off: a plucked line whose pitch whips upward as it snaps short, then a hollow pop that falls from A5.",
    takes: 2,
    level: "medium",
    plays: ["a fuzzball knocked loose"],
    make: (take, seed) => {
      const random = seeded(seed);
      const string = pitch("E5") * near(random, 0.04) * (1 + 0.1 * take);
      const whip = 2.2 + 0.5 * random();
      const twip = gain(
        bent(
          pluck(string, 0.2, { damp: 0.4, decay: 0.12, seed }),
          (t) => 1 + whip * Math.min(1, t / 0.06) ** 1.6,
          0.065,
        ),
        points(
          [
            [0, 0],
            [0.003, 1],
            [0.045, 0.8],
            [0.065, 0],
          ],
          0.065,
        ),
      );
      const snap = gain(
        filter(noise("white", 0.008, seed + 1), "bp", 3600, 1.2),
        perc(0.0005, 0.007, 0.008),
      );
      const hollow = pitch("A5") * near(random, 0.05) * (1 - 0.08 * take);
      const pop = mix([
        modes(
          [
            { freq: hollow, decay: 0.09, gain: 1, bend: 900 },
            { freq: hollow * 3.02, decay: 0.035, gain: 0.16, bend: 900 },
            { freq: hollow * 5.1, decay: 0.02, gain: 0.06, bend: 900 },
          ],
          0.11,
        ),
        {
          x: gain(
            filter(noise("pink", 0.02, seed + 2), "bp", hollow * 1.5, 2.5),
            perc(0.001, 0.018, 0.02),
          ),
          gain: 1.2,
        },
      ]);
      return trimmed(
        reverb(
          mix([
            { x: filter(twip, "lp", 5000, 0.7), gain: 0.8 },
            { x: snap, gain: 0.3 },
            { x: pop, at: 0.06 + 0.012 * random(), gain: 0.9 },
          ]),
          { decay: 0.25, mix: 0.12 },
        ),
      );
    },
  },
  {
    name: "crew-caught",
    about:
      "A loose fuzzball caught again: the bloop of the catch, then three small bells running up from E5 through G5 to C6, home.",
    takes: 2,
    level: "medium",
    plays: ["a loose fuzzball caught again"],
    make: (take, seed) => {
      const random = seeded(seed);
      const gap = 0.045 + 0.005 * take + 0.004 * random();
      return trimmed(
        reverb(
          mix([
            bloop(450 * near(random, 0.07) * (1 - 0.07 * take), seed),
            ...["E5", "G5", "C6"].map((name, k) => ({
              x: bell(
                pitch(name),
                (0.1 + 0.03 * k) * near(random, 0.12),
                seed + k,
              ),
              at: 0.05 + gap * k,
              gain: 0.55 + 0.1 * k,
            })),
          ]),
          { decay: 0.2, mix: 0.1 },
        ),
      );
    },
  },
  {
    name: "crew-home",
    about:
      "A fuzzball floats home off the field: two soft bells falling a third, E6 then C6, the second fainter and further into the room than the first.",
    level: "small",
    plays: ["a fuzzball floats home"],
    make: (_take, seed) => {
      const first = reverb(bell(pitch("E6"), 0.42, seed), {
        decay: 0.6,
        mix: 0.3,
        damp: 0.6,
      });
      const second = reverb(bell(pitch("C6"), 0.45, seed + 1), {
        decay: 0.7,
        mix: 0.6,
        damp: 0.7,
        predelay: 0.02,
      });
      return trimmed(
        filter(
          mix([first, { x: second, at: 0.2, gain: 0.6 }]),
          "lp",
          3200,
          0.6,
        ),
      );
    },
  },
  {
    name: "tow-twang",
    about:
      "The tow line springs as the pod turns hard: one soft pluck of a rubber band on E4, G4 or D4, its pitch a little sharp at first as the pull lets go.",
    takes: 3,
    level: "tick",
    plays: ["the pod turns hard with fuzzballs in tow"],
    make: (take, seed) => {
      const random = seeded(seed);
      const note =
        pitch(["E4", "G4", "D4"][take] ?? "E4") * near(random, 0.015);
      const sharp = 0.12 + 0.06 * random();
      const band = bent(
        pluck(note, 0.22, { damp: 0.9, decay: 0.2, seed }),
        (t) => 1 + sharp * Math.exp(-t / 0.035),
        0.13,
      );
      // A plucked line's noise can start off the middle and stay there, so
      // what lies under the note is cut.
      return trimmed(
        reverb(
          gain(
            filter(
              filter(
                filter(band, "hp", note * 0.6, 0.7),
                "lp",
                note * 2.4,
                0.7,
              ),
              "lp",
              glide(1800, 600, 0.07, 0.13),
              0.7,
            ),
            points(
              [
                [0, 0],
                [0.006, 1],
                [0.08, 0.7],
                [0.13, 0],
              ],
              0.13,
            ),
          ),
          { decay: 0.12, mix: 0.06 },
        ),
      );
    },
  },
];
