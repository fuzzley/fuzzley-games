// Packs the built sounds as a game would ship them, with ffmpeg:
//
//   node docs/asteroid-breaker-uplift/sound/encode.mjs
//
// It reads ../assets/sound/sounds.json and the WAVs build.mjs wrote, and
// writes:
//
//   ../assets/sound/sprite/sounds.ogg, sounds.m4a   every take but the beds, in one file
//   ../assets/sound/sprite/sounds.json             where each take lies in it
//   ../assets/sound/beds/<name>.ogg, <name>.m4a     each bed and layer, in stereo
//
// The sprite's map is the one Phaser's `load.audioSprite()` takes, as the
// game's is today, a take's name its key. Ogg Vorbis is for every browser
// but Safari, which takes the M4A. A lossy file may pad its start, so the
// times in the map are the WAV's, and a game must check them against what
// each browser decodes before trusting a loop to them.

import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { SR, wav } from "./lib/synth.mjs";

const run = promisify(execFile);
const here = import.meta.dirname;
const assets = join(here, "../assets/sound");

/** The silence between two takes in the sprite, in seconds. */
const GAP = 0.06;

/**
 * Returns a mono WAV's samples.
 *
 * @param {string} file
 * @returns {Promise<Float64Array>}
 */
async function samplesOf(file) {
  const data = await readFile(file);
  const count = (data.length - 44) / 2;
  const out = new Float64Array(count);
  for (let i = 0; i < count; i++) out[i] = data.readInt16LE(44 + i * 2) / 32768;
  return out;
}

/**
 * Encodes a WAV as Ogg Vorbis and as M4A, beside each other.
 *
 * @param {string} from The WAV's path.
 * @param {string} to The path to write, without an extension.
 * @param {number} quality Vorbis's quality, 0 to 10.
 * @param {string} rate AAC's bit rate, such as "96k".
 * @returns {Promise<void>}
 */
async function encode(from, to, quality, rate) {
  // Bit-exact, with no date and no encoder's name written in, so the same
  // WAV packs to the same bytes every run.
  const quiet = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    from,
    "-map_metadata",
    "-1",
    "-fflags",
    "+bitexact",
    "-flags:a",
    "+bitexact",
  ];
  await run("ffmpeg", [
    ...quiet,
    "-c:a",
    "libvorbis",
    "-q:a",
    String(quality),
    `${to}.ogg`,
  ]);
  await run("ffmpeg", [
    ...quiet,
    "-c:a",
    "aac",
    "-b:a",
    rate,
    "-movflags",
    "+faststart",
    `${to}.m4a`,
  ]);
}

/** @type {{ sounds: Record<string, { family: string, loop: boolean, files: string[] }> }} */
const manifest = JSON.parse(
  await readFile(join(assets, "sounds.json"), "utf8"),
);
const scratch = join(tmpdir(), `asteroid-breaker-uplift-${process.pid}`);
await mkdir(scratch, { recursive: true });
await mkdir(join(assets, "sprite"), { recursive: true });
await mkdir(join(assets, "beds"), { recursive: true });

/** @type {Float64Array[]} */
const parts = [];
/** @type {Record<string, { start: number, end: number, loop: boolean }>} */
const spritemap = {};
let at = 0;
for (const [, sound] of Object.entries(manifest.sounds)) {
  for (const file of sound.files) {
    const take = /** @type {string} */ (file.split("/").at(-1)).replace(
      /\.wav$/,
      "",
    );
    if (sound.family === "beds") {
      await encode(join(assets, file), join(assets, "beds", take), 4, "128k");
      continue;
    }
    const samples = await samplesOf(join(assets, file));
    spritemap[take] = {
      start: Number((at / SR).toFixed(4)),
      end: Number(((at + samples.length) / SR).toFixed(4)),
      loop: sound.loop,
    };
    parts.push(samples, new Float64Array(Math.round(GAP * SR)));
    at += samples.length + Math.round(GAP * SR);
  }
}
const all = new Float64Array(at);
let offset = 0;
for (const part of parts) {
  all.set(part, offset);
  offset += part.length;
}
const sprite = join(scratch, "sounds.wav");
await writeFile(sprite, wav(all));
await encode(sprite, join(assets, "sprite", "sounds"), 5, "96k");
await writeFile(
  join(assets, "sprite", "sounds.json"),
  `${JSON.stringify({ spritemap }, null, 2)}\n`,
);
await rm(scratch, { recursive: true, force: true });

const size = async (/** @type {string} */ file) =>
  `${((await stat(join(assets, file))).size / 1024).toFixed(0)} KiB`;
console.log(
  `The sprite: ${Object.keys(spritemap).length} takes, ${(at / SR).toFixed(1)} s; ${await size("sprite/sounds.ogg")} as Ogg, ${await size("sprite/sounds.m4a")} as M4A.`,
);
