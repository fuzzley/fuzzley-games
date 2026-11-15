// What plays under everything: a bed for each sector and for Endless, and
// two layers the game fades in over a bed as static climbs. Each is a place,
// not a tune, in stereo, and loops with no seam, because everything in it
// turns a whole number of times in the loop: every tone, every swell, and
// every tail, which is folded back onto the loop's start.
//
// Nothing pitched is held above 620 Hz in the two beds heard longest, the
// Inner belt's and Endless's: a steady high tone tires an ear over minutes.
// What is high in them comes and goes, as air or as a struck note.

import {
  SR,
  dB,
  drive,
  filter,
  gain,
  looped,
  mix,
  modes,
  noise,
  normalize,
  perc,
  pitch,
  pluck,
  points,
  reverbStereo,
  samples,
  seeded,
} from "@fz/dev/synth";

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Signal } from "@fz/dev/synth" */

/** @typedef {[Signal, Signal]} Stereo The left ear's samples and the right's. */

/**
 * @typedef {object} DroneTone One tone of a drone, by its place over the drone's root.
 * @property {number} n Its pitch, as a multiple of the root's.
 * @property {number} gain
 * @property {readonly [number, number]} [apart] How many turns more in the loop the fainter twin in each ear makes, which sets how slowly the two beat.
 * @property {number} [swells] How many times it swells in the loop.
 * @property {number} [depth] How far it falls between swells: 0 not at all, 1 to nothing.
 * @property {number} [sharp] How briefly it swells: 1 is as long up as down, 2 and above is mostly down, so the tone comes and goes.
 * @property {readonly [number, number]} [turn] Where in a swell each ear starts, in turns; apart, the tone drifts from ear to ear.
 */

/**
 * @typedef {object} Held One held note of a pad.
 * @property {string} note Its name, such as "G2".
 * @property {number} gain
 * @property {readonly [number, number]} [span] When it sounds, from the start of its coming to the end of its going, in seconds, an end past the loop's wrapping round to the loop's start; the whole loop unless given.
 * @property {number} [swells] How many times it swells in the loop.
 * @property {number} [depth] How far it falls between swells: 0 not at all, 1 to nothing.
 * @property {readonly [number, number]} [turn] Where in a swell each ear starts, in turns.
 * @property {readonly [number, number]} [lean] How loud it is in each ear, 1 in both unless given.
 */

/**
 * @typedef {object} Moment A sound that happens now and then in a loop.
 * @property {Signal} x
 * @property {number} at When it starts, in seconds.
 * @property {number} where Its place between the ears, from -1, the left, to 1, the right.
 * @property {number} db The level of its loudest sample, in dB below full scale.
 */

const TAU = Math.PI * 2;

/** A sector's bed, in seconds. */
const BED = 16;

/** A layer over a bed, in seconds: four bars at 120 beats a minute. */
const LAYER = 8;

/** A bed whose harmony drifts, in seconds: four of the layers' loops. */
const DRIFT = 32;

/**
 * Returns a tone that loops: one that turns a whole number of times in the
 * loop, and swells and falls a whole number of times too.
 *
 * @param {number} turns How many times it turns in the loop.
 * @param {number} seconds The loop's length.
 * @param {{ swells?: number, depth?: number, sharp?: number, turn?: number, phase?: number }} [how] Its swells, as a `DroneTone`'s, and where the tone itself starts, in turns.
 * @returns {Signal}
 */
function tone(
  turns,
  seconds,
  { swells = 1, depth = 0, sharp = 1, turn = 0, phase = 0 } = {},
) {
  const out = new Float64Array(samples(seconds));
  for (let i = 0; i < out.length; i++) {
    const share = i / out.length;
    const swell = 0.5 - 0.5 * Math.cos(TAU * (swells * share + turn));
    const level = 1 - depth * (1 - swell ** sharp);
    out[i] = level * Math.sin(TAU * (turns * share + phase));
  }
  return out;
}

/**
 * Returns a drone in stereo: each partial a tone in both ears with a
 * fainter twin beside it, a few turns apart and other in each ear, so it
 * beats slowly and never the same in both, and swells in each ear in its
 * own time.
 *
 * @param {number} root The pitch its partials are multiples of, in Hz.
 * @param {readonly DroneTone[]} partials
 * @param {number} seconds The loop's length.
 * @param {number} seed
 * @param {number} [twin] How loud the twins are against their tones.
 * @returns {Stereo}
 */
function drone(root, partials, seconds, seed, twin = 0.45) {
  const random = seeded(seed);
  const base = Math.round(root * seconds);
  const ears = [0, 1].map((ear) =>
    mix(
      partials.flatMap(
        ({
          n,
          gain: level,
          apart = [1, -1],
          swells = 1,
          depth = 0,
          sharp = 1,
          turn = [0, 0],
        }) => [
          {
            x: tone(base * n, seconds, {
              swells,
              depth,
              sharp,
              turn: turn[ear] ?? 0,
            }),
            gain: level,
          },
          {
            x: tone(base * n + (apart[ear] ?? 0), seconds, {
              swells,
              depth,
              sharp,
              turn: turn[ear] ?? 0,
              phase: random(),
            }),
            gain: level * twin,
          },
        ],
      ),
    ),
  );
  return /** @type {Stereo} */ (ears);
}

/**
 * Returns noise that loops, through a band that moves and at a level that
 * moves, each as far through the loop asks.
 *
 * @param {"white" | "pink" | "brown"} color
 * @param {number} seconds The loop's length.
 * @param {number} seed
 * @param {{ cutoff: (share: number) => number, q: number, level: (share: number) => number, top?: number }} how The band's middle and width, the level, and a pitch in Hz above which the air is dulled, if it should be.
 * @returns {Signal}
 */
