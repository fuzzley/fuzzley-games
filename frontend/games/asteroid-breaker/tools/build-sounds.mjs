#!/usr/bin/env node
/**
 * Builds Asteroid Breaker's sounds from their recipes, the same bytes every
 * run.
 *
 *   yarn build:sounds [--family <name>]... [--only <sound>]...
 *
 * Each family of sounds is a module in tools/sounds/ whose `SOUNDS` are its
 * recipes, made with `@fz/dev/synth` and what the ship's, the pickups' and
 * the stingers' share in tools/sounds/ship_parts.mjs. It renders every take
 * of every sound, brings each to its level under a ceiling, says what of it
 * a phone would lose or the limiter caught, and writes it as a WAV into
 * tools/sounds/wav/<family>/, which git ignores. It then packs every take
 * but the beds into one sprite, the sounds by name, each take a gap after
 * the one before and none faded, and writes it there too, with its map and
 * each take's length. With ffmpeg on the path, it encodes the sprite as Ogg
 * Vorbis, which every browser but Safari plays, and as M4A, which Safari
 * plays, into src/scene/sounds/, the map and the lengths beside them, and
 * each bed and layer, in stereo, into src/scene/sounds/beds/, all of them
 * or, should an encode fail, none. Without, it says so and leaves them as
 * they are.
 *
 * The takes were first built by the uplift's kit, in
 * docs/archive/asteroid-breaker-uplift/sound/, whose encode.mjs packed and
 * encoded them as this does, and whose encodes the game ships; this builds the
 * same takes, to the byte, and on a machine with ffmpeg, the same map.
 *
 * With `--family` or `--only`, it renders those families or sounds alone
 * and packs nothing, as the sprite holds them all.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  SR,
  centered,
  dB,
  fade,
  gain,
  limit,
  loudness,
  measure,
  seam,
  wav,
  wavSamples,
} from "@fz/dev/synth";
import {
  encodeSprite,
  endedByGap,
  packSoundSprite,
  takeNames,
} from "@fz/dev/sounds";
import {
  CONSOLE,
  isStop,
  misread,
  readArgs,
  stopWith,
  wrapped,
} from "@fz/dev/script";
import { SOUNDS as BEDS } from "./sounds/beds.mjs";
import { SOUNDS as CHAIN } from "./sounds/chain.mjs";
import { SOUNDS as HAZARDS } from "./sounds/hazards.mjs";
import { SOUNDS as PICKUPS } from "./sounds/pickups.mjs";
import { SOUNDS as RESCUE } from "./sounds/rescue.mjs";
import { SOUNDS as ROCKS } from "./sounds/rocks.mjs";
import { SOUNDS as SHIP } from "./sounds/ship.mjs";
import { SOUNDS as STINGERS } from "./sounds/stingers.mjs";
import { SOUNDS as VOICE } from "./sounds/voice.mjs";

/** @import { Signal } from "@fz/dev/synth" */
/** @import { RunProgram, SpriteLayout, SpriteSound } from "@fz/dev/sounds" */
/** @import { Printer, Stop } from "@fz/dev/script" */

/**
 * How loud each level sits: the level of a sound's loudest 50 ms, in dB
 * below full scale. A shot heard seven times a second sits far under a
 * blast heard once; the gaps between the levels are the mix.
 */
export const LEVELS = {
  /** Heard many times a second: a shot, a mote gathered, a tick. */
  tick: -27,
  /** Small and frequent: a small rock, a ping, a blip. */
  small: -21,
  /** The body of play: a medium rock, a pickup, a dash, a voice. */
  medium: -17,
  /** An event: a large rock, a zap, a stinger. */
  large: -14,
  /** Rare and meant to be felt: a blast, a boulder, a ship lost. */
  huge: -11,
  /** Under everything, always: a bed's layer. */
  bed: -27,
};

/** @typedef {keyof typeof LEVELS} Level */

/**
 * A sound, as its family's module describes it.
 *
 * @typedef {object} Recipe
 * @property {string} name Its name in kebab-case, such as "shot-gun"; a take's adds "-1", "-2".
 * @property {string} about What plays it and how it is built, in a sentence.
 * @property {number} [takes] How many takes it has, each a little different, 1 unless given.
 * @property {Level} level How loud it sits in the mix.
 * @property {boolean} [loop] Whether the game loops it; a loop is neither faded nor centered, and its seam is checked.
 * @property {string[]} [plays] The game's events that play it, in words.
 * @property {(take: number, seed: number) => Signal | [Signal, Signal]} make Returns a take's samples, one channel or two, at any level.
 */

