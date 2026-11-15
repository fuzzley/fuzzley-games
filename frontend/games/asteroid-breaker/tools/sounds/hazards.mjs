// The hazards: the comet, warned of, rushing past and smashing a rock; the
// burr, clinging, shed and popped; the hum of the lodestones on the field;
// and a rock passing a hair from the pod. The warning is in the key's dark
// side, A, C and E; what rushes past rises and then falls, as a thing going
// by does.

import {
  adsr,
  between,
  comb,
  crack,
  crackle,
  drive,
  filter,
  fm,
  gain,
  glide,
  knock,
  lfo,
  looped,
  mix,
  near,
  noise,
  osc,
  perc,
  pitch,
  reverb,
  rubble,
  samples,
  seeded,
  unit,
} from "@fz/dev/synth";

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Signal } from "@fz/dev/synth" */

/**
 * Returns a rise and a fall over a time: 0 at its start, 1 at its peak and
 * 0 at its end.
 *
 * @param {number} peak When it peaks, in seconds.
 * @param {number} seconds
 * @param {number} [rise] Above 1 it swells late.
 * @param {number} [fall] Above 1 it falls away early.
 * @returns {(t: number) => number}
 */
function swell(peak, seconds, rise = 2, fall = 2) {
  return (t) =>
    t < peak
      ? (t / peak) ** rise
      : Math.max(0, 1 - (t - peak) / (seconds - peak)) ** fall;
}

/**
 * Returns a pitch that climbs to a peak and falls after it, by ratio, as
 * what rushes past is heard to.
 *
 * @param {number} from
 * @param {number} top
 * @param {number} to
 * @param {number} peak When it peaks, in seconds.
 * @param {number} seconds
 * @returns {(t: number) => number}
 */
function arc(from, top, to, peak, seconds) {
  return (t) =>
    t < peak
      ? from * (top / from) ** (t / peak)
      : top * (to / top) ** Math.min(1, (t - peak) / (seconds - peak));
}

/**
 * Returns a pulse of the comet's warning: a warm tone at a note, its
 * harmonics a little off whole, brighter at its start, with its octave
 * under it and a tick to say when.
 *
 * @param {number} note In Hz.
 * @param {number} seconds
 * @param {number} bright How far its tone is bent: its urgency.
 * @param {number} seed
 * @returns {Signal}
 */
function pulse(note, seconds, bright, seed) {
  const total = seconds * 1.15;
  const tone = mix([
    fm(note, 2.004, gain(perc(0.002, seconds, total), 1.2 * bright), total),
    { x: osc("sine", note * 3.01, total), gain: 0.08 * bright },
    { x: osc("tri", note / 2, total), gain: 0.3 },
  ]);
  const shape = adsr(
    {
      attack: 0.004,
      decay: 0.06,
      sustain: 0.6,
      hold: seconds * 0.55,
      release: seconds * 0.55,
    },
    total,
  );
  const tick = gain(
    filter(noise("white", 0.008, seed), "bp", note * 5, 1.5),
    perc(0.0003, 0.007, 0.008),
  );
  return mix([gain(tone, shape), { x: tick, gain: 0.25 }]);
}

/**
 * Returns a small dry pop: a tone that drops fast, with a puff of air.
 *
 * @param {number} freq Where it sits, in Hz.
 * @param {number} seed
 * @returns {Signal}
 */
function pop(freq, seed) {
  const body = gain(
    osc("sine", glide(freq * 1.7, freq * 0.75, 0.02, 0.04), 0.04),
    perc(0.0005, 0.035, 0.04),
  );
  const puff = gain(
    filter(noise("white", 0.01, seed), "bp", freq * 3, 1.2),
    perc(0.0003, 0.009, 0.01),
  );
  return drive(mix([body, { x: puff, gain: 0.5 }]), 1.6);
}

