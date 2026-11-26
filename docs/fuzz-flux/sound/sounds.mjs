/**
 * Fuzz Flux's sound effects, each a recipe written out in `synth.mjs`'s
 * terms: no recording and no sample, nothing borrowed from another game.
 *
 * The recipes keep to four rules, which "Sound" in the design explains: soft
 * attacks, nothing above 6 kHz, weight carried at 250 to 900 Hz where a phone
 * can play it, and every pitched sound on one five-note scale.
 */

import {
  add,
  buzz,
  filter,
  finish,
  gain,
  glide,
  hz,
  layer,
  noise,
  ramp,
  room,
  shape,
  silence,
  tone,
  warm,
} from "./synth.mjs";

/** The ladder a move's waves climb: C major's five-note scale from C5, as MIDI notes. */
export const LADDER = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];

/**
 * Returns the frequency of a step of the ladder, which holds at its top.
 * @param {number} step From 0.
 * @returns {number}
 */
export function rung(step) {
  return hz(LADDER[Math.max(0, Math.min(LADDER.length - 1, step))]);
}

/**
 * Returns a soft mallet's note: a sine and a little triangle that scoop up
 * to the pitch, under a short dark puff of air.
 * @param {number} freq
 * @param {object} [o]
 * @param {number} [o.decay]
 * @param {number} [o.scoop] Semitones it starts flat by.
 * @param {number} [o.air] How loud its puff is.
 * @param {number} [o.seed]
 * @returns {Float32Array}
 */
function mallet(freq, { decay = 0.06, scoop = 3, air = 0.35, seed = 3 } = {}) {
  const seconds = Math.min(0.6, decay * 5 + 0.04);
  const pitch = (/** @type {number} */ t) =>
    freq * 2 ** ((-scoop * Math.exp(-t / 0.011)) / 12);
  const body = shape(tone("sine", pitch, seconds), { attack: 0.006, decay });
  const edge = shape(tone("triangle", pitch, seconds), {
    attack: 0.006,
    decay: decay * 0.6,
  });
  const over = shape(
    tone("sine", (t) => pitch(t) * 2, seconds),
    { attack: 0.005, decay: decay * 0.5 },
  );
  const puff = shape(
    filter(filter(noise(0.06, seed), "band", 1500, 0.9), "low", 3000),
    {
      attack: 0.003,
      decay: 0.012,
    },
  );
  return layer([
    [body, 0, 0.8],
    [edge, 0, 0.22],
    [over, 0, 0.16],
    [puff, 0, air],
  ]);
}

/**
 * Returns a small bell, three partials that are not quite in tune with one
 * another, which is kept for the special fuzzballs.
 * @param {number} freq
 * @param {number} [decay]
 * @returns {Float32Array}
 */
function bell(freq, decay = 0.16) {
  const seconds = Math.min(1.2, decay * 5);
  /** @type {[Float32Array, number, number][]} */
  const parts = [];
  for (const [ratio, level, fade] of [
    [1, 0.8, 1],
    [2.76, 0.26, 0.5],
    [4.07, 0.1, 0.3],
  ]) {
    if (freq * ratio > 6000) continue;
    parts.push([
      shape(tone("sine", freq * ratio, seconds), {
        attack: 0.005,
        decay: decay * fade,
      }),
      0,
      level,
    ]);
  }
  return layer(parts);
}

/**
 * Returns a fuzzball's voice: a buzz through two moving vowel filters, with a
 * rise in pitch and a late wobble.
 * @param {object} o
 * @param {number} o.from Hertz.
 * @param {number} o.rise Semitones it climbs.
 * @param {number} o.seconds
 * @param {[number, number]} [o.open] The first vowel's two formants.
 * @param {[number, number]} [o.close] The last vowel's.
 * @param {number} [o.over] Seconds the rise takes.
 * @param {number} [o.wobble] How deep the vibrato is, as a share of the pitch.
 * @returns {Float32Array}
 */
function voice({
  from,
  rise,
  seconds,
  open = [390, 1130],
  close = [950, 1420],
  over = 0.1,
  wobble = 0.012,
}) {
  const pitch = (/** @type {number} */ t) => {
    const up = from * 2 ** ((rise * Math.min(1, t / over)) / 12);
    const late = Math.max(0, Math.min(1, (t - 0.08) / 0.08));
    return up * (1 + wobble * late * Math.sin(2 * Math.PI * 7 * t));
  };
  const source = buzz(pitch, seconds, 5500, 1.1);
  const vowel = (/** @type {0 | 1} */ n) => ramp(open[n], close[n], over * 1.2);
  const out = layer([
    [filter(source, "band", vowel(0), 5), 0, 1],
    [filter(source, "band", vowel(1), 7), 0, 0.7],
    [filter(source, "low", 900), 0, 0.2],
  ]);
  const hold = Math.max(0, seconds - 0.012 - 0.09);
  return shape(out, { attack: 0.012, hold, decay: 0.03 });
}

