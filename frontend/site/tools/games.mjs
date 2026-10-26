// The games' builds, as games.json lists them. Shared by copy-games.mjs,
// inject-analytics.mjs and vite-plugins.ts.
//
// Every game is built here, in a workspace under games/. games.json names each
// one's workspace, by the slug its build is served at, /play/<slug>/:
//
//   "minesweeper": { "workspace": "games/minesweeper" }

import fs from "node:fs";

const manifestFile = new URL("../games.json", import.meta.url);

/**
 * @typedef {object} GameBuild A build of a game in this repository.
 * @property {string} workspace Its folder in frontend/, such as
 *   "games/minesweeper".
 */

// frontend/package.json, the workspace root's, makes every folder under games/
// a workspace.
const workspacePattern = /^games\/[\w-]+$/;

/**
 * Returns a games.json entry after checking it.
 *
 * @param {string} name What to call it in the error.
 * @param {unknown} game
 * @returns {GameBuild}
 */
export function checkGame(name, game) {
  const { workspace, ...rest } =
    typeof game === "object" && game !== null
      ? /** @type {Record<string, unknown>} */ (game)
      : {};
  if (typeof workspace !== "string" || !workspacePattern.test(workspace)) {
    throw new Error(`${name}: "workspace" isn't a folder under games/.`);
  }
  if (Object.keys(rest).length > 0) {
    throw new Error(`${name}: an entry names its workspace and nothing else.`);
  }
  return { workspace };
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
