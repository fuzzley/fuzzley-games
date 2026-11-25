#!/usr/bin/env node
/**
 * Writes Rickashay's sounds: twenty-five short effects synthesized with
 * `@fz/dev/sounds`, the same bytes every run, into one WAV sprite and the
 * spritemap Phaser plays it by, both in `src/scene/sounds/`.
 *
 *   yarn build:sounds
 *
 * Their names and order are `src/view/effects/sounds.ts`' `SOUNDS`, and
 * `tools/build-sounds.spec.ts` holds the sprite to them and to what this
 * writes now, so change a recipe here and run the script rather than edit
 * the sprite.
 *
 * Every note is in the sound kit's key, C major pentatonic (C, D, E, G and
 * A), named as `@fz/dev/synth`'s `pitch()` reads it, but for steel's, a
 * ramp's and a plate's inharmonic partials, which ring as metal does, the
 * wall's step and jump, which keep Brick Fuzz Pop's pitches, and the
 * voices the swing and the call set a little off their notes. The strike
 * and the earned floor bounce's chord are on the rally's first note, C4,
 * which the view raises a step of the scale a strike (`rallyCentsOf()`), as
 * far as C6; a raised sound plays faster, as much as four times, so each
 * rings long enough here to be heard as a note there. Nothing reaches past
 * the sprite's 8 kHz.
 *
 * It exits with 2, saying why, for a command line it can't read, before it
 * writes anything.
 */
import { join } from "node:path";
import { CONSOLE, isStop, readArgs, stopWith } from "@fz/dev/script";
import {
  arpeggio,
  envelope,
  glide,
  note,
  thud,
  withBurst,
  writeSoundSprite,
} from "@fz/dev/sounds";
import { pitch } from "@fz/dev/synth";

/** @import { Printer } from "@fz/dev/script" */
/** @import { RenderedSprite, Sound, Wave } from "@fz/dev/sounds" */

/**
 * Says where the build prints and how it writes the sprite, each the
 * build's own unless a spec hands it another.
 *
 * @typedef {Partial<Printer> & { write?: WriteSprite }} BuildIo
 */

/**
 * Writes sounds into a folder, as a sprite and its map, and returns what it
 * wrote, as `writeSoundSprite()` does.
 *
 * @callback WriteSprite
 * @param {readonly Sound[]} sounds
 * @param {string} folder
 * @returns {Promise<RenderedSprite>}
 */

/** Where the sprite and its map are written, from the workspace's folder. */
export const SPRITE_PATH = "src/scene/sounds";

/** Where the sprite and its map are written. */
export const SPRITE_FOLDER = join(import.meta.dirname, "..", SPRITE_PATH);

const USAGE = `Usage: yarn build:sounds [options]

Writes the game's sounds into one sprite and its map, in ${SPRITE_PATH}/.

  -h, --help      Show this message`;

/** How far sharp the "Rickaashay!" call's second voice is, as a ratio: 7 cents. */
const SHIMMER = 2 ** (7 / 1200);

/**
 * Returns a steady tone at a pitch, in Hz, with a share of its second
 * harmonic for brightness.
 *
 * @param {number} hz
 * @param {number} [bright]
 * @returns {Wave}
 */
function tone(hz, bright = 0) {
  return glide(hz, hz, 1, bright);
}

/**
 * Returns waves played together.
 *
 * @param {...Wave} waves
 * @returns {Wave}
 */
function sum(...waves) {
  return (t) => waves.reduce((total, wave) => total + wave(t), 0);
}

/**
 * Returns a wave made louder or softer by a factor.
 *
 * @param {number} factor
 * @param {Wave} wave
 * @returns {Wave}
 */
function scaled(factor, wave) {
  return (t) => factor * wave(t);
}

/**
 * Returns a wave starting `at` seconds in, silent before.
 *
 * @param {number} at
 * @param {Wave} wave
 * @returns {Wave}
 */
function later(at, wave) {
  return (t) => (t < at ? 0 : wave(t - at));
}

/**
 * Returns a wave whose pitch wobbles, `rate` times a second, by `depth` of
 * itself either way, as a spring's does: its time is pushed ahead and held
 * back by turns, never back past where it was.
 *
 * @param {Wave} wave
 * @param {number} rate
 * @param {number} depth
 * @returns {Wave}
 */
