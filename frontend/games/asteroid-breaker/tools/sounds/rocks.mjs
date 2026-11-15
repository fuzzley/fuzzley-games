// The rocks: what each material sounds like as it breaks, at each size it
// comes in, as it holds a hit, and as a volatile one goes off. Material is
// the ring: stone knocks and crumbles, ice is glass, a crystal chimes in
// key, iron clanks and rings on, a lodestone is stone over a dark tone that
// bends down, and a volatile rock thumps, roars and crackles. Size moves
// all of it down in pitch and out in time.

import {
  MASS,
  SR,
  between,
  clank,
  crack,
  crackle,
  drive,
  fade,
  filter,
  gain,
  glide,
  knock,
  mix,
  modes,
  near,
  noise,
  osc,
  perc,
  pitch,
  resonate,
  reverb,
  rubble,
  scatter,
  seeded,
  slivers,
  thump,
  unit,
} from "@fz/dev/synth";
import { bell } from "./chain.mjs";

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Signal } from "@fz/dev/synth" */

/** @typedef {"small" | "medium" | "large"} Size A rock's size, which is its break's level too. */

/** @typedef {readonly [number, number]} Band The lowest and the highest pitch of a band, in Hz. */

/** The sizes a rock breaks at, smallest first. */
const SIZES = /** @type {const} */ (["small", "medium", "large"]);

// --- Stone --------------------------------------------------------------

/**
 * What a stone of each size breaks with: its knock's lowest mode, in Hz,
 * and the seconds it rings; its crack's snaps, the time they run over and
 * their band; its debris, how many grains over how long, in what band and
 * how long each; and its room.
 *
 * @typedef {object} StoneBreak
 * @property {number} knock
 * @property {number} ring
 * @property {number} snaps
 * @property {number} over
 * @property {Band} band
 * @property {number} grains
 * @property {number} fall
 * @property {Band} grit
 * @property {number} grain
 * @property {number} room
 * @property {number} wet
 */

/** @type {Readonly<Record<Size, StoneBreak>>} */
const STONE = {
  small: {
    knock: 560,
    ring: 0.055,
    snaps: 2,
    over: 0.004,
    band: [3200, 9500],
    grains: 10,
    fall: 0.13,
    grit: [1800, 7000],
    grain: 0.011,
    room: 0.14,
    wet: 0.07,
  },
  medium: {
    knock: 345,
    ring: 0.085,
    snaps: 3,
    over: 0.01,
    band: [2500, 8500],
    grains: 18,
    fall: 0.25,
    grit: [1000, 5500],
    grain: 0.015,
    room: 0.2,
    wet: 0.09,
  },
  large: {
    knock: 232,
    ring: 0.14,
    snaps: 4,
    over: 0.018,
    band: [1900, 7500],
    grains: 30,
    fall: 0.42,
    grit: [520, 4200],
    grain: 0.021,
    room: 0.28,
    wet: 0.11,
  },
};

/**
 * Returns a stone breaking, dry: a crack, a knock sized to it, and a
 * crumble of debris that settles; a large one has a thump under its knock.
 *
 * @param {Size} size
 * @param {number} seed
 * @param {number} [tone] Its pitch against plain stone's: under 1 is darker.
 * @returns {Signal}
 */
function stone(size, seed, tone = 1) {
  const s = STONE[size];
  const random = seeded(seed);
  const tune = tone * near(random, 0.05);
  const ring = near(random, 0.16);
  const layers = [
    {
      x: crack({
        seed: seed + 1,
        snaps: s.snaps,
        over: s.over,
        low: s.band[0] * tone,
        high: s.band[1] * tone,
      }),
      gain: 0.8,
    },
    {
      x: knock({
        freq: s.knock * tune,
        decay: s.ring * ring,
        seed: seed + 2,
        tilt: size === "large" ? 0.2 : 0.7,
        dull: 0.7,
      }),
    },
    {
      x: rubble({
        count: s.grains + Math.round(random() * 3 - 1),
        seconds: s.fall * near(random, 0.18),
        seed: seed + 3,
        low: s.grit[0] * tone,
        high: s.grit[1] * tone,
        grain: s.grain,
      }),
      at: 0.006,
      gain: 0.9,
    },
  ];
  if (size === "large") {
    layers.push({
      x: thump({ from: 118 * tune, to: 62 * tune, over: 0.09, decay: 0.16 }),
      gain: 0.22,
    });
  }
  return mix(layers);
}