/**
 * Returns a rush of air: noise through a band that sweeps up and back.
 * @param {object} o
 * @param {number} o.seconds
 * @param {number} o.from Hertz.
 * @param {number} o.peak
 * @param {number} o.to
 * @param {number} [o.q]
 * @param {number} [o.seed]
 * @param {number} [o.lean] Where in the sound the peak comes, from 0 to 1.
 * @returns {Float32Array}
 */
function whoosh({ seconds, from, peak, to, q = 1.3, seed = 5, lean = 0.4 }) {
  const center = (/** @type {number} */ t) => {
    const u = t / seconds;
    return u < lean
      ? from * (peak / from) ** (u / lean)
      : peak * (to / peak) ** ((u - lean) / (1 - lean));
  };
  const air = filter(
    filter(noise(seconds, seed), "band", center, q),
    "low",
    5200,
  );
  return gain(air, (t) => {
    const u = t / seconds;
    return u < lean ? (u / lean) ** 1.6 : (1 - (u - lean) / (1 - lean)) ** 1.8;
  });
}

/**
 * Returns a cushion knocked off a brick: a soft thump, the cloth leaving, and
 * the pile under it springing up to a note, a step of the scale higher the
 * fewer layers are left.
 * @param {number} left The layers the brick has left, 1 to 3.
 * @returns {Float32Array}
 */
export function knock(left) {
  const note2 = rung(3 - left) / 2;
  const thump = shape(tone("sine", glide(430, 270, 0.04), 0.09), {
    attack: 0.004,
    decay: 0.02,
  });
  const cloth = whoosh({
    seconds: 0.12,
    from: 600,
    peak: 2300,
    to: 1100,
    q: 1,
    seed: 40 + left,
    lean: 0.3,
  });
  // The spring: a note that swoops up to its pitch and wobbles once on it.
  const pitch = (/** @type {number} */ t) =>
    note2 *
    2 ** ((-6 * Math.exp(-t / 0.028)) / 12) *
    (1 + 0.018 * Math.sin(2 * Math.PI * 17 * t) * Math.exp(-t / 0.09));
  const spring = shape(tone("sine", pitch, 0.3), {
    attack: 0.014,
    decay: 0.055,
  });
  // Its octave, which a phone's speaker carries where it drops the note itself.
  const over = shape(
    tone("sine", (t) => pitch(t) * 2, 0.24),
    { attack: 0.012, decay: 0.04 },
  );
  return finish(
    layer([
      [thump, 0, 0.7],
      [cloth, 0.008, 0.42],
      [spring, 0.05, 0.6],
      [over, 0.05, 0.34],
    ]),
    -14,
  );
}

/**
 * Returns a few bright specks scattered over a moment, each on the scale.
 * @param {number} seconds
 * @param {number} count
 * @param {number} seed
 * @returns {Float32Array}
 */
function sparkle(seconds, count, seed) {
  const out = silence(seconds + 0.2);
  let a = seed * 7919;
  for (let n = 0; n < count; n++) {
    a = (Math.imul(a, 1103515245) + 12345) >>> 0;
    const at = ((a >>> 8) % 1000) / 1000;
    a = (Math.imul(a, 1103515245) + 12345) >>> 0;
    const step = 5 + ((a >>> 8) % 5);
    const speck = shape(tone("sine", rung(step) * 2, 0.09), {
      attack: 0.004,
      decay: 0.022,
    });
    add(out, speck, at * seconds, 0.35 + 0.3 * (1 - at));
  }
  return filter(out, "low", 5600);
}

/**
 * The note a bunch plays: one step of the ladder for each wave of a move, and
 * a fuller chord the bigger the bunch.
 * @param {number} step The wave, from 0.
 * @param {number} [size] How many fuzzballs the bunch gathered.
 * @param {number} [variant] 0, 1 or 2: three takes on the puff of air, so a note heard often does not tire.
 * @returns {Float32Array}
 */
