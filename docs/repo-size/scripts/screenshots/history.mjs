#!/usr/bin/env node
/**
 * Counts the screenshots in the repository's history: which commits added
 * them, how many blobs each added, and how many bytes, by game, by folder and
 * by format, and when the served images went from PNG to WebP.
 *
 *   node docs/repo-size/scripts/screenshots/history.mjs [git-dir] [rev ...]
 *
 * With no arguments it reads this worktree's repository at
 * `--remotes=origin`, which is what a normal clone holds. Given the history
 * research's untouched mirror and `--all`, it reads every ref GitHub holds,
 * pull requests' included. A blob counts once, at the first commit, oldest
 * first, whose diff adds it at a screenshot's path; its size on disk is the
 * size `git cat-file` gives in the pack it is read from.
 *
 * Writes, into `docs/repo-size/data/screenshots/` and named after the label
 * given in `$LABEL` (default `origin`):
 *   history-<label>-summary.txt   the totals
 *   history-<label>-commits.tsv   one line for each commit that added a screenshot
 *   history-<label>-monthly.tsv   bytes added each month, by game and folder
 *   history-<label>-docs.tsv      images under a docs folder that aren't screenshots
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const DATA = join(REPO, "docs/repo-size/data/screenshots");
const LABEL = process.env.LABEL ?? "origin";
const IMAGE = /\.(png|webp|jpe?g|gif|avif)$/i;
const MIB = 1024 * 1024;

const [gitDirArg, ...revArgs] = process.argv.slice(2);
const GIT_DIR = gitDirArg ?? execGit(["rev-parse", "--git-common-dir"], REPO);
const REVS = revArgs.length > 0 ? revArgs : ["--remotes=origin"];

/**
 * Runs git and returns what it printed.
 *
 * @param {string[]} args
 * @param {string} [cwd]
 * @param {string} [input]
 * @returns {string}
 */
function execGit(args, cwd = REPO, input) {
  return execFileSync("git", args, {
    cwd,
    input,
    maxBuffer: 1024 * MIB,
    encoding: "utf8",
  }).trim();
}

/**
 * Runs git on the repository being read.
 *
 * @param {string[]} args
 * @param {string} [input]
 * @returns {string}
 */
function git(args, input) {
  return execGit(["--git-dir", GIT_DIR, ...args], REPO, input);
}

/**
 * What a path holds: a screenshot of a game, in the folder its build serves
 * or the one that keeps the lossless originals, or another image in a docs
 * folder, or nothing this script counts.
 *
 * @typedef {{kind: "screenshot", game: string, part: "public" | "originals" | "other", file: string}
 *   | {kind: "docs-image", folder: string, use: string}
 *   | {kind: "none"}} PathKind
 */

/**
 * Says what a path holds.
 *
 * @param {string} path
 * @returns {PathKind}
 */
function classify(path) {
  if (!IMAGE.test(path)) return { kind: "none" };
  const shot = path.match(
    /^frontend\/(?:games|apps)\/([^/]+)\/(public\/)?docs\/screenshots\/(.+)$/,
  );
  if (shot) {
    const [, game = "", isPublic, rest = ""] = shot;
    return {
      kind: "screenshot",
      game,
      part: isPublic ? "public" : "originals",
      file: rest.split("/").pop() ?? rest,
    };
  }
  if (/(^|\/)screenshots\//.test(path)) {
    return { kind: "screenshot", game: "?", part: "other", file: path };
  }
  const docs = path.match(
    /^(docs(?:\/.*)?|frontend\/(?:games|apps)\/[^/]+\/docs(?:\/.*)?)\/[^/]+$/,
  );
  if (docs) {
    return { kind: "docs-image", folder: docs[1] ?? "", use: docsUse(path) };
  }
  return { kind: "none" };
}

/**
 * Says what an image in a docs folder is for, from its path: a capture of a
 * game kept beside a plan, a mock made for one, or the art, sound or study a
 * plan made.
 *
 * @param {string} path
 * @returns {string}
 */
