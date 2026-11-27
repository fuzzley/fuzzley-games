#!/usr/bin/env node
/**
 * Builds Fuzz Flux's sounds from their recipes, the same bytes every run.
 *
 *   yarn build:sounds
 *
 * The recipes are the design's (docs/fuzz-flux/sound/sounds.mjs), written
 * again on `@fz/dev/synth`, a module of them for each part of play in
 * tools/sounds/, with what they share in tools/sounds/voices.mjs. Each
 * sound is finished as the design finished it: centered, brought to its
 * peak, its tail cut once it has died away under -52 dB and faded out, its
 * start faded in. It writes each as a WAV into tools/sounds/wav/, which git
 * ignores, and `tools/build-sounds.spec.ts` holds each to the design's
 * measures, `docs/fuzz-flux/sound/measures.md`.
 *
 * It exits with 2, saying why, for a command line it can't read, before it
 * writes anything.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONSOLE, isStop, readArgs, stopWith } from "@fz/dev/script";
import { SR, centered, dB, fade, normalize, wav } from "@fz/dev/synth";
import { RECIPES as MOVE } from "./sounds/move.mjs";
import { RECIPES as SPECIALS } from "./sounds/specials.mjs";

/** @import { Printer } from "@fz/dev/script" */
/** @import { Signal } from "@fz/dev/synth" */

/**
 * A sound, as its part of play's module describes it.
 *
 * @typedef {object} Recipe
 * @property {string} name Its name in the sprite, one of the view's `SOUNDS`.
 * @property {number} peak Its loudest sample, in dB below full scale.
 * @property {number} [fadeOut] How long its end fades out, in seconds, 12 ms unless given.
 * @property {() => Signal} make Returns its samples, at any level.
 */

/**
 * Says what the build renders and where, each the build's own unless a
 * spec hands it another.
 *
 * @typedef {object} BuildPlaces
 * @property {readonly Recipe[]} [recipes]
 * @property {string} [wavFolder]
 */

/**
 * Says where the build prints, as well as what it renders and where.
 *
 * @typedef {Partial<Printer> & BuildPlaces} BuildIo
 */

/**
 * Every recipe, in the order the sprite holds them.
 *
 * @type {readonly Recipe[]}
 */
export const RECIPES = [...MOVE, ...SPECIALS];

/** Where the WAVs are written, which git ignores. */
const WAV_FOLDER = join(import.meta.dirname, "sounds/wav");

/** The level, in dB below full scale, under which a sound's tail is cut. */
const TAIL_FLOOR = -52;

/** How long a sound's start fades in, in seconds, so it never clicks. */
const FADE_IN = 0.0015;

/** How long a sound's end fades out, in seconds, unless its recipe says. */
const FADE_OUT = 0.012;

const USAGE = `Usage: yarn build:sounds [options]

Renders every sound into tools/sounds/wav/.

  -h, --help      Show this message`;

/**
 * Returns a recipe's sound, finished: centered, its start faded in, brought
 * to its peak, and its tail cut where it last passes {@link TAIL_FLOOR},
 * then faded out.
 *
 * @param {Recipe} recipe
 * @returns {Signal}
 */
export function finished({ peak, fadeOut = FADE_OUT, make }) {
  const x = normalize(fade(centered(make()), FADE_IN, 0), peak);
  const floor = dB(TAIL_FLOOR);
  let end = x.length - 1;
  while (end > 0 && Math.abs(x[end] ?? 0) < floor) end--;
  return fade(x.subarray(0, end + 1 + Math.round(fadeOut * SR)), 0, fadeOut);
}

/**
 * Renders every sound and writes each as a WAV, or prints the script's
 * usage, and returns the code to exit with: 0, or 2 for a command line it
 * can't read, having written nothing.
 *
 * @param {readonly string[]} args
 * @param {BuildIo} [io]
 * @returns {Promise<number>}
 */
export async function run(
  args,
  {
    print = CONSOLE.print,
    printError = CONSOLE.printError,
    recipes = RECIPES,
    wavFolder = WAV_FOLDER,
  } = {},
) {
  const read = readArgs(args, { options: {}, usage: USAGE });
  if (isStop(read)) return stopWith(read, { print, printError });
  await mkdir(wavFolder, { recursive: true });
  for (const recipe of recipes) {
    await writeFile(
      join(wavFolder, `${recipe.name}.wav`),
      wav(finished(recipe)),
    );
  }
  print(`Wrote ${String(recipes.length)} sounds to ${wavFolder}.`);
  return 0;
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
