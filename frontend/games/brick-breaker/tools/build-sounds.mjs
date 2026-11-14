// Writes Brick Breaker's sounds: seventeen short effects synthesized with
// @fz/dev/sounds, the same bytes every run, into one WAV sprite and the
// spritemap Phaser plays it by, both in src/scene/sounds/. Their names and
// order are src/view/effects/effects.ts's SOUNDS, and
// tools/build-sounds.spec.ts holds the sprite to them and to what this
// writes now, so change a recipe here and run the script rather than edit
// the sprite.
//
//   yarn build:sounds

import { join } from "node:path";
import {
  SAMPLE_RATE,
  arpeggio,
  envelope,
  glide,
  note,
  thud,
  withBurst,
  writeSoundSprite,
} from "@fz/dev/sounds";

/** @import { Sound, Wave } from "@fz/dev/sounds" */

/** Where the sprite and its map are written. */
export const SPRITE_FOLDER = join(import.meta.dirname, "../src/scene/sounds");

/**
 * Returns a tick of a cage's bars: a tinny note, struck and gone within a
 * few milliseconds.
 *
 * @param {number} at When it is struck, in seconds.
 * @param {number} pitch Its pitch, in Hz.
 * @param {number} loudness How loud it is beside the loudest tick.
 * @returns {Wave}
 */
function tick(at, pitch, loudness) {
  const struck = note(at, glide(pitch, pitch, 1, 0.5), envelope(0.0005, 0.008));
  return (t) => loudness * struck(t);
}

/**
 * Returns a tone that wavers in pitch as a struck spring does: played
 * faster and slower `rate` times a second, by as much as `depth` of its
 * pitch at first, the wavering dying away to about a third every `decay`
 * seconds.
 *
 * @param {Wave} tone The tone that wavers.
 * @param {number} rate How many times a second it wavers.
 * @param {number} depth How far it wavers at first, as a share of its pitch.
 * @param {number} decay How fast the wavering dies away, in seconds.
 * @returns {Wave}
 */
function wavering(tone, rate, depth, decay) {
  // Read the tone a little ahead of and behind its time, which plays it
  // faster and slower by the change in that reach.
  const reach = depth / (2 * Math.PI * rate);
  return (t) =>
    tone(t + reach * Math.exp(-t / decay) * Math.sin(2 * Math.PI * rate * t));
}

/** How long a rush of air is smoothed over, in seconds, so only the lowest band of its noise is left. */
const AIR_SMOOTHING_S = 0.0005;

/**
 * Returns a rush of air: `thud()`'s noise from a seed, smoothed so only its
 * lowest band is left, carried up about a tone's pitch, so the band sweeps
 * as the tone glides.
 *
 * @param {number} seed The noise's seed.
 * @param {Wave} carrier The tone whose pitch the band is carried about.
 * @returns {Wave}
 */
function rushing(seed, carrier) {
  const air = thud(seed);
  const span = Math.round(AIR_SMOOTHING_S * SAMPLE_RATE);
  return (t) => {
    let sum = 0;
    for (let back = 0; back < span; back++) sum += air(t - back / SAMPLE_RATE);
    return (sum / span) * carrier(t);
  };
}

/**
 * The recipes, in `SOUNDS`' order.
 *
 * The scene raises a broken brick's sound, the bloop or a key's chime, along
 * a streak by as much as an octave and a fifth, nearly three times its rate;
 * and nothing reaches past the sprite's 8 kHz.
 *
 * @type {readonly Sound[]}
 */