function air(color, seconds, seed, { cutoff, q, level, top }) {
  const overlap = 0.5;
  const n = samples(seconds);
  const raw = noise(color, seconds + overlap, seed);
  const band = filter(
    top === undefined ? raw : filter(raw, "lp", top, 0.6),
    "bp",
    (t) => cutoff(((((t - overlap) / seconds) % 1) + 1) % 1),
    q,
  );
  return looped(band, seconds, overlap).map((v, i) => v * level(i / n));
}

/**
 * Returns a slow wandering between about -1 and 1, as far through a loop
 * asks: swells of 1, 2, 3 and 5 turns in the loop, each started where the
 * seed says, so no stretch of the loop repeats another.
 *
 * @param {number} seed
 * @returns {(share: number) => number}
 */
function wander(seed) {
  const random = seeded(seed);
  const parts = [
    { turns: 1, depth: 0.45 },
    { turns: 2, depth: 0.3 },
    { turns: 3, depth: 0.25 },
    { turns: 5, depth: 0.15 },
  ].map((part) => ({ ...part, phase: random() }));
  return (share) => {
    let sum = 0;
    for (const { turns, depth, phase } of parts)
      sum += depth * Math.sin(TAU * (turns * share + phase));
    return sum / 1.15;
  };
}

/**
 * Returns a pad in stereo: held notes that come and go over seconds, each a
 * tone with a few harmonics that fall away quickly and none above a
 * ceiling, so nothing in it is bright. Beside each is a faint twin a turn
 * or two apart in the loop, the other way in each ear, which moves it
 * between the ears more slowly than a beat is heard.
 *
 * @param {readonly Held[]} notes
 * @param {number} seconds The loop's length.
 * @param {number} seed
 * @param {{ harmonics: ReadonlyArray<number>, top: number, edge: number, twin?: number }} how The level of each harmonic from the note itself up, the pitch in Hz no harmonic passes, the seconds a note takes to come and to go, and how loud the twins are against their tones.
 * @returns {Stereo}
 */
function pad(notes, seconds, seed, { harmonics, top, edge, twin = 0.25 }) {
  const n = samples(seconds);
  const random = seeded(seed);
  /** @type {Stereo} */
  const ears = [new Float64Array(n), new Float64Array(n)];
  const fade = samples(edge);
  for (const held of notes) {
    const { span, swells = 1, depth = 0, turn = [0, 0], lean = [1, 1] } = held;
    const freq = pitch(held.note);
    const turns = Math.round(freq * seconds);
    const start = span ? Math.round(span[0] * SR) : 0;
    const length = span ? Math.round((span[1] - span[0]) * SR) : n;
    const weights = harmonics.filter((_, k) => freq * (k + 1) <= top);
    ears.forEach((out, ear) => {
      const apart = (ear === 0 ? 1 : -1) * (1 + Math.floor(random() * 2));
      const phases = weights.map(() => random());
      const level = held.gain * (lean[ear] ?? 1);
      for (let k = 0; k < length; k++) {
        const i = (start + k) % n;
        const share = i / n;
        const here = span ? Math.min(1, Math.min(k, length - k) / fade) : 1;
        const swell =
          1 -
          depth *
            (0.5 + 0.5 * Math.cos(TAU * (swells * share + (turn[ear] ?? 0))));
        let sum = 0;
        for (let h = 0; h < weights.length; h++) {
          const at = turns * (h + 1);
          sum +=
            (weights[h] ?? 0) *
            (Math.sin(TAU * at * share) +
              twin * Math.sin(TAU * ((at + apart) * share + (phases[h] ?? 0))));
        }
        out[i] =
          (out[i] ?? 0) +
          level * (0.5 - 0.5 * Math.cos(Math.PI * here)) * swell * sum;
      }
    });
  }
  return ears;
}

/**
 * Returns a sound folded into a loop: whatever runs past the loop's end is
 * laid back over its start, as it would sound the next time round.
 *
 * @param {Signal} x
 * @param {number} seconds The loop's length.
 * @returns {Signal}
 */
function folded(x, seconds) {
  const out = new Float64Array(samples(seconds));
  for (let i = 0; i < x.length; i++)
    out[i % out.length] = (out[i % out.length] ?? 0) + (x[i] ?? 0);
  return out;
}

/**
 * Returns a sound placed between the ears, at an even loudness wherever it
 * sits.
 *
 * @param {Signal} x
 * @param {number} where From -1, the left, to 1, the right.
 * @returns {Stereo}
 */
function placed(x, where) {
  const angle = ((where + 1) * Math.PI) / 4;
  return [gain(x, Math.cos(angle)), gain(x, Math.sin(angle))];
}

/**
 * Returns stereo layers summed.
 *
 * @param {readonly Stereo[]} layers
 * @returns {Stereo}
 */
function together(layers) {
  return [
    mix(layers.map(([left]) => left)),
    mix(layers.map(([, right]) => right)),
  ];
}

/**
 * Returns the level of air that comes and goes with a slow wander: nothing
 * for the lower half of the wander's swing, then a gentle swell, so the air
 * is gone between its breaths and no steady hiss is left under a bed.
 *
 * @param {number} swing The wander's value, about -1 to 1.
 * @returns {number} From 0 to 1.
 */
function comeAndGo(swing) {
  const open = Math.max(0, (0.5 + 0.5 * swing - 0.48) / 0.52);
  return open * open;
}

/**
 * Returns a stereo layer brought to a level: the loudness of its two ears
 * together over the whole loop, so a bed's mix is written down in decibels.
 *
 * @param {Stereo} x
 * @param {number} db Its level, in dB below full scale.
 * @returns {Stereo}
 */