// --- Ice ----------------------------------------------------------------

/**
 * What ice of each size breaks with: the band its pane's partials lie in,
 * how many there are and the seconds the longest rings; how long the
 * shatter's burst of noise is; its slivers, how many over how long, in
 * what band and how long each pings; and where its lows are cut.
 *
 * @typedef {object} IceBreak
 * @property {number} base
 * @property {number} top
 * @property {number} partials
 * @property {number} ring
 * @property {number} burst
 * @property {number} chips
 * @property {number} spray
 * @property {Band} chip
 * @property {number} ping
 * @property {number} floor
 */

/** @type {Readonly<Record<Size, IceBreak>>} */
const ICE = {
  small: {
    base: 2300,
    top: 9800,
    partials: 9,
    ring: 0.09,
    burst: 0.05,
    chips: 14,
    spray: 0.12,
    chip: [4200, 10500],
    ping: 0.04,
    floor: 900,
  },
  medium: {
    base: 1500,
    top: 9200,
    partials: 13,
    ring: 0.14,
    burst: 0.08,
    chips: 24,
    spray: 0.25,
    chip: [3300, 9800],
    ping: 0.055,
    floor: 650,
  },
  large: {
    base: 950,
    top: 8600,
    partials: 18,
    ring: 0.2,
    burst: 0.12,
    chips: 36,
    spray: 0.36,
    chip: [2600, 9200],
    ping: 0.07,
    floor: 420,
  },
};

/**
 * Returns ice breaking: a sharp crack, a pane's many high partials struck
 * and shattered, dying fast, and a spray of slivers, with little under
 * them.
 *
 * @param {Size} size
 * @param {number} seed
 * @returns {Signal}
 */
function ice(size, seed) {
  const s = ICE[size];
  const random = seeded(seed);
  const tune = near(random, 0.06);
  const ring = near(random, 0.16);
  const pane = Array.from({ length: s.partials }, (_, k) => {
    const share = (k + 0.8 * random()) / s.partials;
    return {
      freq: s.base * tune * (s.top / s.base) ** share,
      decay: s.ring * ring * between(random, 0.45, 1.2) * (1 - 0.5 * share),
      gain: between(random, 0.4, 1) * (1 - 0.4 * share),
      phase: random(),
    };
  });
  const struck = modes(pane, s.ring * 1.5);
  const shattered = resonate(
    gain(noise("white", s.burst, seed + 4), perc(0.001, s.burst, s.burst)),
    pane.map((partial) => ({ ...partial, decay: partial.decay * 0.7 })),
    s.ring,
  );
  const layers = [
    {
      x: crack({
        seed: seed + 1,
        snaps: 2,
        over: 0.003,
        low: 5000,
        high: 12000,
        snap: 0.0025,
      }),
      gain: 0.4,
    },
    { x: unit(struck), gain: 0.5 },
    { x: unit(shattered) },
    {
      x: slivers({
        count: s.chips + Math.round(random() * 4 - 2),
        seconds: s.spray * near(random, 0.18),
        seed: seed + 3,
        low: s.chip[0],
        high: s.chip[1],
        ring: s.ping,
      }),
      at: 0.008,
      gain: 0.24,
    },
  ];
  if (size === "large") {
    layers.push({
      x: knock({ freq: 430 * tune, decay: 0.05, seed: seed + 2, hard: 1.5 }),
      gain: 0.25,
    });
  }
  // Driven a little, so the slivers that land together crunch rather than
  // spike, then cut under its floor, where ice has nothing.
  const dry = filter(
    drive(gain(unit(mix(layers)), 0.8), 1.5),
    "hp",
    s.floor,
    0.707,
  );
  return reverb(dry, {
    decay: 0.12 + 0.1 * SIZES.indexOf(size),
    mix: 0.09,
    damp: 0.2,
  });
}

// --- Crystal ------------------------------------------------------------

