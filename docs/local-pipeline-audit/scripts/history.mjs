#!/usr/bin/env node
// Says, for each commit on main's first-parent line from the site becoming a
// workspace of its own (b427863e) to the audited commit (1624f87b), which
// workspaces a cache keyed on each workspace's inputs would have to check
// again: those whose files the commit changed, and every workspace
// depending on them; or all of them for a change to any other file of
// frontend/'s, such as the root's package.json, yarn.lock or .yarnrc.yml,
// but the root's own scripts and configs, which only the root's checks
// read. Before b427863e the site lived in frontend/ itself, so its paths
// name no workspace.
//
//   node history.mjs [since] [until] > history.tsv
//
// The workspaces, and what each depends on, are read as `until` holds them.
// Prints a TSV row per commit to stdout (its sha, how many paths it
// changed, how many workspaces it reaches, and what it makes stale), and a
// summary to stderr.
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";

const REPO = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const since = process.argv[2] ?? "b427863e";
const until = process.argv[3] ?? "1624f87b";

/**
 * Returns what a git command prints, run in the repository.
 *
 * @param {...string} args
 * @returns {string}
 */
function git(...args) {
  return execFileSync("git", args, {
    cwd: REPO,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
}

/**
 * A workspace's name and the names of the workspaces it depends on.
 *
 * @typedef {{ name: string, deps: string[] }} Workspace
 */

/** @type {Map<string, Workspace>} Every workspace, by its folder from the repository's root. */
const workspaces = new Map();
const manifests = git(
  "ls-tree",
  "-r",
  "--name-only",
  until,
  "--",
  "frontend/lib",
  "frontend/site",
  "frontend/games",
)
  .split("\n")
  .filter((path) =>
    /^frontend\/(lib\/[^/]+|site|games\/[^/]+)\/package\.json$/.test(path),
  );
for (const file of manifests) {
  const pkg = JSON.parse(git("show", `${until}:${file}`));
  const deps = Object.entries({
    ...pkg.dependencies,
    ...pkg.devDependencies,
  })
    .filter(([, range]) => String(range).startsWith("workspace:"))
    .map(([name]) => name);
  workspaces.set(dirname(file), { name: pkg.name, deps });
}
const byName = new Map([...workspaces].map(([folder, w]) => [w.name, folder]));

/**
 * Returns the folders of a workspace and every workspace depending on it.
 *
 * @param {string} folder
 * @returns {Set<string>}
 */
function dependentsOf(folder) {
  const found = new Set([folder]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [other, { deps }] of workspaces) {
      if (found.has(other)) continue;
      if (deps.some((d) => found.has(byName.get(d) ?? ""))) {
        found.add(other);
        grew = true;
      }
    }
  }
  return found;
}

/**
 * Returns what a changed path makes stale: workspace folders, or "all",
 * "root-lint", "ci-or-image" or "format", the last run every time anyway.
 *
 * @param {string} path
 * @returns {string[]}
 */
function staleOf(path) {
  for (const folder of workspaces.keys()) {
    if (path.startsWith(`${folder}/`)) return [...dependentsOf(folder)];
  }
  if (path.startsWith("docs/") || path.endsWith(".md")) return ["format"];
  if (path.startsWith(".prettier")) return ["format"];
  if (
    path.startsWith(".agents/") ||
    path.startsWith("frontend/tools/") ||
    path === "frontend/eslint.config.js" ||
    path === "frontend/yarn.config.cjs" ||
    path === "frontend/tsconfig.scripts.json"
  ) {
    return ["root-lint"];
  }
  if (path.startsWith(".github/") || /^(Dockerfile|nginx|docker-)/.test(path)) {
    return ["ci-or-image"];
  }
  if (path.startsWith("frontend/")) return ["all"];
  return ["format"];
}

const log = git(
  "log",
  "--first-parent",
  "--no-merges",
  "--name-only",
  "--format=@@%h",
  `${since}..${until}`,
);
/** @type {{ sha: string, paths: number, all: boolean, ws: string[], stale: Set<string> }[]} */
const commits = [];
for (const chunk of log.split("@@").slice(1)) {
  const [sha = "", ...paths] = chunk.split("\n").filter(Boolean);
  const stale = new Set(paths.flatMap(staleOf));
  const all = stale.has("all");
  const ws = all
    ? [...workspaces.keys()]
    : [...stale].filter((s) => workspaces.has(s));
  commits.push({ sha, paths: paths.length, all, ws, stale });
}

const total = workspaces.size;
/** @type {Map<string, number>} */
const buckets = new Map();
for (const c of commits) {
  const key = c.all
    ? "all: root config or lockfile"
    : c.ws.length === 0
      ? c.stale.has("root-lint")
        ? "no workspace: root scripts or .agents only"
        : "no workspace: docs, Markdown, CI or image only"
      : c.ws.length === total
        ? "all: a library every workspace depends on"
        : c.ws.length === 1
          ? "one workspace"
          : `2 to ${total - 1} workspaces`;
  buckets.set(key, (buckets.get(key) ?? 0) + 1);
  console.log(
    [c.sha, c.paths, c.all ? total : c.ws.length, [...c.stale].join(",")].join(
      "\t",
    ),
  );
}
const n = commits.length;
/**
 * Returns a count as a whole percentage of the commits.
 *
 * @param {number} k
 * @returns {string}
 */
const share = (k) => ((100 * k) / n).toFixed(0);
console.error(`${n} commits in ${since}..${until}, ${total} workspaces`);
for (const [k, v] of [...buckets].sort((a, b) => b[1] - a[1])) {
  console.error(`${String(v).padStart(5)}  ${share(v).padStart(3)}%  ${k}`);
}
const checked = commits.reduce((s, c) => s + (c.all ? total : c.ws.length), 0);
console.error(
  `workspaces checked per commit: ${(checked / n).toFixed(1)} of ${total}`,
);
/** @type {Map<string, number>} */
const hits = new Map();
for (const c of commits) {
  for (const w of c.all ? workspaces.keys() : c.ws) {
    hits.set(w, (hits.get(w) ?? 0) + 1);
  }
}
for (const [w, k] of [...hits].sort((a, b) => b[1] - a[1])) {
  console.error(`${String(k).padStart(5)}  ${share(k).padStart(3)}%  ${w}`);
}