export function note(step, size = 3, variant = 0) {
  /** @type {[Float32Array, number, number][]} */
  const parts = [
    [
      mallet(rung(step), {
        seed: 3 + variant * 11,
        air: 0.32 + variant * 0.04,
      }),
      0,
      1,
    ],
  ];
  if (size >= 4)
    parts.push([mallet(rung(step + 2), { air: 0.1, seed: 9 }), 0.022, 0.6]);
  if (size >= 5)
    parts.push([mallet(rung(step + 4), { air: 0.1, seed: 13 }), 0.044, 0.5]);
  return finish(layer(parts), -10 - Math.min(step, 9) * 0.4);
}

/**
 * The pop of one fuzzball hopping off: a bubble's blip, an octave pair that
 * rises an octave in 70 ms.
 * @param {number} step
 * @returns {Float32Array}
 */
export function pop(step) {
  const base = rung(step);
  const pitch = (/** @type {number} */ t) => base * 2 ** Math.min(1, t / 0.07);
  const low = shape(tone("sine", pitch, 0.16), {
    attack: 0.004,
    hold: 0.03,
    decay: 0.022,
  });
  const high = shape(
    tone("sine", (t) => pitch(t) * 2, 0.16),
    { attack: 0.004, hold: 0.02, decay: 0.018 },
  );
  return finish(
    layer([
      [low, 0, 0.8],
      [high, 0, 0.3],
    ]),
    -16,
  );
}

/**
 * The tick of static landing on one fuzzball, which climbs as a frizzball
 * takes them in turn.
 * @param {number} step
 * @returns {Float32Array}
 */
export function zap(step) {
  const blip = shape(tone("triangle", rung(step) * 2, 0.07), {
    attack: 0.002,
    decay: 0.012,
  });
  const tick = shape(filter(noise(0.02, 21 + step), "band", 3600, 1.2), {
    attack: 0.001,
    decay: 0.004,
  });
  return finish(
    filter(
      layer([
        [blip, 0, 0.7],
        [tick, 0, 0.5],
      ]),
      "low",
      5600,
    ),
    -16,
  );
}

/**
 * A fuzzball's cheer as a move's waves pile up, louder and fuller by the tier.
 * @param {number} tier 1 to 4, at the 3rd, 5th, 7th and 9th wave.
 * @returns {Float32Array}
 */
export function chirp(tier) {
  const from = [0, 500, 560, 620, 700][tier];
  const rise = 3 + tier;
  const seconds = 0.15 + tier * 0.04;
  /** @type {[Float32Array, number, number][]} */
  const parts = [[voice({ from, rise, seconds }), 0, 1]];
  if (tier >= 3)
    parts.push([voice({ from: from * 1.26, rise, seconds }), 0.02, 0.6]);
  if (tier >= 4)
    parts.push([voice({ from: from * 1.5, rise, seconds }), 0.04, 0.5]);
  return finish(warm(layer(parts), 1.2), -14 + tier * 0.8);
}

/**
 * Returns the sound of a special fuzzball being made: a rising fifth, and
 * something of what it will do.
 * @param {'dasher' | 'puffer' | 'wisp' | 'frizz'} what
 * @returns {Float32Array}
 */
export function born(what) {
  if (what === "frizz") {
    /** @type {[Float32Array, number, number][]} */
    const parts = [5, 7, 8, 10].map((step, n) => [
      bell(rung(step), 0.13),
      n * 0.05,
      0.7,
    ]);
    const crackle = silence(0.5);
    for (let n = 0; n < 14; n++) {
      const tick = shape(
        filter(noise(0.012, 40 + n), "band", 3000 + (n % 4) * 500, 2),
        {
          attack: 0.001,
          decay: 0.003,
        },
      );
      add(crackle, tick, 0.02 + ((n * 37) % 100) / 240, 0.5);
    }
    parts.push([crackle, 0, 0.45], [sparkle(0.35, 6, 3), 0.15, 0.5]);
    return finish(room(layer(parts), { seconds: 0.4, wet: 0.18 }), -6, 0.05);
  }
  const root =
    what === "wisp" ? rung(5) : what === "puffer" ? rung(0) : rung(2);
  /** @type {[Float32Array, number, number][]} */
  const parts = [
    [bell(root, 0.1), 0, 0.8],
    [bell(root * 1.5, 0.14), 0.1, 0.9],
  ];
  if (what === "dasher") {
    parts.push([
      whoosh({
        seconds: 0.16,
        from: 700,
        peak: 3200,
        to: 2400,
        q: 2,
        lean: 0.8,
      }),
      0.02,
      0.5,
    ]);
  } else if (what === "puffer") {
    const swell = shape(tone("sine", ramp(200, 330, 0.16), 0.24), {
      attack: 0.09,
      decay: 0.05,
      curve: 2,
    });
    parts.push(
      [swell, 0, 0.6],
      [
        shape(tone("sine", ramp(400, 660, 0.16), 0.24), {
          attack: 0.09,
          decay: 0.05,
          curve: 2,
        }),
        0,
        0.3,
      ],
    );
  } else {
    const flutter = gain(
      whoosh({
        seconds: 0.26,
        from: 1400,
        peak: 2600,
        to: 2000,
        q: 2.5,
        seed: 8,
      }),
      (t) => 0.6 + 0.4 * Math.sin(2 * Math.PI * 22 * t),
    );
    parts.push([flutter, 0.02, 0.4]);
  }
  parts.push([sparkle(0.2, 3, what.length), 0.12, 0.35]);
  return finish(room(layer(parts), { seconds: 0.3, wet: 0.14 }), -7, 0.04);
}