/**
 * Returns a crystal's chime at a note: the note itself, a hum an octave
 * under it that outlasts it, partials at two, three and four times it that
 * die sooner, and a twin of the note a few Hz off, so it shimmers.
 *
 * @param {number} note In Hz.
 * @param {number} ring The seconds it rings.
 * @param {number} seed
 * @returns {Signal}
 */
function chime(note, ring, seed) {
  const random = seeded(seed);
  return modes(
    [
      { freq: note / 2, decay: ring, gain: 0.2 },
      { freq: note, decay: ring * 0.85 },
      {
        freq: note + 5 + 3 * random(),
        decay: ring * 0.8,
        gain: 0.35,
        phase: 0.25,
      },
      { freq: note * 2.003, decay: ring * 0.5, gain: 0.42, phase: random() },
      { freq: note * 3.008, decay: ring * 0.3, gain: 0.2, phase: random() },
      { freq: note * 4.03, decay: ring * 0.18, gain: 0.1, phase: random() },
      { freq: note * 5.43, decay: ring * 0.1, gain: 0.07, phase: random() },
    ],
    ring * 1.1,
  );
}

/**
 * What a crystal of each size breaks with: the chord each take chimes, its
 * lead note first, the seconds it rings, and its shards, the notes they
 * ping at, how many and over how long. Every note is C, E or G.
 */
const CRYSTAL = {
  medium: {
    chords: [
      ["G5", "C6", "E6"],
      ["E5", "G5", "C6"],
    ],
    ring: 0.42,
    shards: ["G6", "C7", "E7", "G7"],
    count: 7,
    spray: 0.26,
  },
  large: {
    chords: [
      ["C5", "E5", "G5"],
      ["C5", "G5", "E6"],
    ],
    ring: 0.5,
    shards: ["E6", "G6", "C7", "E7", "G7"],
    count: 11,
    spray: 0.34,
  },
};

/**
 * Returns a crystal breaking: a soft tick, a chord of chimes struck within
 * a blink of each other, a crunch of noise rung at the shards' own notes,
 * and the shards pinging up the chord as they scatter, with specks of air.
 *
 * @param {"medium" | "large"} size
 * @param {number} take
 * @param {number} seed
 * @returns {Signal}
 */
function crystal(size, take, seed) {
  const c = CRYSTAL[size];
  const random = seeded(seed);
  const ring = c.ring * near(random, 0.12);
  const chord = c.chords[take % c.chords.length] ?? [];
  const shards = c.shards.map(pitch);
  const crunch = resonate(
    gain(noise("white", 0.03, seed + 4), perc(0.0003, 0.03, 0.03)),
    shards.flatMap((freq) => [
      { freq, decay: 0.05 },
      { freq: freq * 2.003, decay: 0.03, gain: 0.5 },
    ]),
    0.06,
  );
  return reverb(
    mix([
      {
        x: crack({ seed: seed + 1, snaps: 1, low: 4000, high: 9000 }),
        gain: 0.3,
      },
      ...chord.map((name, k) => ({
        x: chime(pitch(name), ring * (1 - 0.12 * k), seed + 10 + k),
        at: k * (0.009 + 0.004 * random()),
        gain: k === 0 ? 1 : 0.6 - 0.1 * k,
      })),
      { x: unit(crunch), gain: 0.3 },
      {
        x: scatter({
          count: c.count + Math.round(random() * 2 - 1),
          seconds: c.spray * near(random, 0.15),
          seed: seed + 3,
          bias: 1.3,
          grain: (i, r) =>
            bell(
              shards[Math.floor(r() * shards.length)] ?? 2093,
              between(r, 0.08, 0.16),
              seed + 20 + i,
            ),
          level: (share) => 0.5 - 0.3 * share,
        }),
        at: 0.03,
      },
      {
        x: crackle({
          count: c.count * 2,
          seconds: c.spray,
          seed: seed + 5,
          low: 6000,
          high: 11000,
          bias: 1.2,
        }),
        at: 0.02,
        gain: 0.2,
      },
    ]),
    { decay: 0.4, mix: 0.14, damp: 0.25 },
  );
}

// --- Iron ---------------------------------------------------------------