/**
 * Families of sounds, each's recipes by the family's name, which names its
 * folder of WAVs.
 *
 * @typedef {Readonly<Record<string, readonly Recipe[]>>} Families
 */

/**
 * Every family's recipes.
 *
 * @type {Families}
 */
export const FAMILIES = {
  beds: BEDS,
  chain: CHAIN,
  hazards: HAZARDS,
  pickups: PICKUPS,
  rescue: RESCUE,
  rocks: ROCKS,
  ship: SHIP,
  stingers: STINGERS,
  voice: VOICE,
};

/** The family whose sounds are files of their own, not takes of the sprite. */
export const BED_FAMILY = "beds";

/** No sample passes this, in dB below full scale. */
const CEILING = -1;

/**
 * How the sprite is packed: at the synth's rate, a gap of 0.06 s between
 * two takes, none faded, as the recipes fade their own, and the map's times
 * to a tenth of a millisecond.
 *
 * @type {Required<SpriteLayout>}
 */
export const SPRITE_LAYOUT = { sampleRate: SR, gap: 0.06, fade: 0, places: 4 };

/** Where the WAVs are written, which git ignores. */
export const WAV_FOLDER = join(import.meta.dirname, "sounds/wav");

/** Where the game's sprite, its map, the takes' lengths and the beds are. */
export const SPRITE_FOLDER = join(import.meta.dirname, "../src/scene/sounds");

/**
 * What a command line asks the build for.
 *
 * @typedef {object} Request
 * @property {readonly string[]} families The families named, none for every one.
 * @property {readonly string[]} only The sounds named, none for every one.
 */

/**
 * A sound's takes, rendered and written.
 *
 * @typedef {object} Rendered
 * @property {string} family
 * @property {Recipe} recipe
 * @property {Signal[]} takes Each take's samples as its WAV holds them, the first channel of a bed's.
 * @property {string[]} files Each take's WAV, by its path from the WAVs' folder.
 * @property {string[]} warnings What of each take is wrong, by its name.
 */

/**
 * Says what the build builds and where it writes, each the build's own
 * unless a spec hands it another.
 *
 * @typedef {object} BuildPlaces
 * @property {Families} [families]
 * @property {string} [wavFolder]
 * @property {string} [spriteFolder]
 * @property {RunProgram} [runFfmpeg] Runs ffmpeg, which encodes the sprite and the beds.
 */

/**
 * Says where the build prints, as well as what it builds and where it
 * writes.
 *
 * @typedef {Partial<Printer> & BuildPlaces} BuildIo
 */

const USAGE = `Usage: yarn build:sounds [options]

${wrapped(
  "Renders every take of every sound into tools/sounds/wav/, packs the sprite, and encodes it and the beds into src/scene/sounds/ where ffmpeg is on the path.",
)}

  --family <name>  Render this family alone, packing nothing; may be given
                   more than once (${Object.keys(FAMILIES).join(", ")})
  --only <sound>   Render this sound alone, packing nothing; may be given
                   more than once
  -h, --help       Show this message`;

/**
 * Returns what a command line asks the build for, or, for `--help` or one
 * the build can't read, what to print and the code to exit with.
 *
 * @param {readonly string[]} args
 * @param {Families} [families]
 * @returns {Request | Stop}
 */
export function readCommandLine(args, families = FAMILIES) {
  const read = readArgs(args, {
    options: {
      family: { type: "string", multiple: true, default: [] },
      only: { type: "string", multiple: true, default: [] },
    },
    usage: USAGE,
  });
  if (isStop(read)) return read;
  const { family, only } = read.values;
  const unknownFamily = family.find((name) => !Object.hasOwn(families, name));
  if (unknownFamily !== undefined) {
    return misread(`--family names no family: "${unknownFamily}".`, USAGE);
  }
  const names = new Set(
    Object.values(families).flatMap((recipes) =>
      recipes.map(({ name }) => name),
    ),
  );
  const unknownSound = only.find((name) => !names.has(name));
  if (unknownSound !== undefined) {
    return misread(`--only names no sound: "${unknownSound}".`, USAGE);
  }
  return { families: family, only };
}

