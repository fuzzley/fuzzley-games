// The games' builds, as games.json lists them. Shared by fetch-games.mjs,
// update-games.mjs, inject-analytics.mjs and vite.config.ts.
//
// A game is either built here, in a workspace under apps/, or built and
// released by its own repository. Such a repository uploads every production
// build to its site-build release as <slug>-<short sha>.tar.gz, and replaces
// latest.json there, which names the newest archive. games.json names each
// game's workspace, or pins one archive, and the build is served at
// /play/<slug>/:
//
//   "minesweeper": { "workspace": "apps/minesweeper" },
//   "solitaire": {
//     "repo": "fuzzley/fSolitaire",
//     "commit": "<the commit it was built from>",
//     "asset": "solitaire-a4d7808.tar.gz",
//     "sha256": "<the archive's SHA-256>"
//   }
//
// fuzzley.info (fuzzley/fuzzley) pins its games the same way.

import fs from "node:fs";

/** The release each game's repository uploads its builds to. */
export const RELEASE_TAG = "site-build";

const manifestFile = new URL("../games.json", import.meta.url);

/**
 * @typedef {object} PinnedBuild A build from a game's own repository.
 * @property {string} repo Such as "fuzzley/fSolitaire".
 * @property {string} commit The commit it was built from.
 * @property {string} asset The archive's name on the release.
 * @property {string} sha256 The archive's SHA-256.
 */

/**
 * @typedef {object} WorkspaceBuild A build of a game in this repository.
 * @property {string} workspace Its folder in frontend/, such as
 *   "apps/minesweeper".
 */

/** @typedef {PinnedBuild | WorkspaceBuild} GameBuild */

/** @type {Record<keyof PinnedBuild, RegExp>} */
const patterns = {
  repo: /^[\w.-]+\/[\w.-]+$/,
  commit: /^[0-9a-f]{40}$/,
  asset: /^[\w.-]+\.tar\.gz$/,
  sha256: /^[0-9a-f]{64}$/,
};

// frontend/package.json, the workspace root's, makes every folder under apps/
// a workspace.
const workspacePattern = /^apps\/[\w-]+$/;

/**
 * Returns a pinned build, such as a games.json entry or a latest.json, after
 * checking that every field is in the expected form.
 *
 * @param {string} name What to call it in the error.
 * @param {unknown} build
 * @returns {PinnedBuild}
 */
export function checkPin(name, build) {
  for (const [field, pattern] of Object.entries(patterns)) {
    const value =
      typeof build === "object" && build !== null
        ? /** @type {Record<string, unknown>} */ (build)[field]
        : undefined;
    if (typeof value !== "string" || !pattern.test(value)) {
      throw new Error(`${name}: "${field}" is missing or malformed.`);
    }
  }
  return /** @type {PinnedBuild} */ (build);
}

/**
 * Returns a games.json entry, a workspace or a pin, after checking it.
 *
 * @param {string} name What to call it in the error.
 * @param {unknown} game
 * @returns {GameBuild}
 */
export function checkGame(name, game) {
  if (typeof game !== "object" || game === null || !("workspace" in game)) {
    return checkPin(name, game);
  }
  const { workspace, ...rest } = /** @type {Record<string, unknown>} */ (game);
  if (typeof workspace !== "string" || !workspacePattern.test(workspace)) {
    throw new Error(`${name}: "workspace" isn't a folder under apps/.`);
  }
  if (Object.keys(rest).length > 0) {
    throw new Error(`${name}: a game built here pins no release as well.`);
  }
  return { workspace };
}

/**
 * Returns whether a game's build comes from its repository's release, rather
 * than from a workspace here.
 *
 * @param {GameBuild} game
 * @returns {game is PinnedBuild}
 */
export function isPinned(game) {
  return !("workspace" in game);
}

/**
 * Returns the games' builds, by slug.
 *
 * @returns {Record<string, GameBuild>}
 */
export function readManifest() {
  /** @type {Record<string, unknown>} */
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  /** @type {Record<string, GameBuild>} */
  const games = {};
  for (const [slug, game] of Object.entries(manifest)) {
    games[slug] = checkGame(`games.json: ${slug}`, game);
  }
  return games;
}

/**
 * Writes the games' builds back to games.json.
 *
 * @param {Record<string, GameBuild>} manifest
 */
export function writeManifest(manifest) {
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Returns the address of a file on a game's site-build release. These
 * download URLs don't count against GitHub's API rate limit.
 *
 * @param {string} repo Such as "fuzzley/fSolitaire".
 * @param {string} file Such as "latest.json".
 * @returns {string}
 */
export function releaseUrl(repo, file) {
  return `https://github.com/${repo}/releases/download/${RELEASE_TAG}/${file}`;
}
