// The pod's own sounds: its four weapons and the tail a burst ends with,
// its engine, its dash, the static it gathers and the zap that spends it,
// its glass shield, and what a hit does to it. The shots are the quietest
// sounds of the game and dry, as they are heard seven or fourteen times a
// second; the zap and the pod's loss are the loudest things the player does
// and has done to them.

import { degree, pitch } from "../lib/music.mjs";
import {
  TAU,
  click,
  crackle,
  glass,
  mallet,
  puff,
  read,
  roomOf,
  roomed,
  sing,
  sparkle,
  unit,
  varied,
} from "../lib/parts-ship.mjs";
import {
  SR,
  drive,
  filter,
  fit,
  fm,
  fold,
  gain,
  glide,
  looped,
  mix,
  modes,
  noise,
  osc,
  perc,
  points,
  seeded,
} from "../lib/synth.mjs";

/** @import { Recipe } from "../build.mjs" */
/** @import { Param, Signal } from "../lib/synth.mjs" */

/**
 * Returns a bolt, the body of a shot: a soft tone, a triangle with a little
 * grit, that drops in pitch as it dies.
 *
 * @param {number} from Where its pitch starts, in Hz.
 * @param {number} to Where it lands.
 * @param {number} seconds
 * @param {number} [grit] How rich the tone is.
 * @returns {Signal}
 */
function bolt(from, to, seconds, grit = 0.5) {
  const freq = glide(from, to, seconds * 0.7, seconds, 2);
  return gain(
    mix([
      { x: osc("tri", freq, seconds), gain: 0.7 },
      { x: fm(freq, 1, grit, seconds), gain: 0.4 },
    ]),
    perc(0.0015, seconds * 0.9, seconds),
  );
}

/**
 * Returns the gun's shot before it is cut to length: a bolt driven warm, a
 * tick of hiss at its start and a breath of air behind it.
 *
 * @param {number} seed
 * @returns {Signal}
 */
function gunShot(seed) {
  const vary = varied(seeded(seed));
  const body = bolt(1850 * vary(0.07), 620 * vary(0.07), 0.085 * vary(0.12));
  const air = puff(seed + 2, 0.07, {
    freq: 2300 * vary(0.15),
    q: 0.9,
    attack: 0.004,
    decay: 0.05,
  });
  return filter(
    mix([
      { x: drive(body, 1.6), gain: 1 },
      { x: click(seed + 1, { seconds: 0.003, freq: 3200 }), gain: 0.2 },
      { x: air, gain: 0.5 },
    ]),
    "lp",
    5200,
  );
}

/**
 * Returns an arc's noise: a burst of hiss at each discharge, the discharges
 * coming at a rate that may move, evenly for a buzz or at scattered gaps
 * for a crackle. It is full-band, so filter it to where it should sit.
 *
 * @param {number} seconds
 * @param {number} seed
 * @param {{ rate: Param, jitter?: number, burst?: number }} how
 *   How many discharges a second, how uneven their gaps are, from 0 (a
 *   buzz) to 1.6 (a crackle), and how long each burst takes to die, in
 *   seconds.
 * @returns {Signal}
 */
function arc(seconds, seed, { rate, jitter = 1.4, burst = 0.003 }) {
  const random = seeded(seed);
  const hiss = noise("white", seconds, seed + 1);
  const keep = Math.exp(-Math.log(1000) / (burst * SR));
  let next = 0;
  let level = 0;
  for (let i = 0; i < hiss.length; i++) {
    if (i >= next) {
      level = 0.35 + 0.65 * random();
      next = i + (SR / read(rate, i)) * (1 - jitter / 2 + jitter * random());
    }
    hiss[i] = (hiss[i] ?? 0) * level;
    level *= keep;
  }
  return hiss;
}

/**
 * Returns a thump a phone can hear: a sine that drops in pitch, driven hard
 * so its harmonics carry its size, with a drum skin's next two modes over
 * it, which a small speaker keeps when it loses the first.
 *
 * @param {number} from Where its pitch starts, in Hz.
 * @param {number} to Where it lands.
 * @param {number} fall How long the pitch takes to land, in seconds.
 * @param {number} decay How long it takes to die.
 * @param {number} [push] How hard it is driven.
 * @returns {Signal}
 */