function leveled([left, right], db) {
  let sum = 0;
  for (const ear of [left, right])
    for (let i = 0; i < ear.length; i++) sum += (ear[i] ?? 0) ** 2;
  const scale = dB(db) / Math.sqrt(sum / (left.length + right.length));
  return [gain(left, scale), gain(right, scale)];
}

/**
 * Returns a loop of sounds that happen now and then, each at its time, its
 * place and its level, with whatever rings past the loop's end folded back
 * onto its start.
 *
 * @param {readonly Moment[]} events
 * @param {number} seconds The loop's length.
 * @returns {Stereo}
 */
function strewn(events, seconds) {
  return together(
    events.map(({ x, at, where, db }) =>
      placed(folded(mix([{ x: normalize(x, db), at }]), seconds), where),
    ),
  );
}

/**
 * Returns a loop in a room that loops with it: the room's tail in each ear,
 * folded back onto the loop's start, under the loop itself.
 *
 * @param {Stereo} x
 * @param {number} seconds The loop's length.
 * @param {{ decay: number, mix: number, damp?: number, size?: number }} how
 * @returns {Stereo}
 */
function roomed(
  [left, right],
  seconds,
  { decay, mix: wet, damp = 0.5, size = 1.4 },
) {
  const middle = mix([
    { x: left, gain: 0.5 },
    { x: right, gain: 0.5 },
  ]);
  // The synth's room hands back the sound with its tail; taking the sound
  // away again leaves the tail alone, to fold.
  const tails = reverbStereo(middle, { decay, mix: 1, damp, size }).map((ear) =>
    folded(
      ear.map((v, i) => v - (middle[i] ?? 0)),
      seconds,
    ),
  );
  return [
    mix([left, { x: /** @type {Signal} */ (tails[0]), gain: wet }]),
    mix([right, { x: /** @type {Signal} */ (tails[1]), gain: wet }]),
  ];
}

/**
 * Returns a sound with whatever holds it off the middle taken out, which a
 * loop can't leave to a filter.
 *
 * @param {Signal} x
 * @returns {Signal}
 */
function zeroed(x) {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i] ?? 0;
  const mean = sum / x.length;
  return x.map((v) => v - mean);
}

/**
 * Returns a far-off ring of metal: a few partials that are no whole
 * multiples of each other, the higher dying sooner, its strike softened and
 * its highs dulled by distance.
 *
 * @param {number} freq
 * @param {readonly number[]} ratios Its partials' pitches over its lowest.
 * @param {number} ring Seconds its lowest partial rings.
 * @param {number} seed
 * @returns {Signal}
 */
function farMetal(freq, ratios, ring, seed) {
  const random = seeded(seed);
  const struck = modes(
    ratios.map((ratio, k) => ({
      freq: freq * ratio,
      decay: ring / (1 + 0.5 * k),
      gain: 1 / (1 + 0.7 * k),
      phase: random(),
    })),
    ring,
  );
  return filter(
    gain(
      struck,
      points(
        [
          [0, 0],
          [0.06, 1],
          [ring, 1],
        ],
        ring,
      ),
    ),
    "lp",
    2600,
    0.6,
  );
}

/**
 * Returns a soft struck note with a long quiet tail: a muted bell whose
 * octave and twelfth die well before its note does, its strike softened and
 * its highs taken off.
 *
 * @param {number} freq
 * @param {number} ring Seconds its note rings.
 * @param {number} seed
 * @returns {Signal}
 */
function chime(freq, ring, seed) {
  const random = seeded(seed);
  const struck = modes(
    [
      { freq, decay: ring, gain: 1 },
      { freq: freq * 2.002, decay: ring * 0.3, gain: 0.22, phase: random() },
      { freq: freq * 3.01, decay: ring * 0.12, gain: 0.08, phase: random() },
    ],
    ring,
  );
  return filter(
    gain(
      struck,
      points(
        [
          [0, 0],
          [0.012, 1],
          [ring, 1],
        ],
        ring,
      ),
    ),
    "lp",
    1300,
    0.6,
  );
}

/**
 * Returns a far-off rumble: dark noise that rolls up and dies away, driven
 * so a small speaker hears its harmonics where it can't hear the rumble.
 *
 * @param {number} seconds
 * @param {number} seed
 * @returns {Signal}
 */
function rumble(seconds, seed) {
  const roll = gain(
    filter(noise("brown", seconds, seed), "lp", 95, 0.8),
    points(
      [
        [0, 0],
        [seconds * 0.2, 1],
        [seconds * 0.42, 0.5],
        [seconds * 0.58, 0.8],
        [seconds, 0],
      ],
      seconds,
    ),
  );
  return filter(drive(normalize(roll, -4), 3), "lp", 600, 0.6);
}

/**
 * Returns a soft mallet's note: a wooden bar's tone, its octave strong
 * enough that a small speaker hears the note, a short high partial, and a
 * felt tap.
 *
 * @param {number} freq
 * @param {number} seed
 * @returns {Signal}
 */
function mallet(freq, seed) {
  const random = seeded(seed);
  const bar = modes(
    [
      { freq, decay: 0.45, gain: 1 },
      { freq: freq * 2.0, decay: 0.32, gain: 0.6, phase: random() },
      { freq: freq * 3.98, decay: 0.18, gain: 0.3, phase: random() },
      { freq: freq * 9.1, decay: 0.04, gain: 0.05, phase: random() },
    ],
    0.5,
  );
  const tap = gain(
    filter(noise("pink", 0.012, seed), "bp", freq * 4, 1),
    perc(0.002, 0.01, 0.012),
  );
  return gain(
    mix([bar, { x: tap, gain: 0.5 }]),
    points(
      [
        [0, 0],
        [0.004, 1],
        [0.5, 1],
      ],
      0.5,
    ),
  );
}