/**
 * What iron of each size breaks with: its clank's lowest partial, in Hz,
 * and the seconds it rings; its plates, how many clatter over how long, in
 * what band and how long each rings; and the knock of its weight.
 *
 * @typedef {object} IronBreak
 * @property {number} freq
 * @property {number} ring
 * @property {number} plates
 * @property {number} clatter
 * @property {Band} plate
 * @property {number} plateRing
 * @property {number} thud
 * @property {number} thudRing
 * @property {number} room
 */

/** @type {Readonly<Record<Size, IronBreak>>} */
const IRON_SIZES = {
  small: {
    freq: 1180,
    ring: 0.28,
    plates: 3,
    clatter: 0.15,
    plate: [1900, 3100],
    plateRing: 0.07,
    thud: 330,
    thudRing: 0.05,
    room: 0.2,
  },
  medium: {
    freq: 790,
    ring: 0.5,
    plates: 4,
    clatter: 0.26,
    plate: [1300, 2400],
    plateRing: 0.11,
    thud: 215,
    thudRing: 0.08,
    room: 0.3,
  },
  large: {
    freq: 500,
    ring: 0.7,
    plates: 6,
    clatter: 0.4,
    plate: [850, 1800],
    plateRing: 0.16,
    thud: 140,
    thudRing: 0.12,
    room: 0.4,
  },
};

/**
 * Returns iron breaking: a heavy clank whose partials ring on, the knock
 * of its weight under it, and its plates clattering after, each a smaller
 * clank.
 *
 * @param {Size} size
 * @param {number} seed
 * @returns {Signal}
 */
function iron(size, seed) {
  const s = IRON_SIZES[size];
  const random = seeded(seed);
  const tune = near(random, 0.05);
  const ring = near(random, 0.15);
  // Driven a little, as a hard hit makes iron clang: the ring comes up
  // under the strike, and its partials rub against each other.
  const dry = drive(
    gain(
      mix([
        {
          x: clank({
            freq: s.freq * tune,
            ring: s.ring * ring,
            seed,
            strike: 0.45,
          }),
        },
        {
          x: knock({
            freq: s.thud * tune,
            decay: s.thudRing,
            seed: seed + 2,
            tilt: 0.3,
            hard: 2.5,
          }),
          gain: 0.45,
        },
        {
          x: scatter({
            count: s.plates,
            seconds: s.clatter * near(random, 0.18),
            seed: seed + 4,
            bias: 1.2,
            grain: (i, r) =>
              clank({
                freq: between(r, s.plate[0], s.plate[1]),
                ring: s.plateRing * between(r, 0.7, 1.3),
                seed: seed + 40 + i,
                ratios: [1, 1.52, 2.31, 3.17, 4.4],
                strike: 0.9,
              }),
            level: (share) => 0.55 - 0.3 * share,
          }),
          at: 0.035 + 0.02 * random(),
        },
      ]),
      0.6,
    ),
    1.8,
  );
  return reverb(dry, { decay: s.room, mix: 0.1, damp: 0.3 });
}

/**
 * How loud each partial of the anvil rings for each take of a held hit:
 * the same lump struck in four places, so no two hits ring alike.
 */
const ANVIL_STRIKES = [
  [1, 0.25, 0.8, 0.2, 0.6, 0.15, 0.4, 0.1],
  [0.3, 1, 0.25, 0.85, 0.2, 0.6, 0.15, 0.3],
  [0.8, 0.7, 0.15, 0.3, 0.9, 0.2, 0.5, 0.15],
  [0.2, 0.5, 1, 0.6, 0.15, 0.45, 0.2, 0.25],
];

// --- Lodestone ----------------------------------------------------------

/** The notes a lodestone's tone bends from and to at each size, an A and an E, and over how long. */
const WUB = {
  small: { from: "E4", to: "A3", seconds: 0.15 },
  medium: { from: "A3", to: "E3", seconds: 0.28 },
  large: { from: "E3", to: "A2", seconds: 0.42 },
};

/**
 * Returns a lodestone's "wub": a dark, buzzing tone that bends down a
 * fourth or a fifth as its field lets go, a filter closing over it, its
 * wobble slowing as it falls.
 *
 * @param {Size} size
 * @param {number} seed
 * @returns {Signal}
 */