/** @type {Recipe[]} */
export const SOUNDS = [
  {
    name: "comet-warning",
    about:
      "A comet is coming: three calm pulses on A, C and E over the warning's second and a half, each higher, brighter and sooner than the last.",
    level: "medium",
    plays: ["warned"],
    make: (_take, seed) =>
      reverb(
        mix([
          { x: pulse(pitch("A4"), 0.24, 0.8, seed), gain: 0.8 },
          { x: pulse(pitch("C5"), 0.22, 1, seed + 1), at: 0.54, gain: 0.9 },
          { x: pulse(pitch("E5"), 0.28, 1.3, seed + 2), at: 0.98 },
        ]),
        { decay: 0.35, mix: 0.14 },
      ),
  },
  {
    name: "comet-pass",
    about:
      "A comet crosses the field: a whoosh of air and a roar under it, with a hot core's tone, all rising as it comes and falling as it goes.",
    takes: 2,
    level: "large",
    plays: ["a comet comes in (after its warning)"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const seconds = 1.2;
      const peak = 0.5 * near(random, 0.12);
      const lift = near(random, 0.08);
      const air = gain(
        filter(
          noise("pink", seconds, seed + 1),
          "bp",
          arc(320 * lift, 2600 * lift, 420, peak, seconds),
          1.3,
        ),
        swell(peak, seconds, 2.2, 1.8),
      );
      const hiss = gain(
        filter(noise("white", seconds, seed + 3), "hp", 3500, 0.707),
        swell(peak, seconds, 3, 2.5),
      );
      const rushing = comb(
        mix([unit(air), { x: unit(hiss), gain: 0.25 }]),
        arc(0.004, 0.0009, 0.005, peak, seconds),
        0.55,
        { damp: 0.2, mix: 0.5 },
      );
      const flutter = lfo(0.8, 0.2, 27 * near(random, 0.1), seconds);
      const roar = gain(
        gain(
          filter(
            drive(gain(noise("brown", seconds, seed + 2), 4), 3),
            "bp",
            arc(380, 1000 * lift, 320, peak, seconds),
            0.7,
          ),
          flutter,
        ),
        swell(peak, seconds, 1.6, 1.5),
      );
      const core = gain(
        filter(
          drive(
            osc(
              "saw",
              arc(140 * lift, 200 * lift, 105, peak, seconds),
              seconds,
            ),
            2,
          ),
          "lp",
          arc(500, 1600, 400, peak, seconds),
          1.5,
        ),
        swell(peak, seconds, 2.5, 2),
      );
      return reverb(
        mix([
          rushing,
          { x: unit(roar), gain: 0.7 },
          { x: unit(core), gain: 0.35 },
        ]),
        { decay: 0.5, mix: 0.12 },
      );
    },
  },
  {
    name: "comet-smash",
    about:
      "A comet breaks a rock: a crunch, a hard-driven knock under a run of snaps and grit, and a hot sizzle after it, hissing and spitting as it dies.",
    takes: 2,
    level: "medium",
    plays: ["broken (by a comet)"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const tune = near(random, 0.06);
      const sizzleTime = 0.36 * near(random, 0.15);
      const hiss = gain(
        filter(
          noise("white", sizzleTime, seed + 3),
          "bp",
          glide(7500, 3800, sizzleTime, sizzleTime),
          1.2,
        ),
        perc(0.012, sizzleTime, sizzleTime),
      );
      return reverb(
        mix([
          {
            x: crack({
              seed: seed + 1,
              snaps: 4,
              over: 0.018,
              low: 1600,
              high: 6500,
              snap: 0.005,
            }),
            gain: 0.8,
          },
          {
            x: knock({
              freq: 270 * tune,
              decay: 0.09,
              seed: seed + 2,
              tilt: 0.3,
              hard: 4,
            }),
          },
          {
            x: rubble({
              count: 16,
              seconds: 0.12,
              seed: seed + 4,
              low: 900,
              high: 5000,
              grain: 0.008,
              bias: 1.2,
            }),
            at: 0.006,
            gain: 0.6,
          },
          { x: unit(hiss), at: 0.015, gain: 0.7 },
          {
            x: crackle({
              count: 34,
              seconds: sizzleTime * 0.9,
              seed: seed + 5,
              low: 3500,
              high: 9000,
              bias: 1.3,
            }),
            at: 0.02,
            gain: 0.7,
          },
        ]),
        { decay: 0.22, mix: 0.1 },
      );
    },
  },
  {
    name: "burr-cling",
    about:
      'A burr catches on the pod: a "zrrip" of its hooks, ticks that come faster and higher until they buzz, and a soft thock as it lands.',
    takes: 3,
    level: "small",
    plays: ["a burr clings to the pod"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const tune = near(random, 0.08);
      const length = 0.07 * near(random, 0.12);
      /** @type {{ x: Signal, at: number, gain: number }[]} */
      const hooks = [];
      let gap = 0.0078 * near(random, 0.12);
      for (let at = 0, k = 0; at < length; k++) {
        const share = at / length;
        hooks.push({
          x: gain(
            filter(
              noise("white", 0.003, seed + 7 * k + 1),
              "bp",
              (2200 + 2600 * share) * tune,
              4,
            ),
            perc(0.0002, 0.003, 0.003),
          ),
          at,
          gain: 0.6 + 0.6 * share,
        });
        at += gap * near(random, 0.15);
        gap *= 0.9;
      }
      // The fuzz the hooks drag through: a band of noise that rises with
      // them and is cut off as they catch.
      const fuzz = gain(
        filter(
          noise("white", length, seed + 3),
          "bp",
          glide(1800 * tune, 4800 * tune, length, length),
          1.5,
        ),
        (t) => (t / length) ** 1.5 * Math.min(1, (length - t) / 0.004),
      );
      const thock = filter(
        knock({
          freq: 360 * tune,
          decay: 0.045,
          seed: seed + 2,
          dull: 0.8,
          hard: 1.3,
        }),
        "lp",
        1400,
        0.707,
      );
      return reverb(
        drive(
          gain(
            mix([
              unit(mix(hooks)),
              { x: unit(fuzz), gain: 0.45 },
              { x: thock, at: length * 0.9, gain: 0.3 },
            ]),
            0.8,
          ),
          1.6,
        ),
        { decay: 0.1, mix: 0.06 },
      );
    },
  },
  {
    name: "burr-shed",
    about:
      "A dash flings the burrs off: a quick ruffle of fluttering air, rising, and each burr popping as it goes.",
    takes: 2,
    level: "small",
    plays: ["dashed (with burrs clinging)"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const seconds = 0.14 * near(random, 0.12);
      const ruffle = gain(
        gain(
          filter(
            noise("pink", seconds, seed + 1),
            "bp",
            glide(900, 2800, seconds, seconds),
            1.2,
          ),
          lfo(0.65, 0.35, 52 * near(random, 0.15), seconds),
        ),
        swell(0.04, seconds, 1.5, 1.5),
      );
      return reverb(
        mix([
          { x: unit(ruffle), gain: 0.6 },
          ...[0.04, 0.085, 0.135, 0.18].map((at, k) => ({
            x: pop(between(random, 650, 1250), seed + 10 + k),
            at: at * near(random, 0.2),
            gain: 0.9 - 0.12 * k,
          })),
        ]),
        { decay: 0.14, mix: 0.07 },
      );
    },
  },
  {
    name: "burr-pop",
    about:
      "A shot pops a burr: one tiny dry pop, a tone that drops in a blink with a puff of air.",
    takes: 3,
    level: "tick",
    plays: ["a burr popped by a shot"],
    make: (_take, seed) =>
      reverb(pop(980 * near(seeded(seed), 0.1), seed + 1), {
        decay: 0.08,
        mix: 0.04,
      }),
  },
  {
    name: "lodestone-hum",
    about:
      "While lodestones are on the field: a faint drone on A with its fifth, two saws a hair apart so they beat, a filter wobbling slowly through them, a tremor on top and a breath of noise; every pitch and wobble runs whole cycles in its two seconds, so it loops with no seam.",
    level: "tick",
    loop: true,
    plays: ["while a lodestone is on the field"],
    make: (_take, seed) => {
      // Every pitch and wobble here is a whole multiple of 0.5 Hz, so each
      // comes round in the loop's 2 s; the 2 s kept are those after the
      // first second, once the filters have settled. The breath over them
      // is noise, which no cycle closes, so its end is faded into its start.
      const seconds = 2;
      const total = seconds + 1;
      const drone = drive(
        gain(
          mix([
            osc("saw", 110, total),
            { x: osc("saw", 110.5, total, { phase: 0.37 }), gain: 0.5 },
            { x: osc("pulse", 165, total, { width: 0.3 }), gain: 0.4 },
          ]),
          0.4,
        ),
        2,
      );
      const moved = mix([
        filter(drone, "bp", lfo(560, 240, 0.5, total), 2.2),
        {
          x: filter(drone, "bp", lfo(1150, 350, 1, total, 0.3), 3),
          gain: 0.4,
        },
      ]);
      const hum = gain(
        filter(moved, "hp", 220, 0.707),
        lfo(0.82, 0.18, 7, total),
      );
      const kept = Float64Array.from(
        hum.subarray(samples(1), samples(1) + samples(seconds)),
      );
      const breath = looped(
        filter(noise("pink", seconds + 0.25, seed), "bp", 1800, 1),
        seconds,
      );
      return mix([unit(kept), { x: unit(breath), gain: 0.06 }]);
    },
  },
  {
    name: "near-miss",
    about:
      'A rock passes a hair from the pod: a quick airy "fwip", a band of noise that rises as it comes and falls as it goes.',
    takes: 3,
    level: "small",
    plays: ["near miss"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const seconds = 0.165 * near(random, 0.1);
      const peak = seconds * 0.42;
      const lift = near(random, 0.1);
      const air = filter(
        mix([
          noise("white", seconds, seed + 1),
          { x: noise("pink", seconds, seed + 2), gain: 2 },
        ]),
        "bp",
        arc(700 * lift, 3400 * lift, 1100 * lift, peak, seconds),
        2.2,
      );
      return reverb(gain(air, swell(peak, seconds, 1.8, 1.6)), {
        decay: 0.08,
        mix: 0.05,
      });
    },
  },
];
