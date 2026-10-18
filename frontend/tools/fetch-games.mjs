// Puts the games games.json lists into public/play/<slug>/, which Vite copies
// into the build and nginx serves at /play/<slug>/.
//
// A game built here is copied from its workspace's dist/, which
// `yarn build:apps` makes, every time. A game released by its own repository
// (see games.mjs) is fetched: this downloads each pinned archive once, keeps
// it in node_modules/.cache/games/, checks its SHA-256, and unpacks it in
// place of whatever was in the game's folder. A game whose installed copy
// already matches its pin is left alone, so running this again is quick. A
// folder under public/play/ that games.json no longer lists is deleted.
//
//   node tools/fetch-games.mjs [--optional] [--force]
//
//   --optional  Warn instead of failing when a game can't be fetched or
//               copied, so `yarn start` still starts offline.
//   --force     Download and unpack every pinned game again.
//
// `yarn start` and `yarn build` build the workspaces and run it first, so the
// Docker build fetches the games too.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import * as tar from "tar";
import { isPinned, readManifest, releaseUrl } from "./games.mjs";
import { FRONTEND_DIR, errorMessage, logger } from "./script.mjs";

/** @import { GameBuild, PinnedBuild } from "./games.mjs" */

const playDir = path.join(FRONTEND_DIR, "public", "play");
const cacheDir = path.join(FRONTEND_DIR, "node_modules", ".cache", "games");
// Which archive is unpacked in each game's folder, by slug.
const installedFile = path.join(cacheDir, "installed.json");

// A release's files can answer 404 for a little while after they are
// uploaded, so a 404 is tried again as well as a network error or a 5xx,
// for about half a minute in all.
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

const log = logger("fetch-games");

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
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchFile]
 * @param {readonly number[]} [options.delays] How long to wait before each
 *   retry, in milliseconds.
 * @returns {Promise<Buffer>}
 */
export async function download(
  url,
  { fetchFile = fetch, delays = RETRY_DELAYS_MS } = {},
) {
  for (let attempt = 0; ; attempt++) {
    let failure;
    let retry = true;
    try {
      const response = await fetchFile(url);
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      failure = `HTTP ${response.status}`;
      // Any other 4xx won't change by asking again.
      retry = response.status === 404 || response.status >= 500;
    } catch (error) {
      failure = errorMessage(error);
    }
    const delay = delays[attempt];
    if (!retry || delay === undefined) throw new Error(failure);
    await sleep(delay);
  }
}

/**
 * Returns the path of the pinned archive, downloading it if needed.
 *
 * @param {PinnedBuild} game
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
    throw new Error(`couldn't download ${url}: ${errorMessage(error)}`, {
      cause: error,
    });
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
 * @param {PinnedBuild} game
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
 * Copies a workspace's build into a game's folder, replacing what was there.
 *
 * @param {string} build The workspace's dist/.
 * @param {string} gameDir
 */
export function copyBuild(build, gameDir) {
  if (!fs.existsSync(path.join(build, "index.html"))) {
    throw new Error(
      `${build} has no index.html. Run \`yarn build:apps\` to build it.`,
    );
  }
  fs.rmSync(gameDir, { recursive: true, force: true });
  fs.cpSync(build, gameDir, { recursive: true });
}

/**
 * Deletes the folders in a games directory, such as public/play/, that
 * games.json doesn't list.
 *
 * @param {string} dir
 * @param {Record<string, GameBuild>} manifest
 * @param {Record<string, string>} installed Forgets each game it deletes.
 */
export function removeUnpinned(dir, manifest, installed) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name in manifest) continue;
    fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
    delete installed[entry.name];
    log(`removed ${entry.name}, which games.json no longer lists`);
  }
}

async function main() {
  const { values: options } = parseArgs({
    options: {
      optional: { type: "boolean" },
      force: { type: "boolean" },
    },
  });
  const manifest = readManifest();
  const installed = options.force ? {} : readInstalled();
  /** @type {string[]} */
  const failures = [];

  removeUnpinned(playDir, manifest, installed);

  for (const [slug, game] of Object.entries(manifest)) {
    if (!isPinned(game)) {
      // Its build changes without its entry changing, so there is no
      // installed copy to trust.
      delete installed[slug];
      try {
        copyBuild(
          path.join(FRONTEND_DIR, game.workspace, "dist"),
          path.join(playDir, slug),
        );
        log(`copied ${slug} from ${game.workspace}`);
      } catch (error) {
        failures.push(`${slug}: ${errorMessage(error)}`);
      }
      continue;
    }

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
      failures.push(`${slug}: ${errorMessage(error)}`);
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

if (import.meta.main) await main();
