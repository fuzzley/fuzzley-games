// Puts the games games.json lists into public/play/<slug>/, which Vite copies
// into the build and nginx serves at /play/<slug>/.
//
// Each game is copied from its workspace's dist/, which the root's
// `yarn build:games` makes, in place of whatever was in the game's folder. A
// folder under public/play/ that games.json no longer lists is deleted.
//
//   node tools/copy-games.mjs [--optional]
//
//   --optional  Warn instead of failing when a game can't be copied, so the
//               site's `yarn start` still starts before the games are built.
//
// The site's `start` and `build` run it first. Run from frontend/, `yarn start`
// and `yarn build` build the workspaces before that, so the Docker build makes
// and copies the games too.

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { readManifest } from "./games.mjs";
import { SITE_DIR, WORKSPACE_ROOT, errorMessage, logger } from "./script.mjs";

/** @import { GameBuild } from "./games.mjs" */

const playDir = path.join(SITE_DIR, "public", "play");

const log = logger("copy-games");

/**
 * Copies a workspace's build into a game's folder, replacing what was there.
 *
 * @param {string} build The workspace's dist/.
 * @param {string} gameDir
 */
export function copyBuild(build, gameDir) {
  if (!fs.existsSync(path.join(build, "index.html"))) {
    throw new Error(
      `${build} has no index.html. Run \`yarn build:games\` in frontend/ to build it.`,
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
 */
export function removeUnlisted(dir, manifest) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name in manifest) continue;
    fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
    log(`removed ${entry.name}, which games.json no longer lists`);
  }
}

function main() {
  const { values: options } = parseArgs({
    options: { optional: { type: "boolean" } },
  });
  const manifest = readManifest();
  /** @type {string[]} */
  const failures = [];

  removeUnlisted(playDir, manifest);

  for (const [slug, game] of Object.entries(manifest)) {
    try {
      copyBuild(
        path.join(WORKSPACE_ROOT, game.workspace, "dist"),
        path.join(playDir, slug),
      );
      log(`copied ${slug} from ${game.workspace}`);
    } catch (error) {
      failures.push(`${slug}: ${errorMessage(error)}`);
    }
  }

  if (failures.length === 0) return;
  const report = failures.map((failure) => `  ${failure}`).join("\n");
  if (options.optional) {
    console.warn(`copy-games: some games are missing:\n${report}`);
    return;
  }
  console.error(`copy-games: couldn't copy every game:\n${report}`);
  process.exitCode = 1;
}

if (import.meta.main) main();
