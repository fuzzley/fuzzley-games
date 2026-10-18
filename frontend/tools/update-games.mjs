// Moves each game's pin in games.json to the newest build on its site-build
// release, as named by that release's latest.json (see games.mjs). A game
// built here, in a workspace, has no pin and is left alone.
//
//   node tools/update-games.mjs
//
// It only edits games.json. The scheduled workflow update-games.yml then
// builds the site, checks the image and commits. Environment:
//
//   SKIP_ASSETS    Archives not to move to, one per line: those whose update
//                  already failed (the workflow passes the archives named by
//                  open "Game update failed" issues).
//   GITHUB_OUTPUT  Set by GitHub Actions. Gets `changed` (true or false),
//                  `assets` (the new archives, one per line) and `message`
//                  (a commit message).

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import {
  checkPin,
  isPinned,
  readManifest,
  releaseUrl,
  writeManifest,
} from "./games.mjs";
import { errorMessage, logger } from "./script.mjs";

/** @import { PinnedBuild } from "./games.mjs" */

/**
 * @typedef {PinnedBuild & {built: string}} LatestBuild
 *   A release's latest.json, with the repository it came from.
 */

/**
 * @typedef {object} Change
 * @property {string} slug
 * @property {PinnedBuild} from
 * @property {PinnedBuild} to
 */

/**
 * @typedef {{move: PinnedBuild} | {stay: string}} Plan
 *   What to do with a pin: move it to a build, or leave it, and why.
 */

// A release's files can answer 404 for a little while after they are
// uploaded, so a build is left for the next run until it is this old.
const SETTLE_MS = 2 * 60 * 1000;

const log = logger("update-games");

/**
 * Returns the archives not to move to, from SKIP_ASSETS' lines.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
export function parseSkipList(text) {
  return new Set(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

/**
 * Returns the newest build on a repository's release, or null if it has none.
 *
 * @param {string} repo
 * @param {typeof fetch} [fetchFile]
 * @returns {Promise<LatestBuild | null>}
 */
export async function latestBuild(repo, fetchFile = fetch) {
  const url = releaseUrl(repo, "latest.json");
  const response = await fetchFile(url);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  // Not trusted yet: checkPin and the check below vouch for the fields.
  const body = /** @type {Record<string, unknown>} */ (await response.json());
  /** @type {Record<string, unknown>} */
  const latest = { ...body, repo };
  checkPin(`${repo}'s latest.json`, latest);
  if (typeof latest["built"] !== "string") {
    throw new Error(`${repo}'s latest.json: "built" is missing.`);
  }
  return /** @type {LatestBuild} */ (latest);
}

/**
 * Returns what to do with a game's pin, given the newest build on its
 * release.
 *
 * @param {PinnedBuild} pinned
 * @param {LatestBuild | null} latest
 * @param {ReadonlySet<string>} skip Archives whose update already failed.
 * @param {number} now Milliseconds since the epoch.
 * @returns {Plan}
 */
export function planUpdate(pinned, latest, skip, now) {
  if (!latest) return { stay: `${pinned.repo} has no latest.json yet` };
  if (latest.asset === pinned.asset) {
    return { stay: `up to date (${pinned.asset})` };
  }
  if (skip.has(latest.asset)) {
    return { stay: `skipping ${latest.asset}, whose update already failed` };
  }
  if (now - Date.parse(latest.built) < SETTLE_MS) {
    return { stay: `${latest.asset} is under two minutes old; next run` };
  }
  const { repo, commit, asset, sha256 } = latest;
  return { move: { repo, commit, asset, sha256 } };
}

/**
 * Returns a commit's short form.
 *
 * @param {string} commit
 * @returns {string}
 */
const short = (commit) => commit.slice(0, 7);

/**
 * Returns the commit message for moving some pins.
 *
 * @param {Change[]} changes At least one.
 * @returns {string}
 */
export function commitMessage(changes) {
  const [first] = changes;
  const subject =
    changes.length === 1 && first
      ? `chore(games): update ${first.slug} to ${first.to.repo}@${short(first.to.commit)}`
      : `chore(games): update ${changes.map((c) => c.slug).join(", ")}`;
  const lines = changes.map(
    ({ slug, from, to }) =>
      `- ${slug}: ${to.asset}, ` +
      `https://github.com/${to.repo}/compare/${short(from.commit)}...${short(to.commit)}`,
  );
  return [
    subject,
    "",
    ...lines,
    "",
    "Pinned by .github/workflows/update-games.yml after the site built.",
  ].join("\n");
}

/**
 * Writes a GitHub Actions step output, allowing several lines.
 *
 * @param {string} name
 * @param {string} value
 */
function output(name, value) {
  const file = process.env["GITHUB_OUTPUT"];
  if (!file) return;
  const delimiter = `EOF_${randomUUID()}`;
  fs.appendFileSync(file, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

async function main() {
  const skip = parseSkipList(process.env["SKIP_ASSETS"] ?? "");
  const manifest = readManifest();
  /** @type {Change[]} */
  const changes = [];

  for (const [slug, game] of Object.entries(manifest)) {
    if (!isPinned(game)) {
      log(`${slug}: built here from ${game.workspace}`);
      continue;
    }
    let latest;
    try {
      latest = await latestBuild(game.repo);
    } catch (error) {
      // The next run tries again; the other games needn't wait.
      console.log(`::warning::update-games: ${slug}: ${errorMessage(error)}`);
      continue;
    }
    const plan = planUpdate(game, latest, skip, Date.now());
    if ("stay" in plan) {
      log(`${slug}: ${plan.stay}`);
      continue;
    }
    log(`${slug}: ${game.asset} -> ${plan.move.asset}`);
    changes.push({ slug, from: game, to: plan.move });
    manifest[slug] = plan.move;
  }

  output("changed", String(changes.length > 0));
  if (changes.length === 0) return;
  writeManifest(manifest);
  output("message", commitMessage(changes));
  output("assets", changes.map(({ to }) => to.asset).join("\n"));
}

if (import.meta.main) await main();