function wobbled(wave, rate, depth) {
  const turn = 2 * Math.PI * rate;
  return (t) => wave(t + (depth / turn) * Math.sin(turn * t));
}

/**
 * The recipes, in `SOUNDS`' order.
 *
 * @type {readonly Sound[]}
 */
export const RECIPES = [
  // The release: a soft flick, rising from G4 to C6 under a puff of air.
  {
    name: "release",
    seconds: 0.16,
    peak: 0.45,
    sample: withBurst(
      note(
        0,
        glide(pitch("G4"), pitch("C6"), 0.08, 0.1),
        envelope(0.004, 0.04),
      ),
      5,
      0.02,
      0.5,
    ),
  },
  // A hot shot's release: a brighter, longer rise, from C5 to G6, under a
  // rush of air.
  {
    name: "hot-release",
    seconds: 0.34,
    peak: 0.55,
    sample: withBurst(
      note(
        0,
        glide(pitch("C5"), pitch("G6"), 0.16, 0.3),
        envelope(0.006, 0.09),
      ),
      29,
      0.07,
      1.2,
    ),
  },
  // A side wall or the ceiling: a short, quiet, woody knock, falling from
  // D5 to C5, heard at nearly every turn, so kept the quietest.
  {
    name: "knock",
    seconds: 0.08,
    peak: 0.25,
    sample: note(
      0,
      glide(pitch("D5"), pitch("C5"), 0.03, 0.1),
      envelope(0.001, 0.018),
    ),
  },
  // A brick struck: a marimba's note on C4, the rally's first, its bar's
  // overtone two octaves up dying first, over the tick of the mallet. Raised
  // to C6 it lasts a quarter as long, a short, bright plink.
  {
    name: "strike",
    seconds: 0.36,
    peak: 0.5,
    sample: withBurst(
      sum(
        note(0, tone(pitch("C4"), 0.15), envelope(0.002, 0.09)),
        scaled(0.35, note(0, tone(pitch("C6")), envelope(0.001, 0.025))),
      ),
      7,
      0.006,
      0.5,
    ),
  },
  // A brick broken: a crumble, three grains of noise falling one after
  // another over a low thump from C3 to G2, with no note of its own, so the
  // strike's note it plays over carries the rally.
  {
    name: "break",
    seconds: 0.2,
    peak: 0.45,
    sample: sum(
      note(
        0,
        glide(pitch("C3"), pitch("G2"), 0.05, 0.2),
        envelope(0.002, 0.035),
      ),
      scaled(3, note(0, thud(11), envelope(0.001, 0.02))),
      scaled(2, note(0.035, thud(13), envelope(0.001, 0.015))),
      scaled(1.4, note(0.07, thud(17), envelope(0.001, 0.012))),
    ),
  },
  // Steel: two clashing partials, C6 and one 1.59 times as high, ringing as
  // struck metal does, as Brick Fuzz Pop's clank.
  {
    name: "clank",
    seconds: 0.36,
    peak: 0.4,
    sample: sum(
      note(0, tone(pitch("C6")), envelope(0.001, 0.12)),
      scaled(0.6, note(0, tone(pitch("C6") * 1.587), envelope(0.001, 0.07))),
    ),
  },
  // A ramp's ring: a bell on E6 over E5, its partial 2.76 times as high
  // dying first, as a struck plate's does.
  {
    name: "ring",
    seconds: 0.45,
    peak: 0.3,
    sample: sum(
      note(0, tone(pitch("E6")), envelope(0.001, 0.1)),
      scaled(0.4, note(0, tone(pitch("E6") * 2.76), envelope(0.001, 0.04))),
      scaled(0.3, note(0, tone(pitch("E5")), envelope(0.002, 0.14))),
    ),
  },
  // A hatch holding the fuzzball up: a soft, hollow thud falling from G3 to
  // E3 under a knock of wood.
  {
    name: "thud",
    seconds: 0.18,
    peak: 0.5,
    sample: withBurst(
      note(
        0,
        glide(pitch("G3"), pitch("E3"), 0.04, 0.2),
        envelope(0.002, 0.045),
      ),
      41,
      0.015,
      0.9,
    ),
  },
  // The hatches swinging open: a creak falling from A4 to E3, two voices a
  // little apart grinding against each other, then the bars knocking on
  // their stops, one and then the other.
  {
    name: "swing",
    seconds: 0.45,
    peak: 0.45,
    sample: sum(
      scaled(
        0.6,
        note(
          0,
          sum(
            glide(pitch("A4"), pitch("E3"), 0.3, 0.2),
            scaled(0.6, glide(pitch("A4") * 1.03, pitch("E3") * 1.03, 0.3)),
          ),
          envelope(0.03, 0.12),
        ),
      ),
      note(
        0.3,
        glide(pitch("E4"), pitch("D4"), 0.03, 0.1),
        envelope(0.001, 0.02),
      ),
      scaled(
        0.8,
        note(
          0.34,
          glide(pitch("D4"), pitch("C4"), 0.03, 0.1),
          envelope(0.001, 0.02),
        ),
      ),
    ),
  },
  // A spring brick breaking: a boing wobbling up from C5 to C6 over the
  // crack of the brick.
  {
    name: "spring",
    seconds: 0.32,
    peak: 0.5,
    sample: withBurst(
      note(
        0,
        wobbled(glide(pitch("C5"), pitch("C6"), 0.07, 0.3), 18, 0.06),
        envelope(0.002, 0.09),
      ),
      47,
      0.02,
      0.7,
    ),
  },
  // A gem struck: a glint, two quick high notes a fourth apart, E6 and A6,
  // as struck glass rings.
  {
    name: "gem",
    seconds: 0.3,
    peak: 0.4,
    sample: arpeggio([pitch("E6"), pitch("A6")], 0.035, 0.07),
  },
  // A portal: a whoop from G4 up to G6 and back down, as the fuzzball goes
  // into one eye and comes out of the other.
  {
    name: "portal",
    seconds: 0.32,
    peak: 0.4,
    sample: sum(
      note(0, glide(pitch("G4"), pitch("G6"), 0.12), envelope(0.01, 0.05)),
      note(0.08, glide(pitch("G6"), pitch("G4"), 0.12), envelope(0.01, 0.07)),
    ),
  },
  // A strike that takes nothing, off a plated face or a lock still shut: a
  // dry tink of metal, G6 against a partial 1.59 times as high, as steel's
  // clank is made, but higher and over in a moment.
  {
    name: "plate",
    seconds: 0.12,
    peak: 0.35,
    sample: withBurst(
      sum(
        note(0, tone(pitch("G6")), envelope(0.0005, 0.03)),
        scaled(
          0.5,
          note(0, tone(pitch("G6") * 1.587), envelope(0.0005, 0.018)),
        ),
      ),
      53,
      0.004,
      0.4,
    ),
  },
  // A lock's bolt sliding back: a short scrape rising from E4 to A4 under a
  // hiss, then a click as it comes home.
  {
    name: "bolt",
    seconds: 0.2,
    peak: 0.4,
    sample: sum(
      scaled(
        0.5,
        note(
          0,
          glide(pitch("E4"), pitch("A4"), 0.1, 0.8),
          envelope(0.01, 0.05),
        ),
      ),
      scaled(2, note(0, thud(59), envelope(0.005, 0.06))),
      later(
        0.11,
        sum(
          note(0, tone(pitch("C6"), 0.3), envelope(0.0005, 0.01)),
          scaled(3, note(0, thud(61), envelope(0.0005, 0.006))),
        ),
      ),
    ),
  },
  // A lock opening: a click, then two notes rising a fourth, G5 and C6.
  {
    name: "unlock",
    seconds: 0.4,
    peak: 0.45,
    sample: sum(
      scaled(3, note(0, thud(73), envelope(0.0005, 0.006))),
      later(0.03, arpeggio([pitch("G5"), pitch("C6")], 0.07, 0.08)),
    ),
  },
  // A floor bounce earned: a chord on the strike's note, C4, with its fifth,
  // its octave and the fifth above, struck upward and ringing. Each of its
  // intervals is a perfect one, so it is consonant on any note the view
  // raises it to, and in the key on any but E, whose fifth is B. The
  // ladder's bounces come at a rally of 10 or more, on A5 and C6, where it
  // plays three or four times as fast as here; a spring brick's may come
  // on any note.
  {
    name: "earn",
    seconds: 1.3,
    peak: 0.5,
    sample: arpeggio(
      [pitch("C4"), pitch("G4"), pitch("C5"), pitch("G5")],
      0.06,
      0.4,
    ),
  },
  // A floor bounce spent: the floor's spring throwing the fuzzball up, a
  // boing wobbling up from G3 to G4 under a puff of air.
  {
    name: "spend",
    seconds: 0.3,
    peak: 0.5,
    sample: withBurst(
      note(
        0,
        wobbled(glide(pitch("G3"), pitch("G4"), 0.09, 0.3), 14, 0.05),
        envelope(0.002, 0.08),
      ),
      67,
      0.03,
      0.8,
    ),
  },
  // The landing: a soft, low plop, falling from A3 to E3.
  {
    name: "land",
    seconds: 0.14,
    peak: 0.4,
    sample: withBurst(
      note(
        0,
        glide(pitch("A3"), pitch("E3"), 0.05, 0.1),
        envelope(0.002, 0.04),
      ),
      19,
      0.015,
      0.5,
    ),
  },
  // A bored fuzzball's yawn: a slow sigh, swelling and falling away an
  // octave, from C5 to C4.
  {
    name: "yawn",
    seconds: 0.7,
    peak: 0.35,
    sample: note(
      0,
      glide(pitch("C5"), pitch("C4"), 0.5, 0.15),
      envelope(0.15, 0.2),
    ),
  },
  // The wall's step down a row: a heavy, low thunk, Brick Fuzz Pop's.
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
  // The wall's jump: a long fall under a rumble, Brick Fuzz Pop's.
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
  // The danger line's warning: two soft notes, the second a fifth lower, E5
  // and A4.
  {
    name: "danger",
    seconds: 0.42,
    peak: 0.4,
    sample: sum(
      note(0, tone(pitch("E5"), 0.1), envelope(0.01, 0.06)),
      note(0.18, tone(pitch("A4"), 0.1), envelope(0.01, 0.08)),
    ),
  },
  // A level cleared: four notes of C major, C5, E5, G5 and C6, rising to the
  // octave.
  {
    name: "chime",
    seconds: 0.78,
    peak: 0.5,
    sample: arpeggio(
      [pitch("C5"), pitch("E5"), pitch("G5"), pitch("C6")],
      0.08,
      0.16,
    ),
  },
  // A level lost: a long tone falling two octaves, from A4 to A2, under a
  // thud.
  {
    name: "lost",
    seconds: 0.62,
    peak: 0.6,
    sample: withBurst(
      note(0, glide(pitch("A4"), pitch("A2"), 0.45, 0.2), envelope(0.005, 0.2)),
      37,
      0.06,
      1,
    ),
  },
  // The "Rickaashay!" call: the key's five notes stacked in fifths, C4, G4,
  // D5, A5 and E6, strummed upward under a rush of air, each doubled a
  // little sharp so the chord shimmers: louder and fuller than a floor
  // bounce's chord, and the loudest at its peak.
  {
    name: "call",
    seconds: 1.1,
    peak: 0.7,
    sample: (() => {
      const notes = ["C4", "G4", "D5", "A5", "E6"].map((name) => pitch(name));
      return withBurst(
        sum(
          arpeggio(notes, 0.025, 0.3),
          scaled(
            0.6,
            arpeggio(
              notes.map((hz) => hz * SHIMMER),
              0.025,
              0.3,
            ),
          ),
        ),
        71,
        0.1,
        0.5,
      );
    })(),
  },
];

/**
 * Writes the sprite and its map, or prints the script's usage, and returns
 * the code to exit with: 0, or 2 for a command line it can't read, having
 * written nothing.
 *
 * @param {readonly string[]} args
 * @param {BuildIo} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    write = writeSoundSprite,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  const read = readArgs(args, { options: {}, usage: USAGE });
  if (isStop(read)) return stopWith(read, { print, printError });
  const sprite = await write(RECIPES, SPRITE_FOLDER);
  print(
    `Wrote ${String(RECIPES.length)} sounds to ${SPRITE_PATH}/: ${sprite.seconds.toFixed(2)} s, ${String(sprite.wav.length)} bytes.`,
  );
  return 0;
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