/**
 * Returns the sound of a blast: the air let go when a puffer goes off, bigger
 * for two set off together.
 * @param {boolean} [big]
 * @returns {Float32Array}
 */
export function puff(big = false) {
  const low = big ? 165 : 220;
  const long = big ? 1.5 : 1;
  const breath = gain(
    filter(noise(0.14, 31), "band", ramp(400, 1900, 0.14), 1.4),
    (t) => (t / 0.14) ** 2.2,
  );
  /** @type {[Float32Array, number, number][]} */
  const body = [1, 2, 3, 4].map((n) => [
    shape(
      tone("sine", glide(low * n * 1.25, low * n * 0.6, 0.07), 0.5 * long),
      {
        attack: 0.005,
        decay: (0.11 * long) / n ** 0.4,
      },
    ),
    0.14,
    [0, 0.55, 0.7, 0.5, 0.25][n],
  ]);
  const burst = shape(
    filter(noise(0.6 * long, 33), "low", glide(4200, 800, 0.1 * long)),
    {
      attack: 0.004,
      decay: 0.11 * long,
    },
  );
  const air = shape(filter(noise(0.7 * long, 35), "band", 950, 0.7), {
    attack: 0.02,
    decay: 0.2 * long,
  });
  /** @type {[Float32Array, number, number][]} */
  const parts = [
    [breath, 0, 0.5],
    ...body,
    [burst, 0.14, 1.1],
    [air, 0.14, 0.4],
  ];
  if (big) parts.push([sparkle(0.5, 8, 4), 0.2, 0.3]);
  return finish(
    room(warm(layer(parts), 1.3), { seconds: 0.4 * long, wet: 0.16 }),
    big ? -4 : -5,
    0.06,
  );
}

/**
 * A recipe with nothing to choose: the sounds the game plays as they are.
 * @typedef {object} Sound
 * @property {string} id
 * @property {string} when What the player has just done or seen.
 * @property {() => Float32Array} make
 */