/**
 * Returns a glass bell that has a low end of its own: its note beside a
 * twin a few Hz off, so the two beat as it rings, a hum an octave under
 * them that outlasts both, and an octave and a twelfth above that die
 * first. The higher the bell, the sooner all of it dies.
 *
 * @param {number} freq
 * @param {number} seed
 * @returns {Signal}
 */
function humBell(freq, seed) {
  const random = seeded(seed);
  const ring = 0.95 * (pitch("E6") / freq) ** 0.6;
  const struck = modes(
    [
      { freq: freq * 0.5, decay: ring * 1.8, gain: 0.3, phase: random() },
      { freq, decay: ring, gain: 1 },
      {
        freq: freq + 2.5 + 3 * random(),
        decay: ring * 0.9,
        gain: 0.45,
        phase: random(),
      },
      { freq: freq * 2.003, decay: ring * 0.4, gain: 0.2, phase: random() },
      { freq: freq * 3.01, decay: ring * 0.2, gain: 0.07, phase: random() },
    ],
    ring * 1.8,
  );
  const tick = gain(
    filter(noise("white", 0.02, seed), "bp", Math.min(6000, freq * 3), 1.2),
    perc(0.001, 0.018, 0.02),
  );
  return filter(
    gain(
      mix([struck, { x: tick, gain: 0.08 }]),
      points(
        [
          [0, 0],
          [0.002, 1],
          [ring * 1.8, 1],
        ],
        ring * 1.8,
      ),
    ),
    "lp",
    5000,
    0.6,
  );
}

/**
 * Returns a warm struck note for the middle of a layer: a soft mallet on a
 * metal bar, its note beside a twin that beats slowly against it, a hum an
 * octave under, and an octave above that is gone in half a second.
 *
 * @param {number} freq
 * @param {number} seed
 * @returns {Signal}
 */
function warmBar(freq, seed) {
  const random = seeded(seed);
  const struck = modes(
    [
      { freq: freq * 0.5, decay: 1.4, gain: 0.22, phase: random() },
      { freq, decay: 1.2, gain: 1 },
      { freq: freq + 1 + random(), decay: 1.1, gain: 0.3, phase: random() },
      { freq: freq * 2.0, decay: 0.5, gain: 0.25, phase: random() },
      { freq: freq * 3.98, decay: 0.14, gain: 0.08, phase: random() },
    ],
    1.6,
  );
  return filter(
    gain(
      struck,
      points(
        [
          [0, 0],
          [0.005, 1],
          [1.6, 1],
        ],
        1.6,
      ),
    ),
    "lp",
    2600,
    0.6,
  );
}

/**
 * Returns a small soft plucked note: a short string, dulled, with whatever
 * its first noise left under the note taken out.
 *
 * @param {number} freq
 * @param {number} seed
 * @returns {Signal}
 */
function plucked(freq, seed) {
  const string = pluck(freq, 0.6, { damp: 0.55, decay: 0.45, seed });
  return gain(
    filter(filter(string, "hp", freq * 0.6, 0.7), "lp", 3400, 0.6),
    points(
      [
        [0, 0],
        [0.003, 1],
        [0.45, 1],
        [0.6, 0],
      ],
      0.6,
    ),
  );
}

