// Builds the uplift's sounds from their recipes, the same bytes every run:
//
//   node docs/archive/asteroid-breaker-uplift/sound/build.mjs            every family
//   node docs/archive/asteroid-breaker-uplift/sound/build.mjs rocks ship  only those
//   node docs/archive/asteroid-breaker-uplift/sound/build.mjs --no-files  measure only
//
// For each family, a module in recipes/ that exports SOUNDS, it renders
// every take of every sound, brings it to its level, and writes:
//
//   ../assets/sound/wav/<family>/<name>[-<take>].wav   the sounds themselves
//   ../assets/sound/sounds.json                       what each is, for the game
//   sheets/<family>.png                               each take's picture
//   report/<family>.md                                each take's measurements

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  REPORT_HEAD,
  contactSheet,
  measure,
  reportLine,
  seam,
} from "./lib/analyze.mjs";
import { SR, centered, dB, fade, gain, limit, wav } from "./lib/synth.mjs";

/** @import { Signal } from "./lib/synth.mjs" */

/**
 * @typedef {object} Recipe A sound, as its family's module describes it.
 * @property {string} name Its name in kebab-case, such as "shot-gun"; a take's file adds "-1", "-2".
 * @property {string} about What plays it and how it is built, in a sentence.
 * @property {number} [takes] How many takes it has, each a little different, 1 unless given.
 * @property {keyof typeof LEVELS} level How loud it sits in the mix.
 * @property {boolean} [loop] Whether the game loops it; a loop is neither faded nor centered, and its seam is checked.
 * @property {string[]} [plays] The game's events that play it, for the plan.
 * @property {(take: number, seed: number) => Signal | [Signal, Signal]} make Returns a take's samples, one channel or two, at any level.
 */

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

/** No sample passes this, in dB below full scale. */
const CEILING = -1;

const here = import.meta.dirname;
const assets = join(here, "../assets/sound");

/**
 * Returns a number from a name, so each sound's takes are seeded apart.
 *
 * @param {string} name
 * @returns {number}
 */
function seedOf(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++)
    h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Returns a take finished: centered, faded at its ends unless it loops,
 * brought to its level and kept under the ceiling.
 *
 * @param {Signal} x
 * @param {Recipe} recipe
 * @returns {Signal}
 */
function finished(x, recipe) {
  let y = recipe.loop ? x : fade(centered(x), 0.0005, 0.012);
  const { rms50 } = measure(y);
  y = gain(y, dB(LEVELS[recipe.level] - rms50));
  if (measure(y).peak > CEILING) y = limit(y, CEILING);
  return y;
}

const args = process.argv.slice(2);
const files = !args.includes("--no-files");
const asked = args.filter((arg) => !arg.startsWith("--"));
const families = (await readdir(join(here, "recipes")))
  .filter((file) => file.endsWith(".mjs"))
  .map((file) => file.replace(/\.mjs$/, ""))
  .filter((family) => asked.length === 0 || asked.includes(family))
  .sort();

/** What sounds.json says of every sound, kept between runs for the families not built this time. */
const manifestFile = join(assets, "sounds.json");
/** @type {Record<string, unknown>} */
let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestFile, "utf8")).sounds ?? {};
} catch {
  // No manifest yet.
}

for (const family of families) {
  /** @type {{ SOUNDS: Recipe[] }} */
  const { SOUNDS } = await import(
    pathToFileURL(join(here, "recipes", `${family}.mjs`)).href
  );
  const folder = join(assets, "wav", family);
  if (files) await mkdir(folder, { recursive: true });
  /** @type {{ name: string, x: Signal }[]} */
  const tiles = [];
  const lines = [`# ${family}`, "", REPORT_HEAD];
  /** @type {string[]} */
  const warnings = [];
  for (const recipe of SOUNDS) {
    const takes = recipe.takes ?? 1;
    /** @type {string[]} */
    const names = [];
    let seconds = 0;
    for (let take = 0; take < takes; take++) {
      const name = takes === 1 ? recipe.name : `${recipe.name}-${take + 1}`;
      const made = recipe.make(take, seedOf(recipe.name) + take * 7919);
      const channels = made instanceof Float64Array ? [made] : made;
      const done = channels.map((channel) => finished(channel, recipe));
      const first = /** @type {Signal} */ (done[0]);
      const m = measure(first);
      seconds = Math.max(seconds, m.seconds);
      tiles.push({ name, x: first });
      lines.push(reportLine(name, first));
      if (!first.every(Number.isFinite)) warnings.push(`${name}: not a number`);
      if (!recipe.loop && m.edge > 0.002)
        warnings.push(
          `${name}: starts or ends off zero (${m.edge.toFixed(4)})`,
        );
      if (m.rms50 < LEVELS[recipe.level] - 1.5)
        warnings.push(
          `${name}: the limiter caught it, so it sits ${(LEVELS[recipe.level] - m.rms50).toFixed(1)} dB under its level; its peaks stand too far over its body for that level`,
        );
      if (Math.abs(m.dc) > 0.004)
        warnings.push(`${name}: sits off the middle (${m.dc.toFixed(4)})`);
      if (recipe.loop && seam(first) > 1.5)
        warnings.push(
          `${name}: its loop has a seam (${seam(first).toFixed(2)})`,
        );
      if (recipe.level !== "bed" && m.phone < 0.35) {
        warnings.push(
          `${name}: only ${(m.phone * 100).toFixed(0)}% of it is above 300 Hz, so a phone loses most of it`,
        );
      }
      if (files) {
        await writeFile(
          join(folder, `${name}.wav`),
          wav(
            done.length === 2
              ? [first, /** @type {Signal} */ (done[1])]
              : first,
          ),
        );
      }
      names.push(`wav/${family}/${name}.wav`);
    }
    manifest[recipe.name] = {
      family,
      about: recipe.about,
      level: recipe.level,
      loop: recipe.loop ?? false,
      seconds: Number(seconds.toFixed(3)),
      plays: recipe.plays ?? [],
      files: names,
    };
  }
  if (warnings.length > 0)
    lines.push(
      "",
      "## Warnings",
      "",
      ...warnings.map((warning) => `- ${warning}`),
    );
  await mkdir(join(here, "sheets"), { recursive: true });
  await mkdir(join(here, "report"), { recursive: true });
  await contactSheet(tiles, join(here, "sheets", `${family}.png`));
  await writeFile(
    join(here, "report", `${family}.md`),
    `${lines.join("\n")}\n`,
  );
  console.log(
    `${family}: ${tiles.length} takes of ${SOUNDS.length} sounds${warnings.length ? `, ${warnings.length} warnings` : ""}`,
  );
  for (const warning of warnings) console.log(`  ! ${warning}`);
}

if (files) {
  await mkdir(assets, { recursive: true });
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(
    manifestFile,
    `${JSON.stringify({ sampleRate: SR, levels: LEVELS, sounds: sorted }, null, 2)}\n`,
  );
}