function thump(from, to, fall, decay, push = 3) {
  const seconds = decay * 1.1;
  const low = drive(
    gain(
      osc("sine", glide(from, to, fall, seconds, 1.5), seconds),
      perc(0.003, decay, seconds),
    ),
    push,
  );
  const skin = [
    { times: 1.59, level: 0.5, lasts: 0.5 },
    { times: 2.3, level: 0.35, lasts: 0.35 },
  ].map(({ times, level, lasts }) => ({
    x: gain(
      osc("sine", glide(from * times, to * times, fall, seconds, 1.5), seconds),
      perc(0.002, decay * lasts, seconds),
    ),
    gain: level,
  }));
  return filter(mix([low, ...skin]), "hp", 55, 0.7);
}

/**
 * Returns a crack: a click of bright noise over a chirp that drops through
 * the highs in a fiftieth of a second.
 *
 * @param {number} seed
 * @param {number} from Where the chirp starts, in Hz.
 * @param {number} to Where it lands.
 * @returns {Signal}
 */
function crack(seed, from, to) {
  return mix([
    click(seed, { seconds: 0.006, freq: 1800 }),
    {
      x: gain(
        osc("sine", glide(from, to, 0.02, 0.045, 2), 0.045),
        perc(0.0003, 0.04, 0.045),
      ),
      gain: 0.7,
    },
  ]);
}

/**
 * Returns shards of glass falling away: pings high above the staff, each
 * two partials that disagree, most of them early.
 *
 * @param {number} seed
 * @param {number} count
 * @param {number} seconds
 * @returns {Signal}
 */
function shards(seed, count, seconds) {
  const random = seeded(seed);
  return mix(
    Array.from({ length: count }, () => {
      const share = random() ** 2;
      const freq = 2400 * (7000 / 2400) ** random();
      const ring = 0.03 + 0.06 * random();
      return {
        x: gain(
          modes(
            [
              { freq, decay: ring },
              { freq: freq * 1.47, decay: ring * 0.6, gain: 0.5 },
            ],
            ring * 1.1,
          ),
          points(
            [
              [0, 0],
              [0.0008, 1],
            ],
            ring * 1.1,
          ),
        ),
        at: share * seconds,
        gain: (1 - 0.6 * share) * (0.5 + 0.5 * random()),
      };
    }),
  );
}