function wub(size, seed) {
  const w = WUB[size];
  const random = seeded(seed);
  const seconds = w.seconds * near(random, 0.15);
  const from = pitch(w.from);
  const to = pitch(w.to);
  const freq = glide(from, to, seconds * 0.8, seconds, 1.4);
  const buzz = drive(
    mix([
      osc("saw", freq, seconds),
      {
        x: osc("pulse", gain(freq, 1.006), seconds, { width: 0.3 }),
        gain: 0.5,
      },
    ]),
    2,
  );
  const wobble = osc(
    "sine",
    glide(26 * near(random, 0.15), 9, seconds, seconds),
    seconds,
    { phase: 0.25 },
  );
  // It falls 30 dB over its time, so it is still heard as the knock over
  // it dies, and is faded out at its end.
  const shape = wobble.map(
    (v, i) =>
      (0.5 + 0.5 * v) *
      Math.min(1, i / SR / 0.006) *
      Math.exp((-3.5 * i) / SR / seconds),
  );
  // Its lowest partial is cut: the ear hears the note from the partials over
  // it, and a phone has nothing under them to give.
  return fade(
    gain(
      filter(
        filter(buzz, "lp", glide(from * 8, to * 4, seconds, seconds, 1.3), 3),
        "hp",
        240,
        0.707,
      ),
      shape,
    ),
    0,
    seconds * 0.3,
  );
}

// --- Volatile -----------------------------------------------------------

/**
 * Returns a volatile rock going off: a click, a body of driven noise
 * closing down, a knock and a boom that falls in pitch under it, which
 * speak in their upper modes and harmonics, a tail of noise that falls
 * after it, and embers spitting. The small one is higher, shorter and
 * drier.
 *
 * @param {boolean} big
 * @param {number} seed
 * @returns {Signal}
 */
function blast(big, seed) {
  const random = seeded(seed);
  const tune = near(random, 0.06);
  const time = (big ? 1 : 0.62) * near(random, 0.12);
  const bodyTime = 0.4 * time;
  const body = gain(
    filter(
      filter(
        drive(
          mix([
            noise("white", bodyTime, seed + 2),
            { x: noise("pink", bodyTime, seed + 6), gain: 3 },
          ]),
          3,
        ),
        "lp",
        glide(
          (big ? 3400 : 4400) * tune,
          (big ? 520 : 700) * tune,
          bodyTime * 0.7,
          bodyTime,
          1.5,
        ),
        0.9,
      ),
      "hp",
      170,
      0.707,
    ),
    perc(0.002, bodyTime * 0.9, bodyTime),
  );
  const tailTime = 0.9 * time;
  // The tail falls 30 dB over its time and is faded out at its end, so it
  // is heard after the body, and stays above the lows, where four blasts'
  // tails at once would be mud.
  const tail = fade(
    gain(
      filter(
        noise("pink", tailTime, seed + 3),
        "bp",
        glide(1700 * tune, 420, tailTime, tailTime),
        0.9,
      ),
      perc(0.03, tailTime * 1.8, tailTime),
    ),
    0,
    tailTime * 0.4,
  );
  // The whole is driven a little, as a blast overloads whatever hears it,
  // which brings its body up under its click.
  return reverb(
    drive(
      gain(
        mix([
          {
            x: crack({ seed: seed + 1, snaps: 2, over: 0.003, snap: 0.004 }),
            gain: 0.6,
          },
          { x: unit(body) },
          {
            x: knock({
              freq: (big ? 175 : 240) * tune,
              decay: 0.2 * time,
              seed: seed + 5,
              ratios: MASS,
              tilt: 0.15,
              hard: 3,
            }),
            gain: 0.5,
          },
          {
            x: thump({
              from: (big ? 128 : 172) * tune,
              to: (big ? 46 : 72) * tune,
              over: 0.24 * time,
              decay: 0.42 * time,
              hard: 3.5,
            }),
            gain: 0.24,
          },
          { x: unit(tail), at: 0.02, gain: 0.3 },
          {
            x: crackle({
              count: big ? 26 : 14,
              seconds: tailTime * 0.85,
              seed: seed + 4,
              bias: 1.4,
            }),
            at: 0.06,
            gain: 0.35,
          },
        ]),
        0.5,
      ),
      2,
    ),
    { decay: big ? 0.45 : 0.3, mix: 0.12, damp: 0.5 },
  );
}

