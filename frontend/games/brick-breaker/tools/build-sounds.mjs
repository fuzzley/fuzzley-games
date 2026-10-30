// Writes Brick Breaker's sounds: ten short effects synthesized with
// @fz/dev/sounds, the same bytes every run, into one WAV sprite and the
// spritemap Phaser plays it by, both in src/scene/sounds/. Their names and
// order are src/view/effects.ts's SOUNDS, which the scene's spec holds them
// to.
//
//   yarn build:sounds

import { join } from "node:path";
import {
  arpeggio,
  envelope,
  glide,
  note,
  thud,
  writeSoundSprite,
} from "@fz/dev/sounds";

/** @import { Sound } from "@fz/dev/sounds" */

/** @type {readonly Sound[]} */
const SOUNDS = [
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
    sample: (() => {
      const tone = note(0, glide(440, 370, 0.04, 0.2), envelope(0.001, 0.03));
      const knock = thud(3);
      const knockShape = envelope(0.001, 0.02);
      return (t) => tone(t) + 0.8 * knock(t) * knockShape(t);
    })(),
  },
  // A brick broken: a bright blip, which the scene raises along a streak.
  {
    name: "broken",
    seconds: 0.14,
    peak: 0.5,
    sample: note(0, glide(660, 990, 0.04, 0.25), envelope(0.002, 0.045)),
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
    sample: (() => {
      const boom = note(0, glide(160, 40, 0.3, 0.3), envelope(0.003, 0.12));
      const burst = thud(11);
      const burstShape = envelope(0.001, 0.08);
      return (t) => boom(t) + 2 * burst(t) * burstShape(t);
    })(),
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
];

const sprite = await writeSoundSprite(
  SOUNDS,
  join(import.meta.dirname, "../src/scene/sounds"),
);
console.log(
  `Wrote ${SOUNDS.length} sounds, ${sprite.seconds.toFixed(2)} s, ${sprite.wav.length} bytes.`,
);