/** @type {Recipe[]} */
export const SOUNDS = [
  {
    name: "bed-inner-belt",
    about:
      "Under the Inner belt, calm and warm: a soft low pad over a C that stays, drifting over 32 seconds from C and G to A and E, to C, G and D, and home, its middle notes cross-fading and its low ones handing over, under air that wanders and seven soft struck notes far apart.",
    level: "bed",
    loop: true,
    plays: ["the Inner belt, waves 1 to 10"],
    make: (_take, seed) => {
      const how = { harmonics: [1, 0.34, 0.13, 0.05], top: 620 };
      const tones = together([
        // Two low notes a tone or a third apart are mud, so under 165 Hz one
        // leaves before the next comes: G for A, A for G and D, D for C. The
        // low C stays throughout, and is at its faintest under A and E.
        pad(
          [
            { note: "C2", gain: 0.5, depth: 0.35, turn: [0.64, 0.68] },
            {
              note: "G2",
              gain: 0.3,
              span: [15.5, 38],
              swells: 2,
              depth: 0.3,
              turn: [0.2, 0.3],
            },
            {
              note: "A2",
              gain: 0.42,
              span: [4.5, 17],
              swells: 2,
              depth: 0.25,
              turn: [0.7, 0.6],
            },
            {
              note: "C3",
              gain: 0.36,
              span: [26, 37.5],
              depth: 0.3,
              turn: [0.9, 0.8],
            },
            {
              note: "D3",
              gain: 0.3,
              span: [16.5, 27.5],
              swells: 2,
              depth: 0.3,
              turn: [0.15, 0.25],
            },
          ],
          DRIFT,
          seed,
          { ...how, edge: 3.5, twin: 0.2 },
        ),
        pad(
          [
            {
              note: "G3",
              gain: 0.26,
              span: [13.5, 40.5],
              swells: 3,
              depth: 0.45,
              turn: [0.1, 0.4],
            },
            {
              note: "C4",
              gain: 0.13,
              span: [24.5, 40],
              swells: 2,
              depth: 0.5,
              turn: [0.4, 0.7],
              lean: [1, 0.7],
            },
            {
              note: "G4",
              gain: 0.12,
              span: [14, 39.5],
              swells: 3,
              depth: 0.7,
              turn: [0.75, 0.4],
              lean: [0.7, 1],
            },
            {
              note: "D4",
              gain: 0.14,
              span: [14.5, 29],
              swells: 2,
              depth: 0.5,
              turn: [0.45, 0.15],
              lean: [0.75, 1],
            },
            {
              note: "E3",
              gain: 0.32,
              span: [3.5, 18.5],
              swells: 3,
              depth: 0.4,
              turn: [0.5, 0.2],
            },
            {
              note: "A3",
              gain: 0.16,
              span: [4, 18],
              swells: 2,
              depth: 0.5,
              turn: [0.8, 1.1],
              lean: [1, 0.7],
            },
            {
              note: "E4",
              gain: 0.13,
              span: [4.5, 19],
              swells: 3,
              depth: 0.6,
              turn: [0.35, 0.7],
              lean: [0.7, 1],
            },
          ],
          DRIFT,
          seed + 1,
          { ...how, edge: 4.5, twin: 0.4 },
        ),
      ]);
      const breath = /** @type {Stereo} */ (
        [0, 1].map((ear) => {
          const band = wander(seed + 10 + ear);
          const swell = wander(seed + 20 + ear);
          // Heard, the air was a static hiss: too bright, too loud and
          // never gone. It is now a low breath under 1.2 kHz that comes in
          // slow swells and is silent between them.
          return air("pink", DRIFT, seed + 2 + ear, {
            cutoff: (share) => 520 * 2 ** (0.4 * band(share)),
            q: 0.9,
            top: 1200,
            level: (share) => comeAndGo(swell(share)),
          });
        })
      );
      const notes = strewn(
        [
          {
            x: chime(pitch("G4"), 3.4, seed + 30),
            at: 2.7,
            where: -0.45,
            db: -16,
          },
          {
            x: chime(pitch("E5"), 2.8, seed + 31),
            at: 7.9,
            where: 0.5,
            db: -19,
          },
          {
            x: chime(pitch("A4"), 3.6, seed + 32),
            at: 12.3,
            where: 0.15,
            db: -16,
          },
          {
            x: chime(pitch("C5"), 3, seed + 33),
            at: 15.1,
            where: -0.6,
            db: -18,
          },
          {
            x: chime(pitch("D5"), 3.2, seed + 34),
            at: 20.6,
            where: 0.35,
            db: -17,
          },
          {
            x: chime(pitch("E4"), 3.8, seed + 35),
            at: 24.2,
            where: -0.2,
            db: -16,
          },
          {
            x: chime(pitch("C4"), 4, seed + 36),
            at: 28.9,
            where: 0.1,
            db: -17,
          },
        ],
        DRIFT,
      );
      return together([
        leveled(tones, -14),
        roomed(together([notes, leveled(breath, -38)]), DRIFT, {
          decay: 2.4,
          mix: 0.5,
          damp: 0.65,
          size: 1.5,
        }),
      ]);
    },
  },
  {
    name: "bed-iron-reach",
    about:
      "Under the Iron reach, cold and heavy: a dark, undriven drone of A and E, a thin band of cold air high above it, and three far-off rings of metal that fade into a long room.",
    level: "bed",
    loop: true,
    plays: ["the Iron reach, waves 11 to 20"],
    make: (_take, seed) => {
      const low = drone(
        pitch("A0"),
        [
          { n: 2, gain: 0.42, apart: [1, -1], depth: 0.2 },
          { n: 3, gain: 0.26, apart: [-1, 1], depth: 0.3, turn: [0.5, 0.6] },
          {
            n: 4,
            gain: 0.42,
            apart: [1, -2],
            swells: 2,
            depth: 0.3,
            turn: [0.2, 0.3],
          },
          { n: 6, gain: 0.36, apart: [-2, 1], depth: 0.5, turn: [0.7, 0.5] },
          {
            n: 8,
            gain: 0.28,
            apart: [2, -1],
            swells: 3,
            depth: 0.6,
            turn: [0.1, 0.35],
          },
          {
            n: 12,
            gain: 0.2,
            apart: [-1, 3],
            swells: 2,
            depth: 0.7,
            turn: [0.45, 0.2],
          },
          {
            n: 16,
            gain: 0.12,
            apart: [3, -2],
            swells: 3,
            depth: 0.8,
            turn: [0.8, 0.55],
          },
          {
            n: 24,
            gain: 0.06,
            apart: [-3, 2],
            swells: 2,
            depth: 0.8,
            turn: [0.3, 0.6],
          },
        ],
        BED,
        seed,
      );
      const cold = /** @type {Stereo} */ (
        [0, 1].map((ear) =>
          air("white", BED, seed + 2 + ear, {
            cutoff: (share) =>
              5200 * 2 ** (0.22 * Math.sin(TAU * (share + 0.3 * ear))),
            q: 4,
            level: (share) =>
              0.25 + 0.75 * (0.5 - 0.5 * Math.cos(TAU * (share + 0.35))),
          }),
        )
      );
      const bar = [1, 2.76, 5.4, 8.93];
      const plate = [1, 1.59, 2.14, 2.92, 3.65];
      const metal = strewn(
        [
          {
            x: farMetal(pitch("A3"), bar, 5, seed + 5),
            at: 1.6,
            where: -0.5,
            db: -11,
          },
          {
            x: farMetal(pitch("E4"), plate, 4.2, seed + 6),
            at: 7.9,
            where: 0.6,
            db: -13,
          },
          {
            x: farMetal(pitch("E3"), bar, 5.5, seed + 7),
            at: 11.7,
            where: -0.1,
            db: -14,
          },
        ],
        BED,
      );
      return together([
        leveled(low, -14),
        roomed(together([metal, leveled(cold, -34)]), BED, {
          decay: 2.6,
          mix: 0.6,
          damp: 0.6,
          size: 1.8,
        }),
      ]);
    },
  },
  {
    name: "bed-storm",
    about:
      "Under the Storm, charged: a low drone on A whose tones beat fast against their twins and tremble, wind that is noise through a band swept up and down, other in each ear, and two far-off rumbles.",
    level: "bed",
    loop: true,
    plays: ["the Storm, waves 21 to 30"],
    make: (_take, seed) => {
      const low = drone(
        pitch("A0"),
        [
          { n: 2, gain: 0.45, apart: [3, -2], swells: 2, depth: 0.3 },
          {
            n: 4,
            gain: 0.45,
            apart: [-4, 3],
            swells: 3,
            depth: 0.4,
            turn: [0.3, 0.5],
          },
          {
            n: 6,
            gain: 0.2,
            apart: [5, -3],
            swells: 2,
            depth: 0.5,
            turn: [0.6, 0.3],
          },
          {
            n: 8,
            gain: 0.3,
            apart: [-3, 6],
            swells: 5,
            depth: 0.5,
            turn: [0.1, 0.4],
          },
          {
            n: 12,
            gain: 0.16,
            apart: [7, -5],
            swells: 3,
            depth: 0.6,
            turn: [0.75, 0.5],
          },
          {
            n: 16,
            gain: 0.12,
            apart: [-6, 4],
            swells: 4,
            depth: 0.6,
            turn: [0.4, 0.15],
          },
        ],
        BED,
        seed,
        0.6,
      );
      // The tremble of something charged: 6.5 Hz, which is 104 turns in the
      // loop, coming and going twice.
      const charged = /** @type {Stereo} */ (
        low.map((ear) =>
          ear.map((v, i) => {
            const share = i / ear.length;
            const depth =
              0.16 * (0.5 - 0.5 * Math.cos(TAU * (2 * share + 0.2)));
            return v * (1 + depth * Math.sin(TAU * 104 * share));
          }),
        )
      );
      const wind = /** @type {Stereo} */ (
        [0, 1].map((ear) => {
          const sweep = (/** @type {number} */ share) =>
            0.6 * Math.sin(TAU * (2 * share + 0.1 + 0.07 * ear)) +
            0.3 * Math.sin(TAU * (3 * share + 0.55 - 0.05 * ear)) +
            0.15 * Math.sin(TAU * (5 * share + 0.3 + 0.1 * ear));
          return air("pink", BED, seed + 2 + ear, {
            cutoff: (share) => 650 * 2 ** (1.1 * sweep(share)),
            q: 2.2,
            level: (share) => Math.max(0.05, 0.5 + 0.48 * sweep(share)) ** 1.3,
          });
        })
      );
      const far = strewn(
        [
          { x: rumble(3.6, seed + 5), at: 4.4, where: -0.4, db: -15 },
          { x: rumble(2.8, seed + 6), at: 11.6, where: 0.5, db: -18 },
        ],
        BED,
      );
      const [left, right] = together([
        leveled(charged, -14),
        roomed(together([leveled(wind, -21), far]), BED, {
          decay: 1.6,
          mix: 0.25,
        }),
      ]);
      return [zeroed(left), zeroed(right)];
    },
  },
  {
    name: "bed-endless",
    about:
      "Under Endless, deep and open: a deep C that barely moves, a second soft voice that wanders over 32 seconds through G, A and E about middle C and then leaves the C alone, each note leaning to its own ear, faint air, and five muted bells far apart in a long room.",
    level: "bed",
    loop: true,
    plays: ["Endless, from wave 31"],
    make: (_take, seed) => {
      const how = { harmonics: [1, 0.32, 0.12, 0.05], top: 620, edge: 5 };
      const tones = together([
        // The deep C sits in the middle and barely moves; the width is the
        // second voice's, whose notes lean each to an ear.
        pad(
          [
            { note: "C1", gain: 0.2, depth: 0.2, turn: [0.1, 0.15] },
            { note: "C2", gain: 0.6, depth: 0.25, turn: [0.5, 0.56] },
            { note: "C3", gain: 0.2, swells: 2, depth: 0.5, turn: [0.3, 0.45] },
          ],
          DRIFT,
          seed,
          { ...how, twin: 0.08 },
        ),
        pad(
          [
            {
              note: "C4",
              gain: 0.13,
              swells: 3,
              depth: 0.8,
              turn: [0.7, 0.2],
              lean: [0.7, 1],
            },
            { note: "G2", gain: 0.22, span: [1.5, 13.5], lean: [1, 0.75] },
            {
              note: "G3",
              gain: 0.2,
              span: [1.5, 13.5],
              swells: 2,
              depth: 0.4,
              turn: [0.2, 0.5],
              lean: [0.6, 1],
            },
            {
              note: "G4",
              gain: 0.2,
              span: [2, 14],
              swells: 3,
              depth: 0.5,
              turn: [0.6, 0.2],
              lean: [1, 0.5],
            },
            {
              note: "A3",
              gain: 0.22,
              span: [8.5, 22],
              swells: 2,
              depth: 0.4,
              turn: [0.6, 0.3],
              lean: [0.6, 1],
            },
            {
              note: "A4",
              gain: 0.185,
              span: [9, 22.5],
              swells: 3,
              depth: 0.5,
              turn: [0.1, 0.5],
              lean: [1, 0.5],
            },
            { note: "E3", gain: 0.22, span: [17, 30.5], lean: [1, 0.7] },
            {
              note: "E4",
              gain: 0.235,
              span: [17.5, 31],
              swells: 2,
              depth: 0.5,
              turn: [0.9, 0.5],
              lean: [0.6, 1],
            },
          ],
          DRIFT,
          seed + 1,
          { ...how, twin: 0.45 },
        ),
      ]);
      const halo = /** @type {Stereo} */ (
        [0, 1].map((ear) => {
          const band = wander(seed + 10 + ear);
          const swell = wander(seed + 20 + ear);
          // As the Inner belt's: a low breath in swells, where a hiss was.
          return air("pink", DRIFT, seed + 2 + ear, {
            cutoff: (share) => 380 * 2 ** (0.4 * band(share)),
            q: 0.9,
            top: 900,
            level: (share) => comeAndGo(swell(share)),
          });
        })
      );
      const bells = strewn(
        [
          {
            x: chime(pitch("E5"), 4.5, seed + 30),
            at: 4.3,
            where: -0.65,
            db: -17,
          },
          {
            x: chime(pitch("G4"), 5, seed + 31),
            at: 10.9,
            where: 0.6,
            db: -16,
          },
          {
            x: chime(pitch("C5"), 4.2, seed + 32),
            at: 15.6,
            where: -0.25,
            db: -18,
          },
          {
            x: chime(pitch("A4"), 5, seed + 33),
            at: 22.4,
            where: 0.7,
            db: -16,
          },
          {
            x: chime(pitch("D5"), 4.4, seed + 34),
            at: 27.8,
            where: -0.5,
            db: -18,
          },
        ],
        DRIFT,
      );
      return together([
        leveled(tones, -14),
        roomed(together([bells, leveled(halo, -40)]), DRIFT, {
          decay: 4.5,
          mix: 0.6,
          damp: 0.6,
          size: 1.9,
        }),
      ]);
    },
  },
  {
    name: "bed-pulse",
    about:
      "Over a bed while static is high: soft mallet notes in steady eighths at 120 beats a minute, a cell of E3, A3 and G3 rolling across two bars with a turn through C4 or D4 at their end, the beats a little louder than what falls between.",
    level: "bed",
    loop: true,
    plays: ["static at the second step or above"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const step = 0.25;
      const cell = ["E3", "A3", "G3"];
      const sides = { E3: -0.3, A3: 0.3, G3: 0, C4: 0.45, D4: -0.45 };
      /** @type {Moment[]} */
      const notes = [];
      for (let i = 0; i < LAYER / step; i++) {
        const inFigure = i % 16;
        const name = /** @type {keyof typeof sides} */ (
          inFigure === 14
            ? i < 16
              ? "C4"
              : "D4"
            : inFigure === 15
              ? "A3"
              : (cell[inFigure % 3] ?? "E3")
        );
        notes.push({
          x: mallet(pitch(name), seed + i),
          at: i * step,
          where: sides[name],
          // The beats are louder than what falls between them, and a bar's
          // first beat a little louder still.
          db:
            -6 -
            (i % 2 === 0 ? 0 : 4.5) +
            (i % 8 === 0 ? 1 : 0) +
            (random() - 0.5),
        });
      }
      return roomed(strewn(notes, LAYER), LAYER, {
        decay: 0.5,
        mix: 0.12,
        size: 1,
      });
    },
  },
  {
    name: "bed-shimmer",
    about:
      "Over a bed and its pulse while static is at its highest: eight bars at the pulse's tempo in three voices. Warm struck pairs of notes from A4 to A5 fall three to a bar against the pulse's four beats; glass bells from E6 to E7, each with a hum an octave under it, play quick runs answered a beat later in the other ear and single strikes whose echoes fall away; a soft plucked figure of three notes turns between them. The bells ring in a long, wide room.",
    level: "bed",
    loop: true,
    plays: ["static at the third step or above"],
    make: (_take, seed) => {
      const random = seeded(seed);
      // Eight bars at 120 beats a minute: twice the pulse's loop, so the
      // two stay in step.
      const seconds = 2 * LAYER;
      // A time on the pulse's grid, by its bar and its sixteenth note in the
      // bar, a few milliseconds loose, as a hand is.
      const when = (/** @type {number} */ bar, /** @type {number} */ step) =>
        Math.max(0, (bar * 16 + step) * 0.125 + 0.005 * (2 * random() - 1));

      // The body: pairs of notes a third, a fourth, a fifth or a sixth
      // apart, mostly on the first, fourth and seventh eighth of a bar,
      // which is three against the pulse's four. Each is a bar, a sixteenth,
      // its notes, its level and its place.
      const body = /** @type {const} */ ([
        [0, 0, ["C5", "G5"], -8, -0.2],
        [0, 6, ["E5", "A5"], -12, 0.2],
        [0, 12, ["D5", "G5"], -15, -0.1],
        [1, 0, ["E5", "G5"], -11, 0.25],
        [1, 12, ["C5", "E5"], -15, -0.25],
        [2, 0, ["D5", "A5"], -8, 0.15],
        [2, 6, ["C5", "G5"], -12, -0.2],
        [2, 12, ["E5", "A5"], -15, 0.25],
        [3, 6, ["G5"], -18, 0],
        [3, 12, ["D5", "G5"], -12, -0.2],
        [4, 0, ["A4", "E5"], -8, 0.1],
        [4, 6, ["C5", "G5"], -13, -0.25],
        [5, 0, ["E5", "G5"], -11, 0.2],
        [5, 6, ["D5", "A5"], -15, -0.15],
        [5, 12, ["C5", "E5"], -14, 0.25],
        [6, 0, ["C5", "A5"], -8, -0.2],
        [6, 6, ["E5", "G5"], -12, 0.2],
        [6, 12, ["D5", "G5"], -12, -0.1],
        [7, 0, ["C5", "G5"], -10, 0.15],
        [7, 8, ["E5"], -18, -0.25],
      ]).map(([bar, step, names, db, where], k) => ({
        // The upper note of a pair is struck a moment after the lower, and
        // a little softer.
        x: mix(
          names.map((name, n) => ({
            x: warmBar(pitch(name), seed + 100 + 2 * k + n),
            at: 0.012 * n,
            gain: 1 - 0.2 * n,
          })),
        ),
        at: when(bar, step),
        where,
        db: db + random() - 0.5,
      }));

      /** @type {Moment[]} */
      const bells = [];
      /**
       * Adds a run of quick bells a sixteenth apart, growing or dying away,
       * and its answer a beat later in the other ear, fainter and duller.
       *
       * @param {number} bar
       * @param {number} step
       * @param {readonly string[]} names
       * @param {readonly string[]} answer
       * @param {number} where
       * @param {number} from The first note's level.
       * @param {number} to The last note's level.
       */
      const run = (bar, step, names, answer, where, from, to) => {
        names.forEach((name, k) =>
          bells.push({
            x: humBell(pitch(name), seed + 200 + bells.length),
            at: when(bar, step + k),
            where,
            db: from + ((to - from) * k) / (names.length - 1),
          }),
        );
        answer.forEach((name, k) =>
          bells.push({
            x: filter(
              humBell(pitch(name), seed + 200 + bells.length),
              "lp",
              2800,
              0.6,
            ),
            at: when(bar, step + 4 + k),
            where: -where,
            db: from + ((to - from) * k) / (answer.length - 1) - 7,
          }),
        );
      };
      /**
       * Adds one bell and its echoes a dotted eighth apart, each fainter
       * and duller than the last and in the other ear from it, with a grace
       * note a thirty-second before the strike if one is named.
       *
       * @param {number} bar
       * @param {number} step
       * @param {string} name
       * @param {number} where
       * @param {number} db
       * @param {number} echoes
       * @param {string} [grace]
       */
      const strike = (bar, step, name, where, db, echoes, grace) => {
        const at = when(bar, step);
        if (grace !== undefined)
          bells.push({
            x: humBell(pitch(grace), seed + 200 + bells.length),
            at: at - 0.0625,
            where,
            db: db - 7,
          });
        const ring = humBell(pitch(name), seed + 200 + bells.length);
        // An echo keeps the bell's hum and loses its top, twice dulled, so
        // it answers an octave under the strike and holds no high note.
        const dulled = (/** @type {number} */ k) => {
          const top = 1500 / Math.sqrt(k);
          return filter(filter(ring, "lp", top, 0.6), "lp", top, 0.6);
        };
        for (let k = 0; k <= echoes; k++)
          bells.push({
            x: k === 0 ? ring : dulled(k),
            at: at + 0.375 * k,
            where: k % 2 === 0 ? where : -where,
            db: db - 7 * k,
          });
      };
      // The bells' loudest notes sit 6 dB under the body's, so the layer's
      // weight is in its middle and the sparkle lies on top of it.
      run(
        0,
        8,
        ["E6", "G6", "A6", "C7"],
        ["E6", "G6", "A6", "C7"],
        0.55,
        -20,
        -15,
      );
      strike(1, 6, "D7", -0.4, -15, 3);
      strike(2, 4, "C7", -0.45, -16, 1, "A6");
      strike(2, 10, "G6", 0.5, -21, 1);
      run(
        3,
        4,
        ["E7", "D7", "C7", "A6", "G6"],
        ["D7", "C7", "A6", "G6", "E6"],
        -0.5,
        -14,
        -19,
      );
      strike(4, 10, "E6", 0.35, -19, 2);
      strike(5, 2, "A6", -0.3, -21, 0, "G6");
      run(5, 8, ["A6", "C7", "D7"], ["A6", "C7", "D7"], 0.5, -19, -16);
      strike(6, 4, "E7", 0.45, -15, 3);
      run(
        7,
        2,
        ["D7", "C7", "A6", "G6"],
        ["C7", "A6", "G6", "E6"],
        -0.55,
        -16,
        -20,
      );
      strike(7, 14, "E6", 0.3, -19, 0, "D6");

      /** @type {Moment[]} */
      const plucks = [];
      /**
       * Adds a plucked figure: a cell of three notes turning a dotted
       * eighth apart, so it falls with the beat only once in three beats,
       * coming up from nothing and dying away again.
       *
       * @param {number} bar
       * @param {number} step
       * @param {number} count
       * @param {readonly string[]} cell
       * @param {number} where
       */
      const figure = (bar, step, count, cell, where) => {
        for (let k = 0; k < count; k++)
          plucks.push({
            x: plucked(
              pitch(cell[k % cell.length] ?? "G5"),
              seed + 300 + plucks.length,
            ),
            at: when(bar, step + 3 * k),
            where: where * (k % 2 === 0 ? 1 : 0.5),
            db: -15 - 7 * (1 - Math.sin((Math.PI * (k + 0.5)) / count)),
          });
      };
      figure(1, 2, 10, ["C6", "G5", "D6"], 0.35);
      figure(4, 3, 12, ["A5", "E6", "G5"], -0.35);

      return together([
        roomed(strewn([...body, ...plucks], seconds), seconds, {
          decay: 1.1,
          mix: 0.22,
          size: 1.3,
        }),
        // The bells' room is long and wide, and loses its highs fast, so a
        // bell's hum blooms in it and its top is gone in under a second.
        roomed(strewn(bells, seconds), seconds, {
          decay: 2.2,
          mix: 0.4,
          damp: 0.8,
          size: 1.8,
        }),
      ]);
    },
  },
];
