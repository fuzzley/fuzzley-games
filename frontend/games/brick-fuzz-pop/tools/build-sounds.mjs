#!/usr/bin/env node
/**
 * Writes Brick Fuzz Pop's sounds: twenty short effects synthesized with
 * `@fz/dev/sounds`, the same bytes every run, into one WAV sprite and the
 * spritemap Phaser plays it by, both in `src/scene/sounds/`.
 *
 *   yarn build:sounds
 *
 * Their names and order are `src/view/effects/effects.ts`'s `SOUNDS`, and
 * `tools/build-sounds.spec.ts` holds the sprite to them and to what this
 * writes now, so change a recipe here and run the script rather than edit
 * the sprite.
 */
import { join } from "node:path";
import {
  arpeggio,
  envelope,
  glide,
  note,
  thud,
  writeSoundSprite,
} from "@fz/dev/sounds";

/** @import { Sound, Wave } from "@fz/dev/sounds" */

/** Where the sprite and its map are written. */
export const SPRITE_FOLDER = join(import.meta.dirname, "../src/scene/sounds");

/**
 * Returns a tone under a burst of noise, each shaped by an envelope of its
 * own, the noise `loudness` times the tone.
 *
 * @param {Wave} tone The tone, shaped already.
 * @param {number} seed Which noise the burst draws.
 * @param {number} decay How long the burst takes to fade, in seconds.
 * @param {number} loudness How loud the burst is beside the tone.
 * @returns {Wave}
 */
function withBurst(tone, seed, decay, loudness) {
  const burst = thud(seed);
  const shape = envelope(0.001, decay);
  return (t) => tone(t) + loudness * burst(t) * shape(t);
}

/**
 * The recipes, in `SOUNDS`' order.
 *
 * The view raises a broken brick's along a round, as far as an octave, so it
 * starts low enough to stay mellow there; and nothing reaches past the
 * sprite's 8 kHz.
 *
 * @type {readonly Sound[]}
 */