/**
 * Returns a number from a name, so each sound's takes are seeded apart.
 *
 * @param {string} name
 * @returns {number}
 */
export function seedOf(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * Returns a take finished: centered and faded at its ends unless it loops,
 * brought to its level and kept under the ceiling.
 *
 * @param {Signal} x
 * @param {Recipe} recipe
 * @returns {Signal}
 */
function finished(x, recipe) {
  let y = recipe.loop ? x : fade(centered(x), 0.0005, 0.012);
  y = gain(y, dB(LEVELS[recipe.level] - loudness(y).rms50));
  if (loudness(y).peak > CEILING) y = limit(y, CEILING);
  return y;
}

/**
 * Returns a take of a recipe rendered and finished, each channel of it,
 * from its own seed, by the recipe's name and the take's number.
 *
 * @param {Recipe} recipe
 * @param {number} take From 0.
 * @returns {Signal[]}
 */
export function renderTake(recipe, take) {
  const made = recipe.make(take, seedOf(recipe.name) + take * 7919);
  const channels = made instanceof Float64Array ? [made] : made;
  return channels.map((channel) => finished(channel, recipe));
}

/**
 * Returns what is wrong with a take, as the build warns of it: samples that
 * aren't numbers, a start or end off zero, a level the limiter pulled down,
 * a sound off the middle, a loop with a seam, or one a phone loses most of.
 *
 * @param {string} name
 * @param {Recipe} recipe
 * @param {Signal} x
 * @returns {string[]}
 */
export function warningsOf(name, recipe, x) {
  const m = measure(x);
  const level = LEVELS[recipe.level];
  /** @type {string[]} */
  const warnings = [];
  if (!x.every(Number.isFinite)) warnings.push(`${name}: not a number`);
  if (!recipe.loop && m.edge > 0.002) {
    warnings.push(`${name}: starts or ends off zero (${m.edge.toFixed(4)})`);
  }
  if (m.rms50 < level - 1.5) {
    warnings.push(
      `${name}: the limiter caught it, so it sits ${(level - m.rms50).toFixed(1)} dB under its level; its peaks stand too far over its body for that level`,
    );
  }
  if (Math.abs(m.dc) > 0.004) {
    warnings.push(`${name}: sits off the middle (${m.dc.toFixed(4)})`);
  }
  if (recipe.loop && seam(x) > 1.5) {
    warnings.push(`${name}: its loop has a seam (${seam(x).toFixed(2)})`);
  }
  if (recipe.level !== "bed" && m.phone < 0.35) {
    warnings.push(
      `${name}: only ${(m.phone * 100).toFixed(0)}% of it is above 300 Hz, so a phone loses most of it`,
    );
  }
  return warnings;
}

/**
 * Renders a recipe's every take, writes each as a WAV into its family's
 * folder, and returns them as the WAVs hold them, with what is wrong with
 * each.
 *
 * @param {string} family
 * @param {Recipe} recipe
 * @param {string} folder The WAVs' folder.
 * @returns {Promise<Rendered>}
 */
async function renderRecipe(family, recipe, folder) {
  await mkdir(join(folder, family), { recursive: true });
  /** @type {Rendered} */
  const rendered = { family, recipe, takes: [], files: [], warnings: [] };
  const names = takeNames(recipe.name, recipe.takes ?? 1);
  for (const [take, name] of names.entries()) {
    const [first, second] = renderTake(recipe, take);
    if (first === undefined) throw new Error(`${name} rendered no channel.`);
    rendered.warnings.push(...warningsOf(name, recipe, first));
    const file = wav(second === undefined ? first : [first, second]);
    const path = `${family}/${name}.wav`;
    await writeFile(join(folder, path), file);
    // The sprite packs a take as its WAV holds it, as the kit's encoder did.
    rendered.takes.push(/** @type {Signal} */ (wavSamples(file)[0]));
    rendered.files.push(path);
  }
  return rendered;
}

/**
 * Returns whether a request asks for a family's recipe: each one, where it
 * names neither a family nor a sound.
 *
 * @param {Request} request
 * @param {string} family
 * @param {Recipe} recipe
 * @returns {boolean}
 */
function asksFor(request, family, recipe) {
  return (
    (request.families.length === 0 && request.only.length === 0) ||
    request.families.includes(family) ||
    request.only.includes(recipe.name)
  );
}

/**
 * Returns the sounds of the sprite, every one rendered but the beds, by
 * name, as the sprite holds them.
 *
 * @param {readonly Rendered[]} rendered
 * @returns {SpriteSound[]}
 */
export function spriteSoundsOf(rendered) {
  return rendered
    .filter(({ family }) => family !== BED_FAMILY)
    .map(({ recipe, takes }) => ({
      name: recipe.name,
      takes,
      loop: recipe.loop ?? false,
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * Returns the JSON of each take's length in the sprite, in samples, by its
 * name, in the sprite's order, which a spec holds the map to.
 *
 * @param {readonly SpriteSound[]} sounds
 * @returns {string}
 */
function lengthsJson(sounds) {
  /** @type {Record<string, number>} */
  const takes = {};
  for (const { name, takes: samples } of sounds) {
    takeNames(name, samples.length).forEach((take, i) => {
      takes[take] = samples[i]?.length ?? 0;
    });
  }
  return `${JSON.stringify({ sampleRate: SPRITE_LAYOUT.sampleRate, takes }, null, 2)}\n`;
}

/**
 * Builds the sounds a command line asks for, or prints its usage, and
 * returns the code to exit with: 0, or 2 for a command line it can't read,
 * built nothing. It throws where an encode fails, having changed none of
 * the game's sounds.
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
    families = FAMILIES,
    wavFolder = WAV_FOLDER,
    spriteFolder = SPRITE_FOLDER,
    runFfmpeg,
  } = {},
) {
  const request = readCommandLine(args, families);
  if (isStop(request)) return stopWith(request, { print, printError });
  /** @type {Rendered[]} */
  const rendered = [];
  for (const [family, recipes] of Object.entries(families)) {
    /** @type {Rendered[]} */
    const ones = [];
    for (const recipe of recipes) {
      if (!asksFor(request, family, recipe)) continue;
      ones.push(await renderRecipe(family, recipe, wavFolder));
    }
    if (ones.length === 0) continue;
    const takes = ones.reduce((sum, { takes }) => sum + takes.length, 0);
    const warnings = ones.flatMap((sound) => sound.warnings);
    print(
      `${family}: ${String(takes)} takes of ${String(ones.length)} sounds${warnings.length > 0 ? `, ${String(warnings.length)} warnings` : ""}`,
    );
    for (const warning of warnings) print(`  ! ${warning}`);
    rendered.push(...ones);
  }
  if (request.families.length > 0 || request.only.length > 0) {
    print("Packed nothing: the sprite holds every sound, so build them all.");
    return 0;
  }

  const sounds = spriteSoundsOf(rendered);
  const sprite = packSoundSprite(sounds, SPRITE_LAYOUT);
  const lengths = lengthsJson(sounds);
  // Ended by a gap, as the kit's encoder ended it, so ffmpeg is handed the
  // file the kit handed it.
  await writeFile(
    join(wavFolder, "sprite.wav"),
    wav(endedByGap(sprite.samples, SPRITE_LAYOUT)),
  );
  await writeFile(join(wavFolder, "sprite.json"), sprite.json);
  await writeFile(join(wavFolder, "sprite_lengths.json"), lengths);
  const takes = Object.keys(sprite.spritemap).length;
  print(
    `The sprite: ${String(takes)} takes, ${sprite.seconds.toFixed(1)} s, in ${join(wavFolder, "sprite.wav")}.`,
  );

  const beds = rendered.filter(({ family }) => family === BED_FAMILY);
  const encoded = await encodeSprite(
    {
      wav: join(wavFolder, "sprite.wav"),
      beds: beds.flatMap(({ files }) =>
        files.map((file) => join(wavFolder, file)),
      ),
      alongside: { "sprite.json": sprite.json, "sprite_lengths.json": lengths },
      into: spriteFolder,
      staging: join(wavFolder, "encoded"),
    },
    runFfmpeg,
  );
  if (!encoded) {
    print(
      wrapped(
        `ffmpeg isn't on the path, so the sprite and the beds in ${spriteFolder} are left as they are.`,
      ),
    );
    return 0;
  }
  print(
    `Encoded the sprite and ${String(beds.length)} beds into ${spriteFolder}.`,
  );
  return 0;
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
