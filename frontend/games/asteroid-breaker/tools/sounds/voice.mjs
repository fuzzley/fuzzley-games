// The fuzzball's voice: eight short, wordless calls, each told from the
// others by where its pitch goes. `@fz/dev/synth`'s `sing()` is the voice
// itself; a recipe here says where a call's pitch and mouth go, and its takes
// differ as a creature's calls do: a little in pitch, in length and in the
// wobble.

import { fade, mix, pitch, reverb, seeded, sing } from "@fz/dev/synth";

/** @import { Recipe } from "../build-sounds.mjs" */
/** @import { Signal } from "@fz/dev/synth" */

/**
 * Returns a number near 1, off it by up to a share either way.
 *
 * @param {() => number} random
 * @param {number} share
 * @returns {number}
 */
const near = (random, share) => 1 + (random() * 2 - 1) * share;

/**
 * Returns a call in the little room every call shares, so it never stops
 * dead, the room's last echoes faded out.
 *
 * @param {Signal} x
 * @param {number} [decay] Seconds the room rings, less for the shortest calls.
 * @returns {Signal}
 */
const roomed = (x, decay = 0.14) =>
  fade(reverb(x, { decay, mix: 0.07, damp: 0.5 }), 0, 0.04);

/** @type {Recipe[]} */
export const SOUNDS = [
  {
    name: "voice-whee",
    about:
      "At a dash: the voice's reed sliding up an octave from E5 to E6 as the mouth opens from oo to ee, tipping over toward C6 as it ends.",
    takes: 3,
    level: "medium",
    plays: ["dash"],
    make: (take, seed) => {
      const random = seeded(seed);
      const top = pitch("E6") * near(random, 0.012);
      const tip = 0.6 + 0.04 * (take - 1) + 0.03 * (random() - 0.5);
      return roomed(
        sing({
          seconds: (0.26 + 0.025 * (take - 1)) * near(random, 0.05),
          pitch: [
            [0, top * 0.47 * near(random, 0.03)],
            [0.12, top * 0.54],
            [tip, top],
            [tip + 0.12, top * 1.01],
            [0.96, top * (0.8 - 0.015 * take)],
            [1, top * (0.79 - 0.015 * take)],
          ],
          mouth: [
            [0, "oo"],
            [0.34, "ee"],
            [1, "ee"],
          ],
          loud: [
            [0, 0.7],
            [tip, 1],
            [1, 0.7],
          ],
          attack: 0.02,
          release: 0.05,
          seed,
        }),
      );
    },
  },
  {
    name: "voice-eep",
    about:
      "At a near miss, startled: a tenth of a second of the voice's reed jumping from A5 to E6 with the mouth at ee, cut short.",
    takes: 3,
    level: "medium",
    plays: ["near miss", "a rock passing close to a fuzzball in tow"],
    make: (take, seed) => {
      const random = seeded(seed);
      const top = pitch("E6") * near(random, 0.015);
      return roomed(
        sing({
          seconds: (0.085 + 0.01 * take) * near(random, 0.06),
          pitch: [
            [0, top * (0.68 + 0.04 * take)],
            [0.4, top * 0.97],
            [0.75, top],
            [1, top * (0.95 + 0.04 * random())],
          ],
          mouth: [
            [0, "eh"],
            [0.35, "ee"],
            [1, "ee"],
          ],
          loud: [
            [0, 0.9],
            [0.5, 1],
            [1, 0.7],
          ],
          attack: 0.01,
          release: 0.028,
          breath: 0.14,
          seed,
        }),
        0.09,
      );
    },
  },
  {
    name: "voice-ouch",
    about:
      "Knocked loose from the tow line: the voice's reed leaping to C6 and falling through A5 to E5 as the mouth closes from ah to oo, surprised and not hurt.",
    takes: 2,
    level: "medium",
    plays: ["a fuzzball knocked loose"],
    make: (take, seed) => {
      const random = seeded(seed);
      const top = pitch("C6") * near(random, 0.012);
      return roomed(
        sing({
          seconds: (0.21 + 0.03 * take) * near(random, 0.05),
          pitch: [
            [0, top * 0.8],
            [0.12, top],
            [0.3, top * 0.96],
            [0.62, top * (0.84 - 0.02 * take)],
            [1, top * 0.63 * near(random, 0.02)],
          ],
          mouth: [
            [0, "ah"],
            [0.4, "ah"],
            [1, "oo"],
          ],
          loud: [
            [0, 1],
            [0.5, 0.85],
            [1, 0.4],
          ],
          attack: 0.012,
          release: 0.07,
          seed,
        }),
      );
    },
  },
  {
    name: "voice-yay",
    about:
      "Rescued, or caught again: the voice's reed in two parts, up to G5 and then up again to C6, where it trills as the mouth opens and shuts on ya-yay.",
    takes: 3,
    level: "medium",
    plays: ["a stray caught", "a loose fuzzball caught again"],
    make: (take, seed) => {
      const random = seeded(seed);
      const first = pitch("G5") * near(random, 0.012);
      const second = pitch("C6") * near(random, 0.012);
      const turn = 0.42 + 0.03 * (take - 1);
      return roomed(
        sing({
          seconds: (0.31 + 0.02 * (take - 1)) * near(random, 0.05),
          pitch: [
            [0, first * 0.8],
            [turn * 0.45, first],
            [turn, first * 1.01],
            [turn + 0.08, first * 1.06],
            [turn + 0.24, second],
            [1, second * (1.02 + 0.02 * take)],
          ],
          mouth: [
            [0, "ee"],
            [turn * 0.5, "ah"],
            [turn, "eh"],
            [turn + 0.08, "ee"],
            [turn + 0.26, "ah"],
            [1, "ee"],
          ],
          loud: [
            [0, 0.95],
            [turn - 0.08, 0.85],
            [turn + 0.02, 0.3],
            [turn + 0.12, 1],
            [0.9, 0.9],
            [1, 0.6],
          ],
          wobble: {
            from: turn + 0.16,
            rate: 15 * near(random, 0.1),
            cents: 52 + 10 * random(),
          },
          attack: 0.014,
          release: 0.055,
          seed,
        }),
      );
    },
  },
  {
    name: "voice-ooh",
    about:
      "A stray arriving, curious: the voice's reed held soft on G5 with the mouth at oo, then rising to C6 as a question does.",
    takes: 2,
    level: "small",
    plays: ["a stray arrives"],
    make: (take, seed) => {
      const random = seeded(seed);
      const home = pitch("G5") * near(random, 0.012);
      const turn = 0.52 + 0.08 * take;
      return roomed(
        sing({
          seconds: (0.24 + 0.03 * take) * near(random, 0.05),
          pitch: [
            [0, home * 0.93],
            [0.14, home],
            [turn, home * 1.01],
            [1, home * (1.335 + 0.02 * (random() - 0.5))],
          ],
          mouth: [
            [0, "oo"],
            [turn, "oo"],
            [1, "oh"],
          ],
          loud: [
            [0, 0.8],
            [turn, 0.9],
            [0.9, 1],
            [1, 0.8],
          ],
          attack: 0.025,
          release: 0.06,
          bright: 0.7,
          seed,
        }),
      );
    },
  },
  {
    name: "voice-aww",
    about:
      "Floating home: the voice's reed falling gently from A5 to E5 as the mouth closes from ah to oo, with a little wobble as it goes.",
    takes: 2,
    level: "small",
    plays: ["a fuzzball floats home"],
    make: (take, seed) => {
      const random = seeded(seed);
      const top = pitch("A5") * near(random, 0.012);
      return roomed(
        sing({
          seconds: (0.36 + 0.04 * take) * near(random, 0.05),
          pitch: [
            [0, top * 0.96],
            [0.1, top],
            [0.36, top * 0.985],
            [0.8, top * 0.752],
            [1, top * 0.745],
          ],
          mouth: [
            [0, "ah"],
            [0.45, "oh"],
            [1, "oo"],
          ],
          loud: [
            [0, 0.9],
            [0.25, 1],
            [1, 0.4],
          ],
          wobble: {
            from: 0.42 - 0.06 * take,
            rate: 8 * near(random, 0.1),
            cents: 30 + 10 * random(),
          },
          attack: 0.025,
          release: 0.1,
          bright: 0.8,
          seed,
        }),
      );
    },
  },
  {
    name: "voice-cheer",
    about:
      "A wave cleared: four or five fuzzballs of different sizes calling yaaay at once, each scooping up to its own note of C, E, G or A and wobbling there, none quite together.",
    takes: 2,
    level: "medium",
    plays: ["wave cleared"],
    make: (take, seed) => {
      const random = seeded(seed);
      const notes =
        take === 0 ? ["G5", "C6", "E6", "C6"] : ["C6", "E6", "G5", "A5", "E6"];
      return roomed(
        mix(
          notes.map((name, k) => {
            const note = pitch(name) * near(random, 0.015);
            const turn = 0.2 + 0.1 * random();
            return {
              x: sing({
                seconds: 0.42 + 0.12 * random(),
                pitch: [
                  [0, note * (0.7 + 0.1 * random())],
                  [turn, note],
                  [0.75, note * 1.02],
                  [1, note * (0.86 + 0.08 * random())],
                ],
                mouth: [
                  [0, "ee"],
                  [turn, "ah"],
                  [0.72, "ah"],
                  [1, "ee"],
                ],
                loud: [
                  [0, 0.8],
                  [turn, 1],
                  [0.7, 0.9],
                  [1, 0.4],
                ],
                wobble: {
                  from: 0.45 + 0.15 * random(),
                  rate: 7 + 2.5 * random(),
                  cents: 24 + 16 * random(),
                },
                attack: 0.02,
                release: 0.09,
                size: 0.9 + 0.22 * random(),
                seed: seed + 31 * (k + 1),
              }),
              at: k === 0 ? 0 : 0.02 + 0.1 * random(),
              gain: 0.75 + 0.25 * random(),
            };
          }),
        ),
      );
    },
  },
  {
    name: "voice-hum",
    about:
      "Waiting before a wave: the voice's reed with its mouth shut, humming two contented notes of the key, E5 then G5 or G5 then A5, the second the higher.",
    takes: 2,
    level: "small",
    plays: ["waiting for the player's first move of a wave"],
    make: (take, seed) => {
      const random = seeded(seed);
      const [low, high] = take === 0 ? ["E5", "G5"] : ["G5", "A5"];
      const first = pitch(low ?? "E5") * near(random, 0.008);
      const second = pitch(high ?? "G5") * near(random, 0.008);
      const turn = 0.44 + 0.04 * (random() - 0.5);
      return roomed(
        sing({
          seconds: 0.5 * near(random, 0.06),
          pitch: [
            [0, first * 0.97],
            [0.08, first],
            [turn - 0.04, first],
            [turn + 0.08, second],
            [0.9, second],
            [1, second * 0.985],
          ],
          mouth: [
            [0, "mm"],
            [1, "mm"],
          ],
          loud: [
            [0, 0.9],
            [turn - 0.1, 0.8],
            [turn + 0.01, 0.4],
            [turn + 0.12, 1],
            [0.85, 0.8],
            [1, 0.45],
          ],
          wobble: {
            from: 0.6,
            rate: 7.5 * near(random, 0.1),
            cents: 18 + 6 * random(),
          },
          attack: 0.025,
          release: 0.1,
          breath: 0.05,
          bright: 0.2,
          seed,
        }),
      );
    },
  },
];
