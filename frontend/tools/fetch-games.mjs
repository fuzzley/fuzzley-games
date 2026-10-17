// Fetches the games pinned in games.json into public/play/<slug>/, which Vite
// copies into the build and nginx serves at /play/<slug>/.
//
// Each game is built and released by its own repository (see games.mjs). This
// downloads each pinned archive once, keeps it in node_modules/.cache/games/,
// checks its SHA-256, and unpacks it in place of whatever was in the game's
// folder. A game whose installed copy already matches its pin is left alone,
// so running this again is quick, and a folder under public/play/ that
// games.json no longer pins is deleted.
//
//   node tools/fetch-games.mjs [--optional] [--force]
//
//   --optional  Warn instead of failing when a game can't be fetched, so
//               `yarn start` still starts offline.
//   --force     Download and unpack every game again.
//
// `yarn start` and `yarn build` run it first, so the Docker build fetches the
// games too.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import * as tar from "tar";
import { readManifest, releaseUrl } from "./games.mjs";

/** @import { GameBuild } from "./games.mjs" */

const frontendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const playDir = path.join(frontendDir, "public", "play");
const cacheDir = path.join(frontendDir, "node_modules", ".cache", "games");
// Which archive is unpacked in each game's folder, by slug.
const installedFile = path.join(cacheDir, "installed.json");

// A release's files can answer 404 for a little while after they are
// uploaded, so a 404 is tried again as well as a network error or a 5xx,
// for about half a minute in all.
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

const { values: options } = parseArgs({
  options: {
    optional: { type: "boolean" },
    force: { type: "boolean" },
  },
});

/**
 * Prints a line of progress.
 *
 * @param {string} message
 */
function log(message) {
  console.log(`fetch-games: ${message}`);
}

/**
 * Returns the SHA-256 of each archive installed, by slug.
 *
 * @returns {Record<string, string>}
 */
function readInstalled() {
  try {
    return JSON.parse(fs.readFileSync(installedFile, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Returns the SHA-256 of some data, in hex.
 *
 * @param {Buffer} data
 * @returns {string}
 */
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

/**
 * Downloads a file, trying again when that might help.
 *
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
async function download(url) {
  for (let attempt = 0; ; attempt++) {
    let failure;
    let retry = true;
    try {
      const response = await fetch(url);
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      failure = `HTTP ${response.status}`;
      // Any other 4xx won't change by asking again.
      retry = response.status === 404 || response.status >= 500;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    if (!retry || attempt === RETRY_DELAYS_MS.length) throw new Error(failure);
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

/**
 * Returns the path of the pinned archive, downloading it if needed.
 *
 * @param {GameBuild} game
 * @returns {Promise<string>}
 */
async function archiveFor(game) {
  const file = path.join(cacheDir, `${game.sha256}.tar.gz`);
  if (fs.existsSync(file) && sha256(fs.readFileSync(file)) === game.sha256) {
    return file;
  }
  const url = releaseUrl(game.repo, game.asset);
  let data;
  try {
    data = await download(url);
  } catch (error) {
    throw new Error(
      `couldn't download ${url}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  const actual = sha256(data);
  if (actual !== game.sha256) {
    throw new Error(
      `${url} has SHA-256 ${actual}, but games.json pins ${game.sha256}.`,
    );
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(file, data);
  return file;
}

/**
 * Unpacks a game's pinned archive into its folder, replacing what was there.
 *
 * @param {string} slug
 * @param {GameBuild} game
 */
async function install(slug, game) {
  const gameDir = path.join(playDir, slug);
  const file = await archiveFor(game);
  fs.rmSync(gameDir, { recursive: true, force: true });
  fs.mkdirSync(gameDir, { recursive: true });
  await tar.x({ file, cwd: gameDir, strict: true });
  if (!fs.existsSync(path.join(gameDir, "index.html"))) {
    throw new Error(`${game.asset} has no index.html at its top level.`);
  }
}

/**
 * Deletes the folders under public/play/ that games.json doesn't pin.
 *
 * @param {Record<string, GameBuild>} manifest
 * @param {Record<string, string>} installed Forgets each game it deletes.
 */
function removeUnpinned(manifest, installed) {
  if (!fs.existsSync(playDir)) return;
  for (const entry of fs.readdirSync(playDir, { withFileTypes: true })) {
    if (entry.name in manifest) continue;
    fs.rmSync(path.join(playDir, entry.name), { recursive: true, force: true });
    delete installed[entry.name];
    log(`removed ${entry.name}, which games.json no longer pins`);
  }
}

async function main() {
  const manifest = readManifest();
  const installed = options.force ? {} : readInstalled();
  /** @type {string[]} */
  const failures = [];

  removeUnpinned(manifest, installed);

  for (const [slug, game] of Object.entries(manifest)) {
    const name = `${slug} (${game.asset})`;
    if (
      installed[slug] === game.sha256 &&
      fs.existsSync(path.join(playDir, slug, "index.html"))
    ) {
      log(`${name} is up to date`);
      continue;
    }
    try {
      await install(slug, game);
      installed[slug] = game.sha256;
      log(`installed ${name}`);
    } catch (error) {
      delete installed[slug];
      failures.push(
        `${slug}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(installedFile, `${JSON.stringify(installed, null, 2)}\n`);

  if (failures.length === 0) return;
  const report = failures.map((failure) => `  ${failure}`).join("\n");
  if (options.optional) {
    console.warn(`fetch-games: some games are missing:\n${report}`);
    return;
  }
  console.error(`fetch-games: couldn't fetch every game:\n${report}`);
  process.exitCode = 1;
}

await main();
