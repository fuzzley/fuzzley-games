// Moves each game's pin in games.json to the newest build on its site-build
// release, as named by that release's latest.json (see games.mjs).
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
  checkGame,
  readManifest,
  releaseUrl,
  writeManifest,
} from "./games.mjs";

/** @import { GameBuild } from "./games.mjs" */

/**
 * @typedef {GameBuild & {built: string}} LatestBuild
 *   A release's latest.json, with the repository it came from.
 */

/**
 * @typedef {object} Change
 * @property {string} slug
 * @property {GameBuild} from
 * @property {GameBuild} to
 */

const skip = new Set(
  (process.env["SKIP_ASSETS"] ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
);

// A release's files can answer 404 for a little while after they are
// uploaded, so a build is left for the next run until it is this old.
const SETTLE_MS = 2 * 60 * 1000;

/**
 * Prints a line of progress.
 *
 * @param {string} message
 */
function log(message) {
  console.log(`update-games: ${message}`);
}

/**
 * Returns the newest build on a repository's release, or null if it has none.
 *
 * @param {string} repo
 * @returns {Promise<LatestBuild | null>}
 */
async function latestBuild(repo) {
  const url = releaseUrl(repo, "latest.json");
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  // Not trusted yet: checkGame and the check below vouch for the fields.
  const body = /** @type {Record<string, unknown>} */ (await response.json());
  /** @type {Record<string, unknown>} */
  const latest = { ...body, repo };
  checkGame(`${repo}'s latest.json`, latest);
  if (typeof latest["built"] !== "string") {
    throw new Error(`${repo}'s latest.json: "built" is missing.`);
  }
  return /** @type {LatestBuild} */ (latest);
}

/**
 * Returns a commit's short form.
 *
 * @param {string} commit
 * @returns {string}
 */
const short = (commit) => commit.slice(0, 7);

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

const manifest = readManifest();
/** @type {Change[]} */
const changes = [];

for (const [slug, game] of Object.entries(manifest)) {
  let latest;
  try {
    latest = await latestBuild(game.repo);
  } catch (error) {
    // The next run tries again; the other games needn't wait.
    const message = error instanceof Error ? error.message : String(error);
    console.log(`::warning::update-games: ${slug}: ${message}`);
    continue;
  }
  if (!latest) {
    log(`${slug}: ${game.repo} has no latest.json yet`);
  } else if (latest.asset === game.asset) {
    log(`${slug}: up to date (${game.asset})`);
  } else if (skip.has(latest.asset)) {
    log(`${slug}: skipping ${latest.asset}, whose update already failed`);
  } else if (Date.now() - Date.parse(latest.built) < SETTLE_MS) {
    log(`${slug}: ${latest.asset} is under two minutes old; next run`);
  } else {
    log(`${slug}: ${game.asset} -> ${latest.asset}`);
    const to = {
      repo: latest.repo,
      commit: latest.commit,
      asset: latest.asset,
      sha256: latest.sha256,
    };
    changes.push({ slug, from: game, to });
    manifest[slug] = to;
  }
}

output("changed", String(changes.length > 0));
if (changes.length > 0) {
  writeManifest(manifest);

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
  output(
    "message",
    [
      subject,
      "",
      ...lines,
      "",
      "Pinned by .github/workflows/update-games.yml after the site built.",
    ].join("\n"),
  );
  output("assets", changes.map(({ to }) => to.asset).join("\n"));
}
