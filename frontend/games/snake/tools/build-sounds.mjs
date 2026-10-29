// Writes Snake's sounds: three short effects synthesized with
// @fz/dev/sounds, the same bytes every run, into one WAV sprite and the
// spritemap Phaser plays it by, both in src/scene/sounds/.
//
//   yarn build:sounds

import { join } from "node:path";
import { envelope, glide, note, thud, writeSoundSprite } from "@fz/dev/sounds";

/** @import { Sound } from "@fz/dev/sounds" */

/** @type {readonly Sound[]} */
const SOUNDS = [
  // A bite: two quick blips, rising.
  {
    name: "eat",
    seconds: 0.13,
    peak: 0.55,
    sample: (() => {
      const first = note(0, glide(520, 900, 0.06, 0.2), envelope(0.003, 0.025));
      const second = note(
        0.05,
        glide(780, 1300, 0.06, 0.2),
        envelope(0.003, 0.025),
      );
      return (t) => first(t) + second(t);
    })(),
  },
  // A bump: a low tone falling away, with a dull knock of noise.
  {
    name: "crash",
    seconds: 0.34,
    peak: 0.75,
    sample: (() => {
      const tone = note(0, glide(220, 55, 0.3, 0.3), envelope(0.004, 0.09));
      const knock = thud(7);
      const knockShape = envelope(0.001, 0.03);
      return (t) => tone(t) + 1.6 * knock(t) * knockShape(t);
    })(),
  },
  // A chime: three notes of a major chord, rising.
  {
    name: "best",
    seconds: 0.62,
    peak: 0.5,
    sample: (() => {
      const notes = [1047, 1319, 1568].map((pitch, i) =>
        note(i * 0.09, glide(pitch, pitch, 1, 0.25), envelope(0.005, 0.15)),
      );
      return (t) => notes.reduce((sum, played) => sum + played(t), 0);
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