/** @type {Sound[]} */
export const SOUNDS = [
  {
    id: "pick",
    when: "You pick a fuzzball up.",
    make: () =>
      finish(
        shape(tone("sine", ramp(620, 760, 0.04), 0.06), {
          attack: 0.006,
          hold: 0.01,
          decay: 0.012,
        }),
        -18,
      ),
  },
  {
    id: "swap",
    when: "Two fuzzballs trade places.",
    make: () => {
      const zip = shape(tone("sine", ramp(400, 800, 0.09), 0.1), {
        attack: 0.008,
        hold: 0.04,
        decay: 0.02,
      });
      const air = whoosh({
        seconds: 0.1,
        from: 900,
        peak: 2400,
        to: 1800,
        q: 1.2,
        seed: 2,
        lean: 0.7,
      });
      return finish(
        layer([
          [zip, 0, 0.6],
          [air, 0, 0.5],
        ]),
        -15,
      );
    },
  },
  {
    id: "refuse",
    when: "A swap makes no bunch, and the two go back.",
    make: () => {
      const pitch = (/** @type {number} */ t) =>
        440 *
        2 ** ((-2 * Math.min(1, t / 0.18)) / 12) *
        (1 + 0.05 * Math.exp(-t / 0.07) * Math.sin(2 * Math.PI * 12 * t));
      const body = filter(tone("triangle", pitch, 0.2), "low", 1500);
      return finish(
        shape(body, { attack: 0.008, hold: 0.05, decay: 0.045 }),
        -12,
      );
    },
  },
  {
    id: "land",
    when: "Fuzzballs come to rest after a fall. One a column at most, 60 ms apart.",
    make: () => {
      const thud = shape(tone("sine", glide(340, 280, 0.02), 0.06), {
        attack: 0.003,
        decay: 0.013,
      });
      const over = shape(tone("sine", glide(680, 560, 0.02), 0.06), {
        attack: 0.003,
        decay: 0.009,
      });
      const pat = shape(filter(noise(0.03, 7), "low", 1400), {
        attack: 0.002,
        decay: 0.006,
      });
      return finish(
        layer([
          [thud, 0, 0.8],
          [over, 0, 0.4],
          [pat, 0, 0.35],
        ]),
        -19,
      );
    },
  },
  {
    id: "note",
    when: "A bunch of 3 on a move's first wave. Nine more steps climb the ladder.",
    make: () => note(0, 3),
  },
  {
    id: "note-4",
    when: "A bunch of 4: the note and the one two steps above it.",
    make: () => note(0, 4),
  },
  {
    id: "note-5",
    when: "A bunch of 5 or more: three notes.",
    make: () => note(0, 5),
  },
  {
    id: "pop",
    when: "One fuzzball hops off the board. 30 ms apart along a bunch.",
    make: () => pop(0),
  },
  {
    id: "born-dasher",
    when: "A line of 4 makes a dasher.",
    make: () => born("dasher"),
  },
  {
    id: "born-puffer",
    when: "Two lines that meet make a puffer.",
    make: () => born("puffer"),
  },
  { id: "born-wisp", when: "A square makes a wisp.", make: () => born("wisp") },
  {
    id: "born-frizz",
    when: "A line of 5 makes a frizzball.",
    make: () => born("frizz"),
  },
  {
    id: "dash",
    when: "A dasher dashes down its row or column.",
    make: () => {
      const air = whoosh({
        seconds: 0.4,
        from: 500,
        peak: 3000,
        to: 700,
        q: 1.6,
        seed: 12,
        lean: 0.35,
      });
      const zip = gain(
        tone(
          "sine",
          (t) =>
            700 * 2 ** (1.2 * Math.sin((Math.PI * Math.min(t, 0.4)) / 0.4)),
          0.4,
        ),
        (t) => Math.sin((Math.PI * t) / 0.4) ** 2,
      );
      return finish(
        layer([
          [air, 0, 1],
          [zip, 0, 0.16],
        ]),
        -8,
        0.04,
      );
    },
  },
  {
    id: "puff",
    when: "A puffer breathes in and goes off.",
    make: () => puff(false),
  },
  {
    id: "wisp",
    when: "A wisp floats off to the square it has chosen.",
    make: () => {
      const pitch = (/** @type {number} */ t) =>
        1250 * 2 ** ((5 * Math.sin((Math.PI * t) / 0.45)) / 12);
      const whistle = gain(
        tone("sine", pitch, 0.45),
        (t) =>
          Math.sin((Math.PI * t) / 0.45) ** 1.5 *
          (0.7 + 0.3 * Math.sin(2 * Math.PI * 15 * t)),
      );
      const air = gain(
        whoosh({
          seconds: 0.45,
          from: 1200,
          peak: 2400,
          to: 1500,
          q: 2.2,
          seed: 14,
        }),
        (t) => 0.6 + 0.4 * Math.sin(2 * Math.PI * 15 * t),
      );
      return finish(
        layer([
          [whistle, 0, 0.5],
          [air, 0, 0.7],
        ]),
        -13,
        0.04,
      );
    },
  },
  {
    id: "zap",
    when: "Static leaps from a frizzball to one fuzzball. The next is a step higher.",
    make: () => zap(0),
  },
  {
    id: "frizz",
    when: "Every fuzzball a frizzball reached hops off at once.",
    make: () => {
      /** @type {[Float32Array, number, number][]} */
      const parts = [0, 2, 3, 6].map((step, n) => [
        mallet(rung(step), { decay: 0.14, air: 0.2 }),
        n * 0.012,
        0.7,
      ]);
      parts.push(
        [bell(rung(5), 0.3), 0.03, 0.5],
        [sparkle(0.55, 14, 9), 0.05, 0.6],
        [
          whoosh({
            seconds: 0.5,
            from: 600,
            peak: 3200,
            to: 1200,
            q: 1,
            seed: 17,
            lean: 0.2,
          }),
          0,
          0.4,
        ],
      );
      return finish(room(layer(parts), { seconds: 0.6, wet: 0.22 }), -4, 0.08);
    },
  },
  {
    id: "pair",
    when: "Two special fuzzballs are swapped together, before what they do.",
    make: () => {
      const charge = gain(
        buzz(ramp(300, 900, 0.3), 0.32, 4500, 1.4),
        (t) => (t / 0.32) ** 1.6,
      );
      const air = whoosh({
        seconds: 0.32,
        from: 500,
        peak: 3400,
        to: 3000,
        q: 2,
        seed: 19,
        lean: 0.92,
      });
      return finish(
        layer([
          [filter(charge, "low", ramp(900, 4200, 0.3)), 0, 0.5],
          [air, 0, 0.8],
        ]),
        -9,
        0.02,
      );
    },
  },
  {
    id: "big-puff",
    when: "Two puffers go off as one.",
    make: () => puff(true),
  },
  {
    id: "knock-3",
    when: "A brick loses a layer and has 3 left.",
    make: () => knock(3),
  },
  { id: "knock-2", when: "It has 2 left.", make: () => knock(2) },
  { id: "knock-1", when: "It has 1 left.", make: () => knock(1) },
  {
    id: "break",
    when: "A brick's last layer bursts into fluff.",
    make: () => {
      const thump = shape(tone("sine", glide(290, 170, 0.05), 0.12), {
        attack: 0.004,
        decay: 0.026,
      });
      const poof = gain(
        whoosh({
          seconds: 0.24,
          from: 2200,
          peak: 1500,
          to: 420,
          q: 0.8,
          seed: 51,
          lean: 0.12,
        }),
        0.9,
      );
      return finish(
        room(
          layer([
            [thump, 0, 0.8],
            [poof, 0.012, 0.6],
            [
              mallet(rung(3) / 2, { decay: 0.085, scoop: 4, air: 0 }),
              0.02,
              0.55,
            ],
            [sparkle(0.16, 4, 53), 0.07, 0.22],
          ]),
          { seconds: 0.22, wet: 0.1 },
        ),
        -11,
      );
    },
  },
  {
    id: "cage",
    when: "A cage opens.",
    make: () => {
      const ping = (/** @type {number} */ f) => {
        const out = silence(0.3);
        for (let i = 0; i < out.length; i++) {
          const t = i / 44100;
          const index = 3 * Math.exp(-t / 0.03);
          out[i] = Math.sin(
            2 * Math.PI * f * t + index * Math.sin(2 * Math.PI * f * 1.41 * t),
          );
        }
        return filter(shape(out, { attack: 0.002, decay: 0.05 }), "low", 5200);
      };
      return finish(
        layer([
          [ping(1320), 0, 0.7],
          [ping(1760), 0.07, 0.8],
        ]),
        -10,
        0.03,
      );
    },
  },
  {
    id: "yip",
    when: "A friend hops out of its cage.",
    make: () =>
      finish(
        voice({
          from: 700,
          rise: 6,
          seconds: 0.13,
          over: 0.06,
          open: [400, 2000],
          close: [320, 2300],
          wobble: 0,
        }),
        -13,
      ),
  },
  {
    id: "dust",
    when: "A square is dusted off.",
    make: () =>
      finish(
        shape(filter(filter(noise(0.14, 27), "band", 2500, 0.6), "low", 4500), {
          attack: 0.02,
          hold: 0.02,
          decay: 0.03,
          curve: 1.5,
        }),
        -16,
      ),
  },
  {
    id: "burr-off",
    when: "A burr is brushed off.",
    make: () => {
      const rip = gain(
        filter(noise(0.1, 29), "band", 2300, 1.1),
        (t) =>
          (0.35 + 0.65 * (Math.sin(2 * Math.PI * 95 * t) > 0 ? 1 : 0)) *
          Math.exp(-t / 0.035),
      );
      const tick = shape(tone("sine", 1200, 0.03), {
        attack: 0.001,
        decay: 0.006,
      });
      return finish(
        layer([
          [rip, 0.01, 0.9],
          [tick, 0, 0.4],
        ]),
        -12,
      );
    },
  },
  {
    id: "burr-spread",
    when: "A burr catches on the fuzzball beside it.",
    make: () => {
      const creak = gain(
        filter(buzz(ramp(300, 420, 0.14), 0.16, 3000, 1.2), "low", 1800),
        (t) =>
          (0.6 + 0.4 * Math.sin(2 * Math.PI * 34 * t)) *
          Math.sin((Math.PI * Math.min(t, 0.16)) / 0.16),
      );
      const tick = shape(filter(noise(0.02, 61), "band", 2000, 1.5), {
        attack: 0.001,
        decay: 0.005,
      });
      return finish(
        layer([
          [creak, 0, 0.8],
          [tick, 0.14, 0.6],
        ]),
        -13,
      );
    },
  },
  {
    id: "bed",
    when: "A sleepyhead reaches the bottom row: a yawn, and three notes down.",
    make: () => {
      const yawn = (() => {
        const pitch = (/** @type {number} */ t) =>
          t < 0.22
            ? 500 * 2 ** ((5 * t) / 0.22 / 12)
            : 667 * 2 ** ((-12 * Math.min(1, (t - 0.22) / 0.4)) / 12);
        const source = buzz(pitch, 0.66, 5000, 1.2);
        const out = layer([
          [filter(source, "band", ramp(700, 420, 0.6), 4), 0, 1],
          [filter(source, "band", ramp(1300, 900, 0.6), 6), 0, 0.6],
        ]);
        return gain(
          out,
          (t) => Math.sin((Math.PI * Math.min(t, 0.66)) / 0.66) ** 0.8,
        );
      })();
      /** @type {[Float32Array, number, number][]} */
      const parts = [[yawn, 0, 0.8]];
      [3, 2, 0].forEach((step, n) =>
        parts.push([bell(rung(step), 0.14), 0.6 + n * 0.15, 0.6]),
      );
      return finish(room(layer(parts), { seconds: 0.4, wet: 0.16 }), -9, 0.06);
    },
  },
  {
    id: "gust",
    when: "The wind turns.",
    make: () => {
      const blow = (/** @type {number} */ seed, /** @type {number} */ mult) =>
        gain(
          filter(
            noise(0.8, seed),
            "band",
            (t) => mult * (500 + 900 * Math.sin((Math.PI * t) / 0.8) ** 2),
            3,
          ),
          (t) => Math.sin((Math.PI * Math.min(t, 0.8)) / 0.8) ** 1.4,
        );
      const squeak = (/** @type {number} */ f) =>
        shape(tone("sine", ramp(f, f * 1.25, 0.05), 0.07), {
          attack: 0.01,
          decay: 0.015,
        });
      return finish(
        layer([
          [blow(71, 1), 0, 1],
          [blow(73, 1.6), 0.03, 0.4],
          [squeak(1150), 0.3, 0.1],
          [squeak(1300), 0.42, 0.08],
        ]),
        -9,
        0.08,
      );
    },
  },
  {
    id: "shuffle",
    when: "No move is left, and the fuzzballs trade places.",
    make: () => {
      /** @type {[Float32Array, number, number][]} */
      const parts = [];
      for (let n = 0; n < 9; n++) {
        const f = 300 + ((n * 97) % 160);
        const pat = shape(tone("sine", glide(f * 1.15, f, 0.02), 0.06), {
          attack: 0.003,
          decay: 0.012,
        });
        parts.push(
          [pat, n * 0.04 + ((n * 13) % 7) / 400, 0.6],
          [
            shape(tone("sine", f * 2, 0.05), { attack: 0.003, decay: 0.008 }),
            n * 0.04,
            0.25,
          ],
        );
      }
      parts.push([
        whoosh({
          seconds: 0.42,
          from: 500,
          peak: 2200,
          to: 1600,
          q: 1.2,
          seed: 77,
          lean: 0.8,
        }),
        0,
        0.5,
      ]);
      return finish(layer(parts), -11, 0.03);
    },
  },
  {
    id: "tick",
    when: "A gathered fuzzball reaches its goal's count.",
    make: () =>
      finish(
        shape(tone("sine", 1760, 0.04), { attack: 0.002, decay: 0.007 }),
        -19,
      ),
  },
  {
    id: "goal",
    when: "One of a level's goals is met.",
    make: () =>
      finish(
        room(
          layer([
            [bell(rung(7), 0.16), 0, 0.8],
            [bell(rung(9), 0.2), 0.07, 0.9],
          ]),
          { seconds: 0.3, wet: 0.14 },
        ),
        -9,
        0.05,
      ),
  },
  {
    id: "low",
    when: "5 moves are left.",
    make: () => {
      const tok = () =>
        layer([
          [
            shape(tone("sine", 620, 0.08), { attack: 0.003, decay: 0.02 }),
            0,
            0.8,
          ],
          [
            shape(tone("sine", 930, 0.05), { attack: 0.003, decay: 0.01 }),
            0,
            0.3,
          ],
        ]);
      return finish(
        layer([
          [tok(), 0, 1],
          [tok(), 0.13, 0.8],
        ]),
        -13,
      );
    },
  },
  { id: "chirp-1", when: "A move's 3rd wave.", make: () => chirp(1) },
  { id: "chirp-2", when: "Its 5th wave.", make: () => chirp(2) },
  { id: "chirp-3", when: "Its 7th wave.", make: () => chirp(3) },
  { id: "chirp-4", when: "Its 9th wave.", make: () => chirp(4) },
  {
    id: "encore",
    when: "After a win, a spare move turns a fuzzball into a special one.",
    make: () =>
      finish(
        layer([
          [
            shape(tone("sine", ramp(880, 1760, 0.06), 0.09), {
              attack: 0.004,
              hold: 0.02,
              decay: 0.015,
            }),
            0,
            0.8,
          ],
          [bell(1760, 0.05), 0.05, 0.4],
        ]),
        -13,
      ),
  },
  {
    id: "win",
    when: "A level is cleared.",
    make: () => {
      /** @type {[Float32Array, number, number][]} */
      const parts = [0, 2, 3, 5, 7, 8].map((step, n) => [
        mallet(rung(step), { decay: 0.08, air: 0.2 }),
        n * 0.075,
        0.75,
      ]);
      for (const [step, level] of [
        [5, 0.7],
        [7, 0.6],
        [8, 0.55],
        [11, 0.3],
      ]) {
        parts.push([
          bell(step > 9 ? rung(6) * 2 : rung(step), 0.42),
          0.5,
          level,
        ]);
      }
      parts.push([sparkle(0.7, 16, 11), 0.5, 0.45]);
      return finish(room(layer(parts), { seconds: 0.7, wet: 0.22 }), -4, 0.12);
    },
  },
  {
    id: "star-1",
    when: "The first star.",
    make: () =>
      finish(
        room(
          layer([
            [bell(rung(7), 0.14), 0, 1],
            [sparkle(0.12, 2, 1), 0.02, 0.3],
          ]),
          { seconds: 0.25, wet: 0.14 },
        ),
        -8,
        0.04,
      ),
  },
  {
    id: "star-2",
    when: "The second.",
    make: () =>
      finish(
        room(
          layer([
            [bell(rung(8), 0.14), 0, 1],
            [sparkle(0.12, 3, 2), 0.02, 0.3],
          ]),
          { seconds: 0.25, wet: 0.14 },
        ),
        -8,
        0.04,
      ),
  },
  {
    id: "star-3",
    when: "The third.",
    make: () =>
      finish(
        room(
          layer([
            [bell(rung(9) * 1.189, 0.18), 0, 1],
            [bell(rung(5), 0.18), 0, 0.4],
            [sparkle(0.2, 5, 3), 0.02, 0.4],
          ]),
          { seconds: 0.35, wet: 0.16 },
        ),
        -7,
        0.05,
      ),
  },
  {
    id: "lose",
    when: "The moves run out. A falling third and nothing more.",
    make: () => {
      const soft = (/** @type {number} */ f) =>
        filter(
          shape(tone("triangle", f, 0.4), {
            attack: 0.03,
            hold: 0.08,
            decay: 0.09,
            curve: 1.5,
          }),
          "low",
          1600,
        );
      return finish(
        room(
          layer([
            [soft(rung(2)), 0, 0.9],
            [soft(rung(0)), 0.26, 0.9],
          ]),
          { seconds: 0.3, wet: 0.14 },
        ),
        -10,
        0.08,
      );
    },
  },
  {
    id: "hint",
    when: "A bunch you could make gives a hop.",
    make: () =>
      finish(
        layer([
          [mallet(rung(9), { decay: 0.03, air: 0.1 }), 0, 0.8],
          [mallet(rung(9), { decay: 0.03, air: 0.1 }), 0.11, 0.6],
        ]),
        -16,
      ),
  },
  {
    id: "button",
    when: "A button on a card.",
    make: () =>
      finish(
        layer([
          [
            shape(tone("sine", 880, 0.04), { attack: 0.002, decay: 0.008 }),
            0,
            0.8,
          ],
          [
            shape(filter(noise(0.01, 91), "band", 2000, 1), {
              attack: 0.001,
              decay: 0.003,
            }),
            0,
            0.3,
          ],
        ]),
        -18,
      ),
  },
];
