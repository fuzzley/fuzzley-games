// The games' builds, as pinned in games.json. Shared by fetch-games.mjs,
// update-games.mjs, inject-analytics.mjs and vite.config.ts.
//
// Each game's repository uploads every production build to its site-build
// release as <slug>-<short sha>.tar.gz, and replaces latest.json there, which
// names the newest archive. games.json pins one archive per game, which is
// served at /play/<slug>/:
//
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
 * @typedef {object} GameBuild
 * @property {string} repo Such as "fuzzley/fSolitaire".
 * @property {string} commit The commit it was built from.
 * @property {string} asset The archive's name on the release.
 * @property {string} sha256 The archive's SHA-256.
 */

/** @type {Record<keyof GameBuild, RegExp>} */
const patterns = {
  repo: /^[\w.-]+\/[\w.-]+$/,
  commit: /^[0-9a-f]{40}$/,
  asset: /^[\w.-]+\.tar\.gz$/,
  sha256: /^[0-9a-f]{64}$/,
};

/**
 * Returns a games.json entry, or a latest.json, after checking that every
 * field is in the expected form.
 *
 * @param {string} name What to call it in the error.
 * @param {unknown} game
 * @returns {GameBuild}
 */
export function checkGame(name, game) {
  for (const [field, pattern] of Object.entries(patterns)) {
    const value =
      typeof game === "object" && game !== null
        ? /** @type {Record<string, unknown>} */ (game)[field]
        : undefined;
    if (typeof value !== "string" || !pattern.test(value)) {
      throw new Error(`${name}: "${field}" is missing or malformed.`);
    }
  }
  return /** @type {GameBuild} */ (game);
}

/**
 * Returns the pinned games, by slug.
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
 * Writes the pinned games back to games.json.
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