/** @type {Recipe[]} */
export const SOUNDS = [
  ...SIZES.map((size) => ({
    name: `break-stone-${size}`,
    about: `A ${size} stone breaks: a crack, a knock of a few low, scattered partials sized to it, and a crumble of debris that settles.`,
    takes: 3,
    level: size,
    plays: [`broken (stone, ${size})`],
    make: (/** @type {number} */ _take, /** @type {number} */ seed) =>
      reverb(stone(size, seed), {
        decay: STONE[size].room,
        mix: STONE[size].wet,
        damp: 0.5,
      }),
  })),
  ...SIZES.map((size) => ({
    name: `break-ice-${size}`,
    about: `A ${size} rock of ice breaks: a sharp crack, a pane's many high partials struck and shattered, dying fast, and a spray of tinkling slivers.`,
    takes: 3,
    level: size,
    plays: [`broken (ice, ${size})`],
    make: (/** @type {number} */ _take, /** @type {number} */ seed) =>
      ice(size, seed),
  })),
  .../** @type {const} */ (["medium", "large"]).map((size) => ({
    name: `break-crystal-${size}`,
    about: `A ${size} crystal breaks and drops its pickup: a chord of chimes on C, E and G, a crunch rung at the same notes, and shards pinging up the chord.`,
    takes: 2,
    level: size,
    plays: [`broken (crystal, ${size})`],
    make: (/** @type {number} */ take, /** @type {number} */ seed) =>
      crystal(size, take, seed),
  })),
  ...SIZES.map((size) => ({
    name: `break-iron-${size}`,
    about: `A ${size} rock of iron breaks: a heavy clank of partials that disagree and ring on, the knock of its weight, and its plates clattering after.`,
    takes: 2,
    level: size,
    plays: [`broken (iron, ${size})`],
    make: (/** @type {number} */ _take, /** @type {number} */ seed) =>
      iron(size, seed),
  })),
  ...SIZES.map((size) => ({
    name: `break-lodestone-${size}`,
    about: `A ${size} lodestone breaks: a darker stone's crack, knock and crumble over a buzzing tone that bends down from ${WUB[size].from} to ${WUB[size].to} as its field lets go.`,
    takes: 2,
    level: size,
    plays: [`broken (lodestone, ${size})`],
    make: (/** @type {number} */ _take, /** @type {number} */ seed) =>
      reverb(
        mix([
          stone(size, seed, 0.78),
          { x: unit(wub(size, seed + 9)), at: 0.004, gain: 0.85 },
        ]),
        { decay: STONE[size].room + 0.05, mix: STONE[size].wet, damp: 0.6 },
      ),
  })),
  {
    name: "hit-stone",
    about:
      "A boulder or a lodestone holds a hit: a knock and a crack, with no crumble, as nothing came off.",
    takes: 3,
    level: "small",
    plays: ["hit (stone, lodestone, held)"],
    make: (_take, seed) => {
      const random = seeded(seed);
      return reverb(
        mix([
          {
            x: crack({ seed: seed + 1, over: 0.004, low: 2800 }),
            gain: 0.8,
          },
          {
            x: knock({
              freq: 430 * near(random, 0.06),
              decay: 0.06 * near(random, 0.15),
              seed: seed + 2,
            }),
          },
        ]),
        { decay: 0.12, mix: 0.07, damp: 0.5 },
      );
    },
  },
  {
    name: "hit-iron",
    about:
      "A shot rings off iron that holds: a bright clank and a ring, each take the same anvil struck elsewhere, so other partials of it ring loudest.",
    takes: 4,
    level: "small",
    plays: ["hit (iron, held)", "shielded"],
    make: (take, seed) => {
      const random = seeded(seed);
      return reverb(
        clank({
          freq: pitch("C6"),
          ring: 0.44 * near(random, 0.12),
          seed,
          lump: 20261114,
          weights: ANVIL_STRIKES[take % ANVIL_STRIKES.length] ?? [],
          strike: 0.8,
        }),
        { decay: 0.3, mix: 0.1, damp: 0.25 },
      );
    },
  },
  {
    name: "hit-boulder",
    about:
      "A boulder holds a hit: a deep knock and a thump, and a crack that runs on through it, its snaps slowing and falling.",
    takes: 3,
    level: "medium",
    plays: ["hit (boulder, held)"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const tune = near(random, 0.05);
      const fissure = scatter({
        count: 9,
        seconds: 0.16 * near(random, 0.15),
        seed: seed + 4,
        bias: 1.4,
        grain: (i, r, share) =>
          gain(
            crack({
              seed: seed + 50 + i,
              snaps: 1,
              low: 2600 * (1 - 0.5 * share),
              high: 8000 * (1 - 0.5 * share),
              snap: 0.003 + 0.004 * share,
            }),
            between(r, 0.4, 1),
          ),
        level: (share) => 1 - 0.6 * share,
      });
      return reverb(
        mix([
          {
            x: crack({
              seed: seed + 1,
              snaps: 3,
              over: 0.012,
              low: 2000,
              high: 7500,
            }),
            gain: 0.8,
          },
          {
            x: knock({
              freq: 188 * tune,
              decay: 0.17 * near(random, 0.15),
              seed: seed + 2,
              ratios: MASS,
              tilt: 0.15,
              hard: 2.5,
            }),
          },
          {
            x: thump({
              from: 105 * tune,
              to: 55 * tune,
              over: 0.1,
              decay: 0.2,
            }),
            gain: 0.2,
          },
          { x: fissure, at: 0.02, gain: 0.45 },
        ]),
        { decay: 0.32, mix: 0.12, damp: 0.5 },
      );
    },
  },
  {
    name: "break-boulder",
    about:
      "The boulder breaks, in three beats: a crack that flares, snaps quickening over a tearing rise; a deep split, a knock and a falling boom under a roar of noise; and large pieces thrown out, knocking over a rumble as they go.",
    level: "huge",
    plays: ["broken (boulder)"],
    make: (_take, seed) => {
      const flare = scatter({
        count: 14,
        seconds: 0.11,
        seed: seed + 1,
        bias: 0.6,
        grain: (i, r, share) =>
          gain(
            crack({
              seed: seed + 60 + i,
              snaps: 1,
              low: 2200 + 1500 * share,
              high: 9000,
              snap: 0.003,
            }),
            between(r, 0.5, 1),
          ),
        level: (share) => 0.3 + 0.7 * share,
      });
      const tear = gain(
        filter(
          noise("white", 0.12, seed + 9),
          "bp",
          glide(1200, 4500, 0.12, 0.12),
          1,
        ),
        (t) => Math.min(1, t / 0.115) ** 2,
      );
      const roar = gain(
        filter(
          filter(
            drive(
              mix([
                noise("white", 0.5, seed + 2),
                { x: noise("pink", 0.5, seed + 3), gain: 3 },
              ]),
              3,
            ),
            "lp",
            glide(2800, 480, 0.35, 0.5, 1.5),
            0.9,
          ),
          "hp",
          160,
          0.707,
        ),
        perc(0.002, 0.48, 0.5),
      );
      const split = mix([
        {
          x: crack({
            seed: seed + 4,
            snaps: 5,
            over: 0.03,
            low: 1500,
            high: 7000,
            snap: 0.006,
          }),
          gain: 0.8,
        },
        {
          x: knock({
            freq: 128,
            decay: 0.42,
            seed: seed + 5,
            ratios: MASS,
            tilt: 0.1,
            hard: 3,
          }),
        },
        {
          x: thump({ from: 92, to: 40, over: 0.3, decay: 0.55, hard: 3.5 }),
          gain: 0.3,
        },
        { x: unit(roar), gain: 0.9 },
      ]);
      const pieces = scatter({
        count: 9,
        seconds: 0.85,
        seed: seed + 6,
        bias: 1.5,
        grain: (i, r) =>
          mix([
            {
              x: crack({
                seed: seed + 80 + i,
                snaps: 1,
                low: 1800,
                high: 6500,
              }),
              gain: 0.5,
            },
            {
              x: knock({
                freq: between(r, 150, 400),
                decay: between(r, 0.09, 0.18),
                seed: seed + 90 + i,
                tilt: 0.3,
              }),
            },
          ]),
        level: (share) => 0.7 - 0.45 * share,
      });
      const rumble = gain(
        filter(
          drive(gain(noise("brown", 1.4, seed + 7), 4), 3),
          "bp",
          glide(700, 280, 1.2, 1.4),
          0.8,
        ),
        perc(0.08, 1.3, 1.4),
      );
      return reverb(
        mix([
          { x: flare, gain: 1.1 },
          { x: unit(tear), gain: 0.3 },
          { x: split, at: 0.12 },
          { x: pieces, at: 0.3 },
          { x: unit(rumble), at: 0.16, gain: 0.5 },
          {
            x: rubble({
              count: 40,
              seconds: 1.1,
              seed: seed + 8,
              low: 400,
              high: 3500,
              grain: 0.016,
              bias: 1.4,
            }),
            at: 0.2,
            gain: 0.6,
          },
        ]),
        { decay: 0.6, mix: 0.16, damp: 0.5, size: 1.3 },
      );
    },
  },
  {
    name: "fuse-volatile",
    about:
      "A volatile rock's seams flare just before it goes off: a sizzle of noise and a whine, both rising fast, with specks spitting faster as it comes.",
    level: "small",
    plays: ["lit (a volatile rock's fuse)"],
    make: (_take, seed) => {
      const rise = 0.1;
      const seconds = 0.114;
      const sizzle = filter(
        noise("white", seconds, seed),
        "bp",
        glide(1800, 6500, rise, seconds),
        1.6,
      );
      const whine = filter(
        osc("saw", glide(700, 2600, rise, seconds), seconds),
        "lp",
        5000,
        1,
      );
      return gain(
        mix([
          sizzle,
          { x: whine, gain: 0.3 },
          {
            x: crackle({
              count: 16,
              seconds: rise,
              seed: seed + 1,
              bias: 0.6,
              low: 3000,
              fade: -0.5,
            }),
            gain: 0.25,
          },
        ]),
        (t) => Math.min(1, t / rise) ** 2.2,
      );
    },
  },
  {
    name: "blast-volatile",
    about:
      "A volatile rock goes off: a click, a body of driven noise closing down, a boom falling in pitch that speaks in its harmonics, a tail of noise falling after it, and embers spitting.",
    takes: 3,
    level: "huge",
    plays: ["blast (large or medium)"],
    make: (_take, seed) => blast(true, seed),
  },
  {
    name: "blast-volatile-small",
    about:
      "A small volatile rock goes off, or a later link of a chain of blasts: the blast, higher, shorter and drier.",
    takes: 2,
    level: "large",
    plays: ["blast (small)"],
    make: (_take, seed) => blast(false, seed),
  },
  {
    name: "break-cluster",
    about:
      "Many small rocks break in one frame, heard as one sound: a patter of small stone knocks and a few glassy ticks over a shared crumble, with no crack of its own.",
    takes: 3,
    level: "medium",
    plays: ["broken (more than three in a frame, with the largest breaks)"],
    make: (_take, seed) => {
      const random = seeded(seed);
      const seconds = 0.3 * near(random, 0.15);
      const patter = scatter({
        count: 13 + Math.floor(random() * 4),
        seconds,
        seed: seed + 1,
        bias: 1.3,
        grain: (i, r) =>
          mix([
            {
              x: crack({
                seed: seed + 30 + i,
                snaps: 1,
                low: 3000,
                high: 8500,
                snap: 0.0025,
              }),
              gain: 0.35,
            },
            {
              x: knock({
                freq: between(r, 380, 900),
                decay: between(r, 0.03, 0.06),
                seed: seed + 60 + i,
              }),
            },
          ]),
        level: (share) => 0.75 - 0.35 * share,
      });
      return reverb(
        mix([
          patter,
          {
            x: slivers({
              count: 6,
              seconds: seconds * 1.1,
              seed: seed + 3,
              low: 3500,
              high: 8500,
              ring: 0.04,
              bias: 1,
            }),
            at: 0.01,
            gain: 0.3,
          },
          {
            x: rubble({
              count: 26,
              seconds: 0.42,
              seed: seed + 4,
              low: 1100,
              high: 6000,
              grain: 0.012,
              bias: 1.3,
              bed: 0.7,
            }),
            at: 0.004,
            gain: 0.8,
          },
        ]),
        { decay: 0.22, mix: 0.1, damp: 0.5 },
      );
    },
  },
];
