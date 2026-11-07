// Writes Asteroid Breaker's sounds: fourteen short effects synthesized with
// @fz/dev/sounds, the same bytes every run, into one WAV sprite and the
// spritemap Phaser plays it by, both in src/scene/sounds/. Their names and
// order are src/view/effects/effects.ts's SOUNDS, which the scene's spec
// holds them to.
//
//   yarn build:sounds

import { join } from "node:path";
import {
  arpeggio,
  envelope,
  glide,
  looped,
  note,
  thud,
  writeSoundSprite,
} from "@fz/dev/sounds";

/** @import { Sound, Wave } from "@fz/dev/sounds" */

/**
 * Returns a break: a tone falling from a pitch under a knock of noise, the
 * lower and longer the larger the rock.
 *
 * @param {number} pitch Where the tone starts, in Hz.
 * @param {number} decay How long the tone and the knock take to fade, in seconds.
 * @param {number} seed Which noise the knock draws.
 * @returns {Wave}
 */
function breakOf(pitch, decay, seed) {
  const tone = note(
    0,
    glide(pitch, pitch * 0.6, decay, 0.2),
    envelope(0.002, decay),
  );
  const knock = thud(seed);
  const knockShape = envelope(0.001, decay * 0.5);
  return (t) => tone(t) + knock(t) * knockShape(t);
}

/** @type {readonly Sound[]} */
const SOUNDS = [
  // A shot: a soft, short tick, heard many times a second, so kept quiet.
  {
    name: "fired",
    seconds: 0.06,
    peak: 0.18,
    sample: note(0, glide(1400, 900, 0.03, 0.1), envelope(0.001, 0.012)),
  },
  // A small rock broken: a crack, high and quick, which the scene raises
  // along a chain.
  { name: "small", seconds: 0.14, peak: 0.45, sample: breakOf(520, 0.04, 5) },
  // A medium rock: a knock between the two.
  { name: "medium", seconds: 0.2, peak: 0.5, sample: breakOf(330, 0.06, 7) },
  // A large rock or a boulder: a low thump.
  { name: "large", seconds: 0.3, peak: 0.6, sample: breakOf(180, 0.09, 9) },
  // Iron that holds: two clashing partials, ringing like struck metal.
  {
    name: "rung",
    seconds: 0.36,
    peak: 0.35,
    sample: (() => {
      const low = note(0, glide(980, 980, 1, 0), envelope(0.001, 0.12));
      const high = note(0, glide(1531, 1531, 1, 0), envelope(0.001, 0.07));
      return (t) => low(t) + 0.6 * high(t);
    })(),
  },
  // A blast: a low boom under a burst of noise.
  {
    name: "blast",
    seconds: 0.46,
    peak: 0.8,
    sample: (() => {
      const boom = note(0, glide(150, 38, 0.3, 0.3), envelope(0.003, 0.12));
      const burst = thud(11);
      const burstShape = envelope(0.001, 0.08);
      return (t) => boom(t) + 2 * burst(t) * burstShape(t);
    })(),
  },
  // A pickup caught: two quick notes, rising.
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
  // A dash: a whoosh of noise rising and falling under a quick glide.
  {
    name: "dashed",
    seconds: 0.26,
    peak: 0.4,
    sample: (() => {
      const air = thud(13);
      const swell = envelope(0.06, 0.06);
      const sweep = note(0, glide(300, 900, 0.18, 0), envelope(0.04, 0.05));
      return (t) => 1.5 * air(t) * swell(t) + 0.4 * sweep(t);
    })(),
  },
  // A comet's warning: two soft notes, the second lower, as a chevron pulses.
  {
    name: "warned",
    seconds: 0.42,
    peak: 0.35,
    sample: (() => {
      const first = note(0, glide(880, 880, 1, 0.1), envelope(0.01, 0.06));
      const second = note(0.18, glide(659, 659, 1, 0.1), envelope(0.01, 0.08));
      return (t) => first(t) + second(t);
    })(),
  },
  // A ship lost: a long tone falling away under a burst.
  {
    name: "lost",
    seconds: 0.62,
    peak: 0.65,
    sample: (() => {
      const fall = note(0, glide(440, 90, 0.45, 0.2), envelope(0.005, 0.22));
      const burst = thud(17);
      const burstShape = envelope(0.001, 0.06);
      return (t) => fall(t) + burst(t) * burstShape(t);
    })(),
  },
  // A wave cleared: four notes of a major chord, rising to the octave.
  {
    name: "cleared",
    seconds: 0.78,
    peak: 0.5,
    sample: arpeggio([523, 659, 784, 1047], 0.08, 0.16),
  },
  // A ship gained: a brighter chime, three notes up from the fifth.
  {
    name: "gained",
    seconds: 0.62,
    peak: 0.45,
    sample: arpeggio([784, 988, 1175], 0.07, 0.15),
  },
  // A stray brought home: two notes rising a sixth, soft and round.
  {
    name: "home",
    seconds: 0.3,
    peak: 0.45,
    sample: (() => {
      const first = note(0, glide(587, 587, 1, 0.3), envelope(0.004, 0.05));
      const second = note(0.09, glide(988, 988, 1, 0.3), envelope(0.004, 0.07));
      return (t) => first(t) + second(t);
    })(),
  },
  // The thrust's hum: a buzz under a rumble, which the scene loops while the
  // thrust is held. The buzz, at 120 Hz with its overtones up to 720, is high
  // enough for a phone's speaker, and runs whole cycles, 60 of them; the
  // rumble is looped; so the loop never clicks.
  {
    name: "thrust",
    seconds: 0.5,
    peak: 0.2,
    loop: true,
    sample: (() => {
      const buzz = glide(120, 120, 1, 0.5);
      const overtones = glide(360, 360, 1, 0.5);
      const rumble = looped(thud(19), 0.5);
      return (t) => buzz(t) + 0.7 * overtones(t) + rumble(t);
    })(),
  },
];

const sprite = await writeSoundSprite(
  SOUNDS,
  join(import.meta.dirname, "../src/scene/sounds"),
);
console.log(
  `Wrote ${SOUNDS.length} sounds, ${sprite.seconds.toFixed(2)} s, ${sprite.wav.length} bytes.`,
);