/** @type {Recipe[]} */
export const SOUNDS = [
  {
    name: "shot-gun",
    about:
      "The plain gun, seven times a second: a soft triangle pew falling from about 1.9 kHz to 600 Hz, a tick of hiss at its start and a breath of air, dry.",
    takes: 5,
    level: "tick",
    plays: ["fired (the gun)"],
    make: (_take, seed) => fit(gunShot(seed), 0.1),
  },
  {
    name: "shot-tail",
    about:
      "Once, as a burst of fire stops: the last shot heard again off a wall, dull and soft, and the small room's tail after it, so the shots themselves can stay dry.",
    takes: 3,
    level: "tick",
    plays: ["fire let go after a burst"],
    make: (_take, seed) => {
      const vary = varied(seeded(seed));
      const far = gain(
        filter(gunShot(seed), "lp", 2200 * vary(0.12)),
        points(
          [
            [0, 0],
            [0.009, 1],
          ],
          0.1,
        ),
      );
      const tail = roomOf(far, { decay: 0.2 * vary(0.1), damp: 0.55 });
      return fit(
        mix([
          { x: far, gain: 0.5 },
          { x: tail, gain: 0.8 },
        ]),
        0.27,
      );
    },
  },
  {
    name: "shot-spread",
    about:
      "The Spread's three bolts at once: three pews a few milliseconds and a few hundred hertz apart over a low-passed saw, with a wider breath of air, dry.",
    takes: 4,
    level: "tick",
    plays: ["fired (the Spread)"],
    make: (_take, seed) => {
      const vary = varied(seeded(seed));
      const bolts = mix(
        [0, 1, 2].map((k) => ({
          x: bolt(
            (1750 - 270 * k) * vary(0.06),
            (610 - 95 * k) * vary(0.06),
            0.1 * vary(0.1),
          ),
          at: 0.006 * k * vary(0.3),
          gain: 0.4 - 0.05 * k,
        })),
      );
      const under = gain(
        filter(
          osc("saw", glide(880, 300, 0.07, 0.11, 2), 0.11),
          "lp",
          1700,
          0.8,
        ),
        perc(0.002, 0.1, 0.11),
      );
      const air = puff(seed + 2, 0.1, {
        freq: 1900 * vary(0.15),
        q: 0.6,
        attack: 0.005,
        decay: 0.08,
      });
      return fit(
        filter(
          mix([
            { x: drive(bolts, 2), gain: 1 },
            { x: under, gain: 0.3 },
            { x: click(seed + 1, { seconds: 0.004, freq: 2800 }), gain: 0.25 },
            { x: air, gain: 0.6 },
          ]),
          "lp",
          5000,
        ),
        0.13,
      );
    },
  },
  {
    name: "shot-rapid",
    about:
      "The Rapid's shot, fourteen times a second: a lighter, higher pew from about 2.4 kHz to 1 kHz, shorter and purer, with less air, dry.",
    takes: 5,
    level: "tick",
    plays: ["fired (the Rapid)"],
    make: (_take, seed) => {
      const vary = varied(seeded(seed));
      const body = bolt(
        2400 * vary(0.06),
        1020 * vary(0.06),
        0.055 * vary(0.1),
        0.3,
      );
      const air = puff(seed + 2, 0.04, {
        freq: 3000 * vary(0.12),
        q: 1,
        attack: 0.002,
        decay: 0.03,
      });
      return fit(
        filter(
          mix([
            { x: drive(body, 1.3), gain: 1 },
            { x: click(seed + 1, { seconds: 0.002, freq: 3600 }), gain: 0.12 },
            { x: air, gain: 0.3 },
          ]),
          "lp",
          5500,
        ),
        0.064,
      );
    },
  },
  {
    name: "shot-lance",
    about:
      "The Lance's needle: a clean tone falling fast from 3.5 kHz onto G6 and ringing there, with two thin metal partials over it as its edge and a faint trail of air.",
    takes: 3,
    level: "small",
    plays: ["fired (the Lance)"],
    make: (_take, seed) => {
      const vary = varied(seeded(seed));
      const seconds = 0.17;
      const land = pitch("G6");
      const freq = glide(
        3500 * vary(0.05),
        land,
        0.04 * vary(0.1),
        seconds,
        1.6,
      );
      const needle = gain(
        mix([
          { x: osc("sine", freq, seconds), gain: 0.8 },
          {
            x: fm(freq, 2, glide(0.9, 0.2, 0.06, seconds), seconds),
            gain: 0.25,
          },
        ]),
        perc(0.001, 0.16 * vary(0.1), seconds),
      );
      const edge = modes(
        [
          { freq: land * 1.004, decay: 0.15, gain: 0.5, phase: 0.25 },
          { freq: land * 2.76 * vary(0.01), decay: 0.1, gain: 0.15 },
          { freq: land * 4.07 * vary(0.01), decay: 0.045, gain: 0.07 },
        ],
        seconds,
      );
      const air = puff(seed + 2, 0.1, {
        freq: 4600,
        q: 1.2,
        attack: 0.002,
        decay: 0.07,
      });
      return roomed(
        mix([
          needle,
          { x: edge, gain: 0.5 },
          { x: click(seed + 1, { seconds: 0.002, freq: 4000 }), gain: 0.15 },
          { x: air, gain: 0.1 },
        ]),
        seconds,
        { decay: 0.12, mix: 0.07 },
      );
    },
  },
  {
    name: "thrust",
    about:
      "The engine while thrust is held, a loop of 2 s: pink noise under a low-pass that wanders, a driven band near 500 Hz for a phone, a faint hiss, and a slow flutter, with no pitch of its own.",
    level: "tick",
    loop: true,
    plays: ["thrust held"],
    make: (_take, seed) => {
      const seconds = 2;
      const overlap = 0.25;
      const all = seconds + overlap;
      // Every wobble runs whole cycles in the loop, so its end meets its start.
      const rush = filter(
        noise("pink", all, seed),
        "lp",
        (t) =>
          1250 +
          380 * Math.sin(TAU * 0.5 * t) +
          200 * Math.sin(TAU * 1.5 * t + 1.3),
        0.9,
      );
      const body = drive(
        gain(
          filter(
            noise("brown", all, seed + 1),
            "bp",
            (t) => 520 + 130 * Math.sin(TAU * 1 * t + 0.7),
            1.1,
          ),
          4,
        ),
        2.5,
      );
      const hiss = filter(
        noise("white", all, seed + 2),
        "bp",
        (t) => 3600 + 700 * Math.sin(TAU * 0.5 * t + 2),
        0.8,
      );
      const flutter = (/** @type {number} */ t) =>
        1 +
        0.14 * Math.sin(TAU * 6.5 * t) +
        0.08 * Math.sin(TAU * 11 * t + 1) +
        0.12 * Math.sin(TAU * 1.5 * t + 0.4);
      const burn = gain(
        mix([
          { x: rush, gain: 1 },
          { x: body, gain: 0.5 },
          { x: hiss, gain: 0.1 },
        ]),
        flutter,
      );
      return looped(filter(burn, "hp", 170), seconds, overlap);
    },
  },
  {
    name: "thrust-start",
    about:
      "Thrust pressed: a puff of ignition, noise in a band that opens from 500 Hz to 1.6 kHz over a small driven tone that rises.",
    level: "tick",
    plays: ["thrust pressed"],
    make: (_take, seed) => {
      const seconds = 0.13;
      const air = gain(
        filter(
          noise("pink", seconds, seed),
          "bp",
          glide(500, 1600, 0.08, seconds),
          1,
        ),
        points(
          [
            [0, 0],
            [0.012, 1],
            [0.05, 0.5],
            [0.125, 0],
          ],
          seconds,
        ),
      );
      const whump = drive(
        gain(
          osc("sine", glide(240, 440, 0.06, 0.09), 0.09),
          perc(0.004, 0.08, 0.09),
        ),
        2.5,
      );
      return fit(
        filter(
          mix([
            { x: unit(air), gain: 1 },
            { x: whump, gain: 0.25 },
            { x: click(seed + 1, { seconds: 0.002, freq: 2500 }), gain: 0.1 },
          ]),
          "hp",
          200,
        ),
        seconds,
      );
    },
  },
  {
    name: "thrust-stop",
    about:
      "Thrust let go: the burn's tail, noise under a low-pass that closes from 1.8 kHz to 400 Hz with a flutter that slows, and a faint tone that falls.",
    level: "tick",
    plays: ["thrust let go"],
    make: (_take, seed) => {
      const seconds = 0.19;
      const dying = points(
        [
          [0, 0.9],
          [0.015, 1],
          [0.18, 0],
        ],
        seconds,
        1.4,
      );
      const air = mix([
        filter(
          noise("pink", seconds, seed),
          "lp",
          glide(1800, 400, 0.16, seconds),
          0.9,
        ),
        {
          x: filter(
            noise("pink", seconds, seed + 1),
            "bp",
            glide(1100, 450, 0.16, seconds),
            1.2,
          ),
          gain: 0.8,
        },
      ]);
      // The flutter's rate falls from 13 Hz to 5 as the burn dies.
      const flutter = (/** @type {number} */ t) =>
        1 + 0.22 * Math.sin(TAU * (13 * t - 21 * t * t));
      const tone = drive(
        osc("sine", glide(380, 200, 0.16, seconds), seconds),
        2,
      );
      return fit(
        gain(
          gain(
            filter(
              mix([
                { x: unit(air), gain: 1 },
                { x: tone, gain: 0.1 },
              ]),
              "hp",
              200,
            ),
            flutter,
          ),
          dying,
        ),
        seconds,
      );
    },
  },
  {
    name: "dash",
    about:
      "The dash: a whoosh, pink noise in a band swept up from 450 Hz to 3.6 kHz, with a sung tone rising two octaves from G4 inside it and a few glass pings at its end.",
    takes: 2,
    level: "medium",
    plays: ["dashed"],
    make: (_take, seed) => {
      const vary = varied(seeded(seed));
      const seconds = 0.28;
      const sweep = 0.19 * vary(0.1);
      // It starts a quarter open, so the press is heard at once.
      const swell = points(
        [
          [0, 0.25],
          [sweep * 0.35, 1],
          [sweep * 0.85, 0.7],
          [sweep * 1.3, 0],
        ],
        seconds,
      );
      const band = glide(450 * vary(0.08), 3600 * vary(0.08), sweep, seconds);
      const rush = mix([
        unit(
          filter(
            filter(noise("pink", seconds, seed), "bp", band, 1.3),
            "bp",
            band,
            1.3,
          ),
        ),
        {
          x: filter(
            noise("white", seconds, seed + 1),
            "bp",
            glide(2000, 7000, sweep, seconds),
            0.8,
          ),
          gain: 0.06,
        },
      ]);
      const rise = sing(
        glide(pitch("G4"), pitch("G6"), sweep * 1.1, seconds),
        seconds,
        { index: 0.6 },
      );
      const glint = sparkle({
        seconds: 0.09,
        seed: seed + 2,
        count: 5,
        low: 10,
        high: 14,
        ring: 0.06,
        bias: 1,
      });
      return roomed(
        mix([
          { x: gain(rush, swell), gain: 1 },
          { x: gain(rise, swell), gain: 0.3 },
          { x: glint, at: sweep * 0.85, gain: 0.22 },
          { x: click(seed + 3, { seconds: 0.003, freq: 1800 }), gain: 0.25 },
        ]),
        seconds,
        { decay: 0.2, mix: 0.1 },
      );
    },
  },
  {
    name: "dash-ready",
    about:
      "The dash has charged again: a soft tick and a small glass bell on G6, quiet, as it comes round every few seconds.",
    level: "tick",
    plays: ["dash recharged"],
    make: (_take, seed) =>
      roomed(
        mix([
          glass(pitch("G6"), 0.11, seed, { bright: 0.7 }),
          {
            x: filter(
              click(seed + 1, { seconds: 0.002, freq: 1500 }),
              "lp",
              4000,
            ),
            gain: 0.25,
          },
        ]),
        0.15,
        { decay: 0.12, mix: 0.08 },
      ),
  },
  {
    name: "static-full",
    about:
      "Static reaches full: a crackle that quickens over a rough buzz that climbs two octaves, both swelling, then a bright glass C6 with the C above it, a mallet's C5 under it and a little sparkle, saying ready.",
    level: "medium",
    plays: ["static reaches full"],
    make: (_take, seed) => {
      const climb = 0.3;
      const length = climb + 0.06;
      const swell = points(
        [
          [0, 0.15],
          [climb * 0.9, 1],
          [climb, 0.5],
          [climb + 0.05, 0],
        ],
        length,
        0.7,
      );
      const snaps = filter(
        arc(length, seed, {
          rate: glide(45, 420, climb, length),
          jitter: 1.4,
          burst: 0.003,
        }),
        "bp",
        glide(1400, 4400, climb, length),
        0.9,
      );
      const pitched = glide(pitch("C3"), pitch("C5"), climb, length);
      const buzz = filter(
        mix([
          arc(length, seed + 5, { rate: pitched, jitter: 0.15, burst: 0.004 }),
          { x: osc("pulse", pitched, length, { width: 0.18 }), gain: 0.2 },
        ]),
        "bp",
        glide(700, 2800, climb, length),
        1.6,
      );
      const ready = mix([
        glass(degree(5), 0.24, seed + 1),
        { x: glass(degree(10), 0.18, seed + 2), gain: 0.4 },
        { x: mallet(degree(0), 0.18, seed + 3), gain: 0.5 },
      ]);
      return roomed(
        mix([
          { x: gain(unit(snaps), swell), gain: 1 },
          { x: gain(unit(buzz), swell), gain: 0.5 },
          { x: unit(ready), at: climb, gain: 0.8 },
          {
            x: sparkle({ seconds: 0.1, seed: seed + 4, count: 5, ring: 0.06 }),
            at: climb + 0.03,
            gain: 0.2,
          },
        ]),
        0.52,
        { decay: 0.3, mix: 0.14 },
      );
    },
  },
  {
    name: "static-down",
    about:
      "Static drops a step: a soft sung blip falling from A5 to E5, with a few faint clicks of the charge letting go.",
    level: "small",
    plays: ["static falls a step"],
    make: (_take, seed) => {
      const seconds = 0.16;
      const blip = gain(
        sing(glide(pitch("A5"), pitch("E5"), 0.08, seconds), seconds, {
          index: 0.5,
        }),
        perc(0.005, 0.13, seconds),
      );
      return roomed(
        mix([
          blip,
          {
            x: crackle({
              seconds: 0.09,
              seed,
              count: 5,
              low: 1500,
              high: 4000,
              length: 0.003,
              bias: 1.5,
            }),
            gain: 0.2,
          },
        ]),
        seconds,
        { decay: 0.12, mix: 0.08 },
      );
    },
  },
  {
    name: "zap-dash",
    about:
      "The charged dash: a crack and a chirp down, an arc that tears (bursts of hiss that slow, over a folded buzz), a whoosh up, a short driven thump with a rumble as thunder, and a glass C and G under falling crackle and sparkle.",
    level: "huge",
    plays: ["zapped (a dash at full static)"],
    make: (_take, seed) => {
      const seconds = 0.64;
      const tear = gain(
        filter(
          arc(0.44, seed + 1, {
            rate: glide(360, 80, 0.4, 0.44),
            jitter: 1.4,
            burst: 0.0025,
          }),
          "bp",
          glide(5200, 1800, 0.4, 0.44),
          0.8,
        ),
        points(
          [
            [0, 1],
            [0.16, 0.85],
            [0.42, 0],
          ],
          0.44,
        ),
      );
      const buzz = gain(
        filter(
          fold(
            gain(
              filter(
                arc(0.4, seed + 2, {
                  rate: glide(170, 75, 0.36, 0.4),
                  jitter: 0.3,
                  burst: 0.005,
                }),
                "bp",
                glide(2400, 900, 0.36, 0.4),
                0.7,
              ),
              3,
            ),
            1.6,
          ),
          "lp",
          9000,
        ),
        points(
          [
            [0, 1],
            [0.14, 0.8],
            [0.38, 0],
          ],
          0.4,
        ),
      );
      const rush = gain(
        filter(
          noise("pink", 0.3, seed + 3),
          "bp",
          glide(700, 4200, 0.22, 0.3),
          1.3,
        ),
        points(
          [
            [0, 0],
            [0.1, 1],
            [0.28, 0],
          ],
          0.3,
        ),
      );
      const thunder = mix([
        unit(thump(150, 50, 0.25, 0.32, 3.5)),
        {
          x: unit(
            drive(
              gain(
                filter(
                  noise("pink", 0.45, seed + 4),
                  "bp",
                  glide(750, 240, 0.35, 0.45),
                  0.8,
                ),
                gain(perc(0.006, 0.42, 0.45), 8),
              ),
              2,
            ),
          ),
          gain: 0.9,
        },
      ]);
      const chime = mix([
        glass(degree(5), 0.3, seed + 6),
        { x: glass(degree(8), 0.24, seed + 7), gain: 0.6 },
      ]);
      // The hits are driven together, which evens their peaks; what is tuned
      // or fine is laid over them clean.
      const hits = drive(
        unit(
          mix([
            { x: unit(crack(seed, 7000, 900)), gain: 0.7 },
            { x: unit(tear), gain: 0.9 },
            { x: unit(buzz), gain: 0.5 },
            { x: unit(rush), gain: 0.4 },
            { x: unit(thunder), at: 0.012, gain: 0.7 },
          ]),
        ),
        1.7,
      );
      const all = mix([
        hits,
        { x: unit(chime), at: 0.02, gain: 0.16 },
        {
          x: crackle({
            seconds: 0.26,
            seed: seed + 8,
            count: 12,
            low: 2000,
            high: 7000,
            bias: 1.6,
          }),
          at: 0.32,
          gain: 0.35,
        },
        {
          x: sparkle({ seconds: 0.28, seed: seed + 9, count: 7, ring: 0.07 }),
          at: 0.26,
          gain: 0.1,
        },
      ]);
      return roomed(all, seconds, { decay: 0.45, mix: 0.16 });
    },
  },
  {
    name: "zap-arc",
    about:
      "An arc of the zap landing on a rock: a small click and a chirp down, 60 ms of crackle over a short buzz in a band of the take's own, and two or three stray snaps after.",
    takes: 4,
    level: "small",
    plays: ["a zap's arc reaches a rock"],
    make: (take, seed) => {
      const random = seeded(seed);
      const vary = varied(random);
      const seconds = 0.13;
      const band = [2300, 2900, 1900, 3200][take % 4] ?? 2600;
      const lasts = 0.06 * vary(0.2);
      const length = lasts + 0.02;
      const snap = gain(
        filter(
          arc(length, seed + 1, {
            rate: glide(520 * vary(0.2), 150, lasts, length),
            jitter: 1.5,
            burst: 0.003,
          }),
          "bp",
          glide(band * 1.25, band * 0.75, lasts, length),
          1.2,
        ),
        perc(0.0005, lasts * 1.4, length),
      );
      const zzt = gain(
        filter(
          arc(length, seed + 3, {
            rate: 230 * vary(0.15),
            jitter: 0.25,
            burst: 0.004,
          }),
          "bp",
          band * 0.55,
          2,
        ),
        perc(0.001, lasts, length),
      );
      const chirp = gain(
        fm(glide(band * 1.6, band * 0.4, 0.02, 0.035, 2), 1.41, 1.5, 0.035, {
          feedback: 0.8,
        }),
        perc(0.0004, 0.03, 0.035),
      );
      return roomed(
        filter(
          drive(
            unit(
              mix([
                {
                  x: unit(click(seed, { seconds: 0.003, freq: 2200 })),
                  gain: 0.2,
                },
                { x: unit(snap), gain: 1 },
                { x: unit(zzt), gain: 0.8 },
                { x: chirp, gain: 0.3 },
                {
                  x: crackle({
                    seconds: 0.06,
                    seed: seed + 2,
                    count: 2 + Math.floor(random() * 3),
                    low: band * 0.6,
                    high: band * 1.6,
                    length: 0.004,
                  }),
                  at: lasts * 0.9,
                  gain: 0.6,
                },
              ]),
            ),
            3,
          ),
          "lp",
          7500,
        ),
        seconds,
        { decay: 0.14, mix: 0.1 },
      );
    },
  },
  {
    name: "shield-up",
    about:
      "The glass shell forms: seven glass bells run up the C chord from C5 to C7 in a fifth of a second, over a hiss that rises with them, and seal on C6 and G6.",
    level: "medium",
    plays: ["shield raised"],
    make: (_take, seed) => {
      const seconds = 0.38;
      const run = [0, 2, 3, 5, 7, 8, 10];
      const bells = mix(
        run.map((step, k) => ({
          x: glass(degree(step), 0.12 + 0.012 * k, seed + k, { attack: 0.004 }),
          at: 0.027 * k,
          gain: 0.5 + 0.06 * k,
        })),
      );
      const seal = mix([
        glass(degree(5), 0.18, seed + 20, { attack: 0.01 }),
        { x: glass(degree(8), 0.16, seed + 21, { attack: 0.01 }), gain: 0.7 },
      ]);
      const hiss = puff(seed + 30, 0.26, {
        freq: glide(2200, 6500, 0.2, 0.26),
        q: 1.5,
        attack: 0.15,
        decay: 0.1,
      });
      return roomed(
        mix([bells, { x: seal, at: 0.19, gain: 0.5 }, { x: hiss, gain: 0.35 }]),
        seconds,
        { decay: 0.3, mix: 0.15 },
      );
    },
  },
  {
    name: "shield-break",
    about:
      "The shell bursts: a pop (a click, a burst near 1.8 kHz and a blip that drops), a driven thump from 150 Hz with a knock, a bell on A5 and E6 that sags, and shards of glass falling away.",
    level: "large",
    plays: ["shield spent on a hit"],
    make: (_take, seed) => {
      const seconds = 0.42;
      const pop = mix([
        click(seed, { seconds: 0.004, freq: 2000 }),
        {
          x: puff(seed + 1, 0.02, {
            freq: 1800,
            q: 1.2,
            attack: 0.0005,
            decay: 0.016,
          }),
          gain: 1.2,
        },
        {
          x: gain(
            osc("sine", glide(950, 380, 0.014, 0.03), 0.03),
            perc(0.0005, 0.026, 0.03),
          ),
          gain: 0.8,
        },
      ]);
      const low = mix([
        unit(thump(150, 62, 0.09, 0.16, 3)),
        {
          x: unit(
            puff(seed + 2, 0.04, {
              freq: 480,
              q: 1.1,
              attack: 0.001,
              decay: 0.035,
              color: "pink",
            }),
          ),
          gain: 0.6,
        },
      ]);
      const shell = mix([
        glass(pitch("A5"), 0.22, seed + 3, { bend: 60 }),
        { x: glass(pitch("E6"), 0.18, seed + 4, { bend: 80 }), gain: 0.7 },
      ]);
      return roomed(
        mix([
          { x: unit(pop), gain: 1 },
          { x: unit(low), gain: 0.36 },
          { x: unit(shell), at: 0.004, gain: 0.4 },
          { x: unit(shards(seed + 5, 16, 0.3)), at: 0.01, gain: 0.4 },
        ]),
        seconds,
        { decay: 0.35, mix: 0.15 },
      );
    },
  },
  {
    name: "pod-hit",
    about:
      "The pod is hit and someone is knocked loose: a click and a driven thud from 190 Hz with a knock, then a brassy tone that falls from E5 to A4 and wobbles ever slower, with a rattle.",
    takes: 2,
    level: "large",
    plays: ["pod hit with someone in tow"],
    make: (_take, seed) => {
      const vary = varied(seeded(seed));
      const seconds = 0.38;
      const thud = mix([
        unit(thump(190 * vary(0.06), 75, 0.08, 0.15, 3)),
        {
          x: unit(
            puff(seed + 1, 0.05, {
              freq: 430 * vary(0.1),
              q: 1,
              attack: 0.001,
              decay: 0.045,
              color: "pink",
            }),
          ),
          gain: 0.7,
        },
        { x: unit(click(seed, { seconds: 0.003, freq: 2000 })), gain: 0.5 },
      ]);
      const rate = 15 * vary(0.08);
      const fall = pitch("A4") / pitch("E5");
      const wobble = gain(
        sing(
          (t) =>
            pitch("E5") *
            fall ** Math.min(1, t / 0.24) *
            2 **
              ((170 *
                Math.exp(-t * 5) *
                Math.sin(TAU * (rate * t - 10 * t * t))) /
                1200),
          0.33,
          { index: 1.1 },
        ),
        points(
          [
            [0, 0],
            [0.008, 1],
            [0.12, 0.7],
            [0.32, 0],
          ],
          0.33,
        ),
      );
      return roomed(
        mix([
          { x: unit(thud), gain: 0.75 },
          { x: unit(wobble), at: 0.025, gain: 0.5 },
          {
            x: crackle({
              seconds: 0.2,
              seed: seed + 2,
              count: 6,
              low: 700,
              high: 2600,
              length: 0.006,
              bias: 1.4,
            }),
            at: 0.05,
            gain: 0.4,
          },
        ]),
        seconds,
        { decay: 0.3, mix: 0.14 },
      );
    },
  },
  {
    name: "pod-lost",
    about:
      "The run ends as the pod bursts: a crack, a driven boom from 130 Hz under noise whose low-pass closes, a sung tone falling from E5 to A3 with a slow vibrato, and debris and a few glass tinkles settling in a room.",
    level: "huge",
    plays: ["pod hit with no one in tow"],
    make: (_take, seed) => {
      const seconds = 1.25;
      const boom = mix([
        unit(thump(130, 45, 0.3, 0.5, 4)),
        {
          x: unit(
            drive(
              gain(
                filter(
                  filter(
                    noise("pink", 0.65, seed + 1),
                    "lp",
                    glide(2600, 280, 0.5, 0.65),
                    0.8,
                  ),
                  "hp",
                  160,
                ),
                gain(perc(0.004, 0.6, 0.65), 6),
              ),
              2,
            ),
          ),
          gain: 0.8,
        },
      ]);
      const fall = pitch("A3") / pitch("E5");
      const tone = gain(
        sing(
          (t) =>
            pitch("E5") *
            fall ** (Math.min(1, t / 0.8) ** 0.8) *
            2 ** ((14 * Math.sin(TAU * 6 * t)) / 1200),
          0.95,
          { index: 0.8 },
        ),
        points(
          [
            [0, 0],
            [0.04, 1],
            [0.5, 0.6],
            [0.93, 0],
          ],
          0.95,
        ),
      );
      const debris = crackle({
        seconds: 0.95,
        seed: seed + 3,
        count: 24,
        low: 450,
        high: 3500,
        length: 0.014,
        bias: 1.7,
      });
      const burst = drive(
        unit(
          mix([
            { x: unit(crack(seed, 5200, 700)), gain: 0.6 },
            { x: unit(boom), at: 0.01, gain: 0.7 },
            { x: debris, at: 0.09, gain: 0.6 },
          ]),
        ),
        1.5,
      );
      const all = mix([
        burst,
        { x: unit(tone), at: 0.07, gain: 0.3 },
        {
          x: sparkle({
            seconds: 0.6,
            seed: seed + 4,
            count: 6,
            low: 8,
            high: 13,
            ring: 0.09,
          }),
          at: 0.2,
          gain: 0.1,
        },
      ]);
      return roomed(all, seconds, { decay: 0.6, mix: 0.2 });
    },
  },
  {
    name: "guard-end",
    about:
      "The pod can be touched again: one soft sung blip on G5 that sags a little as it dies.",
    level: "tick",
    plays: ["the pod's untouchable time ends"],
    make: () => {
      const seconds = 0.1;
      return roomed(
        gain(
          sing(
            glide(pitch("G5"), pitch("G5") * 0.975, 0.08, seconds),
            seconds,
            { index: 0.4 },
          ),
          perc(0.006, 0.08, seconds),
        ),
        seconds,
        { decay: 0.1, mix: 0.07 },
      );
    },
  },
];