function docsUse(path) {
  if (/\/before\.webp$|snake-qa-|\/mocks\/(shots|preview)\//.test(path)) {
    return "game capture kept in a plan";
  }
  if (/\/mocks\//.test(path)) return "plan mock";
  if (/\/art\/preview\//.test(path)) return "art contact sheet";
  if (/\/sound\/sheets\//.test(path)) return "sound sheet";
  if (/\/assets\/art\//.test(path)) return "generated art asset";
  if (/card-sharpness/.test(path)) return "card sharpness study";
  return "other";
}

/**
 * A commit, oldest first, with the images its diff adds or changes.
 *
 * @typedef {{hash: string, date: string, subject: string,
 *   changes: {blob: string, status: string, path: string}[]}} Commit
 */

/**
 * Reads every non-merge commit the revisions reach, oldest first, with the
 * blobs its diff adds, changes or deletes at an image's path.
 *
 * @returns {Commit[]}
 */
function readCommits() {
  const out = git([
    "log",
    "--reverse",
    "--no-merges",
    "--raw",
    "--no-abbrev",
    "--no-renames",
    "--format=@@%H%x09%cI%x09%s",
    ...REVS,
  ]);
  /** @type {Commit[]} */
  const commits = [];
  for (const line of out.split("\n")) {
    if (line.startsWith("@@")) {
      const [hash = "", date = "", ...subject] = line.slice(2).split("\t");
      commits.push({ hash, date, subject: subject.join("\t"), changes: [] });
    } else if (line.startsWith(":")) {
      const [meta = "", path = ""] = line.split("\t");
      const [, , oldBlob, newBlob, status = ""] = meta.split(" ");
      if (!IMAGE.test(path)) continue;
      const blob = status === "D" ? oldBlob : newBlob;
      commits.at(-1)?.changes.push({ blob: blob ?? "", status, path });
    }
  }
  return commits;
}

/**
 * Returns each blob's size and size on disk.
 *
 * @param {Iterable<string>} blobs
 * @returns {Map<string, {size: number, disk: number}>}
 */
function sizesOf(blobs) {
  const out = git(
    [
      "cat-file",
      "--batch-check=%(objectname) %(objectsize) %(objectsize:disk)",
    ],
    [...blobs].join("\n") + "\n",
  );
  /** @type {Map<string, {size: number, disk: number}>} */
  const sizes = new Map();
  for (const line of out.split("\n")) {
    const [blob = "", size, disk] = line.split(" ");
    sizes.set(blob, { size: Number(size), disk: Number(disk) });
  }
  return sizes;
}

/**
 * Returns a size in MiB, to two places.
 *
 * @param {number} bytes
 * @returns {string}
 */
function mib(bytes) {
  return (bytes / MIB).toFixed(2);
}

/**
 * Adds a blob's sizes to a running total, made on first use.
 *
 * @param {Map<string, {blobs: number, size: number, disk: number}>} totals
 * @param {string} key
 * @param {{size: number, disk: number}} sizes
 */
function addTo(totals, key, { size, disk }) {
  const total = totals.get(key) ?? { blobs: 0, size: 0, disk: 0 };
  total.blobs += 1;
  total.size += size;
  total.disk += disk;
  totals.set(key, total);
}

/**
 * Sorts a running total's keys and prints one tab-separated line for each.
 *
 * @param {Map<string, {blobs: number, size: number, disk: number}>} totals
 * @returns {string[]}
 */
function totalLines(totals) {
  return [...totals]
    .sort(([, a], [, b]) => b.disk - a.disk)
    .map(
      ([key, { blobs, size, disk }]) =>
        `${key}\t${blobs}\t${mib(size)}\t${mib(disk)}`,
    );
}

const commits = readCommits();
const allBlobs = new Set(
  commits.flatMap((commit) => commit.changes.map((change) => change.blob)),
);
const sizes = sizesOf(allBlobs);

/** @type {Set<string>} */
const seen = new Set();
/** The blobs first added as screenshots. */
const shotBlobs = new Set();
/** Images in a docs folder whose blob was a screenshot first, which cost nothing more. */
const copiedIntoDocs = new Set();
/** The commits that added a screenshot, with what they added. */
const shotCommits = [];
/** @type {Map<string, {blobs: number, size: number, disk: number}>} */
const byGamePart = new Map();
/** @type {Map<string, {blobs: number, size: number, disk: number}>} */
const byGamePartExt = new Map();
/** @type {Map<string, {blobs: number, size: number, disk: number}>} */
const byExt = new Map();
/** @type {Map<string, {blobs: number, size: number, disk: number}>} */
const byMonth = new Map();
/** @type {Map<string, {blobs: number, size: number, disk: number}>} */
const byDocsFolder = new Map();
/** @type {Map<string, {blobs: number, size: number, disk: number}>} */
const byDocsUse = new Map();
/** @type {Map<string, {blobs: number, size: number, disk: number}>} */
const byGamePartFile = new Map();
/** @type {Map<string, Set<string>>} */
const commitsByGamePart = new Map();
/** @type {Map<string, {first: string, last: string}>} */
const formatDates = new Map();
/** @type {{date: string, hash: string, path: string, subject: string}[]} */
const deletions = [];

for (const commit of commits) {
  /** @type {Map<string, {blobs: number, size: number, disk: number, exts: Set<string>}>} */
  const added = new Map();
  for (const change of commit.changes) {
    const what = classify(change.path);
    if (what.kind === "none") continue;
    if (change.status === "D") {
      if (what.kind === "screenshot") {
        deletions.push({
          date: commit.date,
          hash: commit.hash,
          path: change.path,
          subject: commit.subject,
        });
      }
      continue;
    }
    if (seen.has(change.blob)) {
      if (what.kind === "docs-image" && shotBlobs.has(change.blob)) {
        copiedIntoDocs.add(`${change.path}\t${change.blob.slice(0, 8)}`);
      }
      continue;
    }
    if (what.kind === "screenshot") shotBlobs.add(change.blob);
    seen.add(change.blob);
    const blobSizes = sizes.get(change.blob) ?? { size: 0, disk: 0 };
    if (what.kind === "docs-image") {
      addTo(byDocsFolder, `${what.use}\t${what.folder}`, blobSizes);
      addTo(byDocsUse, what.use, blobSizes);
      continue;
    }
    const ext = (change.path.match(IMAGE)?.[1] ?? "").toLowerCase();
    const gamePart = `${what.game}\t${what.part}`;
    addTo(byGamePart, gamePart, blobSizes);
    addTo(byGamePartExt, `${gamePart}\t${ext}`, blobSizes);
    addTo(byExt, ext, blobSizes);
    addTo(
      byGamePartFile,
      `${gamePart}\t${what.file.replace(IMAGE, "")}\t${ext}`,
      blobSizes,
    );
    addTo(byMonth, `${commit.date.slice(0, 7)}\t${gamePart}`, blobSizes);
    const set = commitsByGamePart.get(gamePart) ?? new Set();
    set.add(commit.hash);
    commitsByGamePart.set(gamePart, set);
    const formatKey = `${gamePart}\t${ext}`;
    const dates = formatDates.get(formatKey);
    formatDates.set(formatKey, {
      first:
        dates?.first ??
        `${commit.date.slice(0, 10)} ${commit.hash.slice(0, 8)}`,
      last: `${commit.date.slice(0, 10)} ${commit.hash.slice(0, 8)}`,
    });
    const entry = added.get(gamePart) ?? {
      blobs: 0,
      size: 0,
      disk: 0,
      exts: new Set(),
    };
    entry.blobs += 1;
    entry.size += blobSizes.size;
    entry.disk += blobSizes.disk;
    entry.exts.add(ext);
    added.set(gamePart, entry);
  }
  for (const [gamePart, entry] of added) {
    shotCommits.push({ commit, gamePart, ...entry });
  }
}

// Blobs the walk never saw added, which a merge alone may have brought in.
const listed = git(["rev-list", "--objects", ...REVS]);
let unseen = 0;
let unseenDisk = 0;
const unseenBlobs = [];
/**
 * The same blobs by the one path `git rev-list --objects` names for each,
 * which is where the newest commit to hold it keeps it, not where it was
 * first added.
 *
 * @type {Map<string, {blobs: number, size: number, disk: number}>}
 */
const byListedPath = new Map();
for (const line of listed.split("\n")) {
  const space = line.indexOf(" ");
  if (space < 0) continue;
  const blob = line.slice(0, space);
  const what = classify(line.slice(space + 1));
  if (what.kind === "screenshot" && !seen.has(blob)) unseenBlobs.push(blob);
  if (what.kind === "screenshot") {
    addTo(
      byListedPath,
      `${what.game}\t${what.part}`,
      sizes.get(blob) ?? { size: 0, disk: 0 },
    );
  }
}
if (unseenBlobs.length > 0) {
  for (const [, { disk }] of sizesOf(unseenBlobs)) {
    unseen += 1;
    unseenDisk += disk;
  }
}

mkdirSync(DATA, { recursive: true });
const totalShots = [...byGamePart.values()].reduce(
  (sum, t) => ({
    blobs: sum.blobs + t.blobs,
    size: sum.size + t.size,
    disk: sum.disk + t.disk,
  }),
  { blobs: 0, size: 0, disk: 0 },
);
const totalDocs = [...byDocsFolder.values()].reduce(
  (sum, t) => ({
    blobs: sum.blobs + t.blobs,
    size: sum.size + t.size,
    disk: sum.disk + t.disk,
  }),
  { blobs: 0, size: 0, disk: 0 },
);

const summary = [
  `git dir: ${GIT_DIR}`,
  `revisions: ${REVS.join(" ")}`,
  `non-merge commits read: ${commits.length}`,
  "",
  "Screenshot blobs, each counted once, at the commit that first added it:",
  `all\t${totalShots.blobs} blobs\t${mib(totalShots.size)} MiB raw\t${mib(totalShots.disk)} MiB on disk`,
  `screenshot blobs reachable but never added by a non-merge commit: ${unseen} (${mib(unseenDisk)} MiB on disk)`,
  "",
  "By game and folder (game, folder, blobs, MiB raw, MiB on disk, commits that added one):",
  ...totalLines(byGamePart).map(
    (line) =>
      `${line}\t${commitsByGamePart.get(line.split("\t").slice(0, 2).join("\t"))?.size ?? 0}`,
  ),
  "",
  "By game and folder as `git rev-list --objects` names each blob's path (game, folder, blobs, MiB raw, MiB on disk):",
  ...totalLines(byListedPath),
  "",
  "By format (format, blobs, MiB raw, MiB on disk):",
  ...totalLines(byExt),
  "",
  "By game, folder and format (game, folder, format, blobs, MiB raw, MiB on disk):",
  ...totalLines(byGamePartExt),
  "",
  "By game, folder, file and format (game, folder, file, format, blobs, MiB raw, MiB on disk):",
  ...totalLines(byGamePartFile),
  "",
  "First and last commit that added each format (game, folder, format, first, last):",
  ...[...formatDates]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { first, last }]) => `${key}\t${first}\t${last}`),
  "",
  "Commits that deleted screenshots, by commit (date, commit, files deleted, folders, subject):",
  ...Object.values(Object.groupBy(deletions, (d) => d.hash)).map((group) => {
    const first = group?.[0];
    const folders = new Set(
      (group ?? []).map((d) => {
        const what = classify(d.path);
        return what.kind === "screenshot" ? `${what.game}/${what.part}` : "?";
      }),
    );
    return `${first?.date.slice(0, 10)}\t${first?.hash.slice(0, 8)}\t${group?.length}\t${[...folders].join(",")}\t${first?.subject}`;
  }),
  "",
  "Images in docs folders that aren't screenshots (all):",
  `all\t${totalDocs.blobs} blobs\t${mib(totalDocs.size)} MiB raw\t${mib(totalDocs.disk)} MiB on disk`,
  "By use (use, blobs, MiB raw, MiB on disk):",
  ...totalLines(byDocsUse),
  "",
  "Images in docs folders whose blob was a screenshot first, so cost nothing more (path, blob):",
  ...[...copiedIntoDocs].sort(),
];
writeFileSync(
  join(DATA, `history-${LABEL}-summary.txt`),
  summary.join("\n") + "\n",
);

writeFileSync(
  join(DATA, `history-${LABEL}-commits.tsv`),
  [
    "date\tcommit\tgame\tfolder\tblobs added\tKiB raw\tKiB on disk\tformats\tsubject",
    ...shotCommits.map(
      ({ commit, gamePart, blobs, size, disk, exts }) =>
        `${commit.date.slice(0, 10)}\t${commit.hash.slice(0, 8)}\t${gamePart}\t${blobs}\t${Math.round(size / 1024)}\t${Math.round(disk / 1024)}\t${[...exts].sort().join(",")}\t${commit.subject}`,
    ),
  ].join("\n") + "\n",
);

writeFileSync(
  join(DATA, `history-${LABEL}-monthly.tsv`),
  [
    "month\tgame\tfolder\tblobs added\tMiB raw\tMiB on disk",
    ...[...byMonth]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, { blobs, size, disk }]) =>
          `${key}\t${blobs}\t${mib(size)}\t${mib(disk)}`,
      ),
  ].join("\n") + "\n",
);

writeFileSync(
  join(DATA, `history-${LABEL}-docs.tsv`),
  [
    "use\tfolder\tblobs\tMiB raw\tMiB on disk",
    ...totalLines(byDocsFolder),
  ].join("\n") + "\n",
);

console.log(summary.join("\n"));
