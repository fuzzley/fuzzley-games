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
 * It then packs them into one sprite, in the view's order, a tenth of a
 * second apart, and writes it there too, with its map. With ffmpeg on the
 * path, it encodes the sprite as Ogg Vorbis and as AAC into
 * src/scene/sounds/, beside its map and the SHA-256 of the WAV they were
 * made from, by which the spec knows the encodes are of the recipes as
 * they are. Without, it says so and leaves them as they are.
 *
 * It exits with 2, saying why, for a command line it can't read, before it
 * writes anything.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONSOLE, isStop, readArgs, stopWith, wrapped } from "@fz/dev/script";
import { encodeSprite, endedByGap, packSoundSprite } from "@fz/dev/sounds";
import { SR, centered, dB, fade, normalize, wav } from "@fz/dev/synth";
import { RECIPES as BOARD } from "./sounds/board.mjs";
import { RECIPES as LEVEL } from "./sounds/level.mjs";
import { RECIPES as MOVE } from "./sounds/move.mjs";
import { RECIPES as SPECIALS } from "./sounds/specials.mjs";

/** @import { Printer } from "@fz/dev/script" */
/** @import { Encoding, PackedSprite, RunProgram, SpriteLayout, SpriteSound } from "@fz/dev/sounds" */
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
 * @property {string} [spriteFolder]
 * @property {RunProgram} [runFfmpeg] Runs ffmpeg, which encodes the sprite.
 */

/**
 * Describes the sprite: its sounds packed, with their map, and its WAV.
 *
 * @typedef {object} Sprite
 * @property {PackedSprite} packed
 * @property {Buffer} wav Its samples, a gap after the last too, as ffmpeg is handed them.
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
export const RECIPES = [...MOVE, ...SPECIALS, ...BOARD, ...LEVEL];

/**
 * How the sprite is packed: at the recipes' rate, a tenth of a second
 * between two sounds, as the design's sprite has, none faded, as each
 * fades its own, and the map's times to a tenth of a millisecond.
 *
 * @type {Required<SpriteLayout>}
 */
const SPRITE_LAYOUT = { sampleRate: SR, gap: 0.1, fade: 0, places: 4 };

/**
 * How the sprite is encoded: Vorbis at the house's quality 5, and AAC at
 * the 72 kb/s the design's take was, as the house's 96 would weigh its 27
 * seconds over the game's 300 KB.
 *
 * @type {Encoding}
 */
const SPRITE_ENCODING = { vorbis: 5, aac: "72k" };

/** Where the WAVs are written, which git ignores. */
const WAV_FOLDER = join(import.meta.dirname, "sounds/wav");

/** Where the game's sprite, its map and its WAV's digest ship. */
export const SPRITE_FOLDER = join(import.meta.dirname, "../src/scene/sounds");

/** The file the sprite's WAV's SHA-256 is written in, as `sha256sum` writes one. */
export const SPRITE_DIGEST = "sprite.wav.sha256";

/** The level, in dB below full scale, under which a sound's tail is cut. */
const TAIL_FLOOR = -52;

/** How long a sound's start fades in, in seconds, so it never clicks. */
const FADE_IN = 0.0015;

/** How long a sound's end fades out, in seconds, unless its recipe says. */
const FADE_OUT = 0.012;

const USAGE = `Usage: yarn build:sounds [options]

${wrapped(
  "Renders every sound into tools/sounds/wav/, packs the sprite there, and encodes it into src/scene/sounds/ where ffmpeg is on the path.",
)}

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
 * Returns sounds packed into the sprite, in order, and its WAV, ended by
 * the gap an encoder needs.
 *
 * @param {readonly SpriteSound[]} sounds
 * @returns {Sprite}
 */
export function spriteOf(sounds) {
  const packed = packSoundSprite(sounds, SPRITE_LAYOUT);
  return { packed, wav: wav(endedByGap(packed.samples, SPRITE_LAYOUT)) };
}

/**
 * Returns a WAV's SHA-256 as `sha256sum` writes it, named `sprite.wav`.
 *
 * @param {Buffer} file
 * @returns {string}
 */
export function digestOf(file) {
  return `${createHash("sha256").update(file).digest("hex")}  sprite.wav\n`;
}

/**
 * Renders every sound and writes each as a WAV, packs and writes the
 * sprite, and encodes it where ffmpeg can be run, or prints the script's
 * usage, and returns the code to exit with: 0, or 2 for a command line it
 * can't read, having written nothing. It throws where an encode fails,
 * having changed none of the game's sounds.
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
    spriteFolder = SPRITE_FOLDER,
    runFfmpeg,
  } = {},
) {
  const read = readArgs(args, { options: {}, usage: USAGE });
  if (isStop(read)) return stopWith(read, { print, printError });
  await mkdir(wavFolder, { recursive: true });
  /** @type {SpriteSound[]} */
  const sounds = [];
  for (const recipe of recipes) {
    const x = finished(recipe);
    await writeFile(join(wavFolder, `${recipe.name}.wav`), wav(x));
    sounds.push({ name: recipe.name, takes: [x] });
  }
  print(`Wrote ${String(recipes.length)} sounds to ${wavFolder}.`);

  const sprite = spriteOf(sounds);
  const spriteWav = join(wavFolder, "sprite.wav");
  await writeFile(spriteWav, sprite.wav);
  await writeFile(join(wavFolder, "sprite.json"), sprite.packed.json);
  print(`The sprite: ${sprite.packed.seconds.toFixed(1)} s, in ${spriteWav}.`);

  const encoded = await encodeSprite(
    {
      wav: spriteWav,
      beds: [],
      alongside: {
        "sprite.json": sprite.packed.json,
        [SPRITE_DIGEST]: digestOf(sprite.wav),
      },
      into: spriteFolder,
      staging: join(wavFolder, "encoded"),
      encoding: SPRITE_ENCODING,
    },
    runFfmpeg,
  );
  print(
    encoded
      ? `Encoded the sprite into ${spriteFolder}.`
      : wrapped(
          `ffmpeg isn't on the path, so the sprite in ${spriteFolder} is left as it is.`,
        ),
  );
  return 0;
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