export const RECIPES = [
  // The paddle: a soft, low bop.
  {
    name: "paddle",
    seconds: 0.12,
    peak: 0.5,
    sample: note(0, glide(330, 290, 0.05, 0.3), envelope(0.002, 0.035)),
  },
  // A wall: a short, quiet tick.
  {
    name: "wall",
    seconds: 0.08,
    peak: 0.3,
    sample: note(0, glide(760, 700, 0.03, 0.1), envelope(0.001, 0.018)),
  },
  // A brick that holds: a dull knock.
  {
    name: "hit",
    seconds: 0.11,
    peak: 0.5,
    sample: withBurst(
      note(0, glide(440, 370, 0.04, 0.2), envelope(0.001, 0.03)),
      3,
      0.02,
      0.8,
    ),
  },
  // A brick broken: a soft bloop that glides up, which the scene raises along
  // a streak. Heard at nearly every brick, so it stays low and mellow, just
  // above the knock of a brick that holds.
  {
    name: "broken",
    seconds: 0.14,
    peak: 0.5,
    sample: note(0, glide(392, 587, 0.04, 0.1), envelope(0.004, 0.045)),
  },
  // Steel: two clashing partials, ringing like struck metal.
  {
    name: "steel",
    seconds: 0.36,
    peak: 0.4,
    sample: (() => {
      const low = note(0, glide(1180, 1180, 1, 0), envelope(0.001, 0.12));
      const high = note(0, glide(1847, 1847, 1, 0), envelope(0.001, 0.07));
      return (t) => low(t) + 0.6 * high(t);
    })(),
  },
  // A blast: a low boom under a burst of noise.
  {
    name: "blast",
    seconds: 0.46,
    peak: 0.8,
    sample: withBurst(
      note(0, glide(160, 40, 0.3, 0.3), envelope(0.003, 0.12)),
      11,
      0.08,
      2,
    ),
  },
  // A capsule caught: two quick notes, rising.
  {
    name: "caught",
    seconds: 0.18,
    peak: 0.5,
    sample: (() => {
      const first = note(0, glide(600, 900, 0.05, 0.2), envelope(0.003, 0.03));
      const second = note(
        0.06,
        glide(900, 1350, 0.05, 0.2),
        envelope(0.003, 0.035),
      );
      return (t) => first(t) + second(t);
    })(),
  },
  // A pair of bolts fired: a quick zap, falling.
  {
    name: "fired",
    seconds: 0.12,
    peak: 0.3,
    sample: note(0, glide(1800, 420, 0.08, 0.2), envelope(0.001, 0.035)),
  },
  // A ball lost: a long tone falling away.
  {
    name: "lost",
    seconds: 0.56,
    peak: 0.6,
    sample: note(0, glide(440, 110, 0.4, 0.2), envelope(0.005, 0.2)),
  },
  // A level cleared: four notes of a major chord, rising to the octave.
  {
    name: "cleared",
    seconds: 0.78,
    peak: 0.5,
    sample: arpeggio([523, 659, 784, 1047], 0.08, 0.16),
  },
  // A plate's underside turning a ball back, or a bolt spent on it: a clank,
  // two clashing partials over a knock, lower, duller and briefer than
  // steel's ring.
  {
    name: "plate",
    seconds: 0.2,
    peak: 0.45,
    sample: withBurst(
      (() => {
        const low = note(0, glide(523, 523, 1, 0), envelope(0.001, 0.05));
        const high = note(0, glide(1370, 1370, 1, 0), envelope(0.001, 0.03));
        return (t) => low(t) + 0.5 * high(t);
      })(),
      5,
      0.015,
      1,
    ),
  },
  // A cage's bars: a rattle of five tinny ticks, settling, as a hit bends a
  // bar and as the cage opens and its friend leaves.
  {
    name: "cage",
    seconds: 0.2,
    peak: 0.4,
    sample: (() => {
      const ticks = [
        tick(0, 1250, 1),
        tick(0.027, 1580, 0.8),
        tick(0.058, 1390, 0.65),
        tick(0.085, 1700, 0.5),
        tick(0.118, 1460, 0.35),
      ];
      return (t) => ticks.reduce((sum, struck) => sum + struck(t), 0);
    })(),
  },
  // A key broken: a bell's ding, a clear note under the bright, inharmonic
  // partial that tells it from the clear's chord. The scene raises it along a
  // streak, as it does the bloop.
  {
    name: "key",
    seconds: 0.36,
    peak: 0.4,
    sample: (() => {
      const ring = note(0, glide(880, 880, 1, 0.1), envelope(0.002, 0.1));
      const shimmer = note(0, glide(2429, 2429, 1, 0), envelope(0.001, 0.04));
      return (t) => ring(t) + 0.5 * shimmer(t);
    })(),
  },
  // The gates opened: a low sweep, rising, under a soft rumble, as heavy
  // doors slide open. It rises where a lost ball's tone falls.
  {
    name: "gates",
    seconds: 0.6,
    peak: 0.4,
    sample: withBurst(
      note(0, glide(160, 480, 0.36, 0.5), envelope(0.06, 0.28)),
      23,
      0.12,
      0.8,
    ),
  },
  // The seeker lent: a soft flutter, rising, over the paddle's bop, as the
  // ball it met starts to lean toward a brick.
  {
    name: "seeker",
    seconds: 0.26,
    peak: 0.25,
    sample: (() => {
      const rise = note(0, glide(880, 1760, 0.2, 0), envelope(0.04, 0.08));
      return (t) => rise(t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 30 * t));
    })(),
  },
  // A bumper turning a ball, or a bolt or a blast striking it: a springy
  // boing, a note leaping up an octave and wavering as it settles.
  {
    name: "bumper",
    seconds: 0.24,
    peak: 0.35,
    sample: note(
      0,
      wavering(glide(220, 440, 0.04, 0.25), 15, 0.2, 0.1),
      envelope(0.002, 0.07),
    ),
  },
  // A ball through a portal: a whoosh of air, swept up as it goes in and back
  // down as it comes out of the twin.
  {
    name: "portal",
    seconds: 0.3,
    peak: 0.4,
    sample: (() => {
      const into = note(
        0,
        rushing(31, glide(500, 2000, 0.12)),
        envelope(0.04, 0.07),
      );
      const out = note(
        0.1,
        rushing(37, glide(2000, 500, 0.16)),
        envelope(0.02, 0.07),
      );
      return (t) => into(t) + out(t);
    })(),
  },
];

if (import.meta.main) {
  const sprite = await writeSoundSprite(RECIPES, SPRITE_FOLDER);
  console.log(
    `Wrote ${String(RECIPES.length)} sounds, ${sprite.seconds.toFixed(2)} s, ${String(sprite.wav.length)} bytes.`,
  );
}