export const RECIPES = [
  // A notch of charge: a quick, bright tick with a crackle of static, heard at
  // every notch the charge climbs or falls while it builds, so kept quiet.
  {
    name: "notch",
    seconds: 0.06,
    peak: 0.3,
    sample: withBurst(
      note(0, glide(1100, 1400, 0.02, 0.2), envelope(0.001, 0.012)),
      3,
      0.006,
      0.6,
    ),
  },
  // The release: a soft flick, rising.
  {
    name: "release",
    seconds: 0.16,
    peak: 0.45,
    sample: withBurst(
      note(0, glide(300, 900, 0.08, 0.1), envelope(0.004, 0.04)),
      5,
      0.02,
      0.5,
    ),
  },
  // A boon's release: a brighter, longer rise under a rush of air, for the
  // hot shot and the triple shot alike.
  {
    name: "boon",
    seconds: 0.32,
    peak: 0.55,
    sample: withBurst(
      note(0, glide(392, 1175, 0.16, 0.3), envelope(0.006, 0.09)),
      29,
      0.07,
      1.2,
    ),
  },
  // A side or the ceiling: a short, quiet, woody knock.
  {
    name: "knock",
    seconds: 0.08,
    peak: 0.3,
    sample: note(0, glide(560, 500, 0.03, 0.1), envelope(0.001, 0.018)),
  },
  // A brick struck that holds: a dull knock.
  {
    name: "strike",
    seconds: 0.11,
    peak: 0.5,
    sample: withBurst(
      note(0, glide(440, 370, 0.04, 0.2), envelope(0.001, 0.03)),
      7,
      0.02,
      0.8,
    ),
  },
  // A brick broken: a soft bloop that glides up, which the view raises along
  // a round. Heard at nearly every brick, so it stays low and mellow.
  {
    name: "break",
    seconds: 0.14,
    peak: 0.5,
    sample: note(0, glide(392, 587, 0.04, 0.1), envelope(0.004, 0.045)),
  },
  // A punch, a charged fuzzball flying on through a brick it broke: a crunch
  // of noise over a low drop, under the break's own note.
  {
    name: "punch",
    seconds: 0.16,
    peak: 0.5,
    sample: withBurst(
      note(0, glide(220, 110, 0.06, 0.2), envelope(0.001, 0.035)),
      11,
      0.03,
      2,
    ),
  },
  // A fuzzball striking steel, a plate or a bumper, which earths any charge it
  // carries: two clashing partials, ringing like struck metal.
  {
    name: "clank",
    seconds: 0.36,
    peak: 0.4,
    sample: (() => {
      const low = note(0, glide(1046, 1046, 1, 0), envelope(0.001, 0.12));
      const high = note(0, glide(1661, 1661, 1, 0), envelope(0.001, 0.07));
      return (t) => low(t) + 0.6 * high(t);
    })(),
  },
  // A zap along a row, a column or the diagonals: a buzz falling fast under a
  // crackle.
  {
    name: "zap",
    seconds: 0.24,
    peak: 0.45,
    sample: withBurst(
      note(0, glide(2200, 500, 0.12, 0.6), envelope(0.001, 0.05)),
      13,
      0.04,
      1.5,
    ),
  },
  // A bomb's blast: a low boom under a burst of noise.
  {
    name: "blast",
    seconds: 0.46,
    peak: 0.8,
    sample: withBurst(
      note(0, glide(150, 40, 0.3, 0.3), envelope(0.003, 0.12)),
      17,
      0.08,
      2,
    ),
  },
  // A bumper's kick: a springy note, rising.
  {
    name: "bump",
    seconds: 0.2,
    peak: 0.5,
    sample: note(0, glide(180, 520, 0.06, 0.3), envelope(0.002, 0.07)),
  },
  // A portal: a whoop up and back down, as the fuzzball goes in and comes out
  // of the twin.
  {
    name: "portal",
    seconds: 0.32,
    peak: 0.4,
    sample: (() => {
      const into = note(0, glide(300, 1200, 0.12, 0), envelope(0.01, 0.05));
      const out = note(0.08, glide(1200, 300, 0.12, 0), envelope(0.01, 0.07));
      return (t) => into(t) + out(t);
    })(),
  },
  // A cage opened and its friend freed: three quick notes, rising.
  {
    name: "cage",
    seconds: 0.36,
    peak: 0.45,
    sample: arpeggio([784, 988, 1319], 0.05, 0.07),
  },
  // A landing: a soft, low plop.
  {
    name: "land",
    seconds: 0.14,
    peak: 0.4,
    sample: withBurst(
      note(0, glide(220, 160, 0.05, 0.1), envelope(0.002, 0.04)),
      19,
      0.015,
      0.5,
    ),
  },
  // A bored fuzzball's yawn: a slow sigh, swelling and falling away.
  {
    name: "yawn",
    seconds: 0.7,
    peak: 0.35,
    sample: note(0, glide(520, 260, 0.5, 0.15), envelope(0.15, 0.2)),
  },
  // The wall's step down a row: a heavy, low thunk, heard every round.
  {
    name: "step",
    seconds: 0.22,
    peak: 0.45,
    sample: withBurst(
      note(0, glide(130, 95, 0.08, 0.2), envelope(0.002, 0.05)),
      23,
      0.04,
      1.2,
    ),
  },
  // The wall's jump of a third of the field: a long drop under a rumble.
  {
    name: "jump",
    seconds: 0.6,
    peak: 0.65,
    sample: withBurst(
      note(0, glide(320, 80, 0.35, 0.3), envelope(0.004, 0.16)),
      31,
      0.12,
      1.5,
    ),
  },
  // The danger line's warning: two soft notes, the second lower.
  {
    name: "danger",
    seconds: 0.42,
    peak: 0.4,
    sample: (() => {
      const first = note(0, glide(740, 740, 1, 0.1), envelope(0.01, 0.06));
      const second = note(0.18, glide(554, 554, 1, 0.1), envelope(0.01, 0.08));
      return (t) => first(t) + second(t);
    })(),
  },
  // A level cleared: four notes of a major chord, rising to the octave.
  {
    name: "chime",
    seconds: 0.78,
    peak: 0.5,
    sample: arpeggio([523, 659, 784, 1047], 0.08, 0.16),
  },
  // A level lost: a long tone falling away under a thud.
  {
    name: "lost",
    seconds: 0.62,
    peak: 0.6,
    sample: withBurst(
      note(0, glide(440, 110, 0.45, 0.2), envelope(0.005, 0.2)),
      37,
      0.06,
      1,
    ),
  },
];

if (import.meta.main) {
  const sprite = await writeSoundSprite(RECIPES, SPRITE_FOLDER);
  console.log(
    `Wrote ${String(RECIPES.length)} sounds, ${sprite.seconds.toFixed(2)} s, ${String(sprite.wav.length)} bytes.`,
  );
}
