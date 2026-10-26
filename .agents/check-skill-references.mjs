#!/usr/bin/env node
// Checks that the skills, the repository's under `.agents/skills` and each
// workspace's under its own, and every `AGENTS.md` still describe the code as
// it is: every relative markdown link resolves, and every backticked path
// exists. Outside CI, it also warns about a skill Claude Code can't load,
// whose link in the `.claude/skills` beside it is missing or leads nowhere.
//
// Usage: node .agents/check-skill-references.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, skillRoots } from "./skill-roots.mjs";

/** @import { SkillRoot } from "./skill-roots.mjs" */

// Skills whose backticked paths point into another project's source tree: the
// vendored Angular ones.
//
// A skill about this repository needs no entry here, so it is checked.
const UPSTREAM_SKILLS = new Set(["angular-developer", "angular-new-app"]);

// The Solitaire Collection's Phaser skills are copies of the `skills/` folder
// Phaser's package ships (frontend/node_modules/phaser/skills/), each renamed
// with a `phaser-` prefix, and cite Phaser's source tree, all but these two,
// which were written for the game and cite its own.
const PHASER_SKILLS_WRITTEN_HERE = new Set([
  "phaser-core",
  "phaser-canvas-performance",
]);

// In the repository's skills, a backticked token is treated as a path when it
// starts with one of these. Anything else in backticks is prose, an
// identifier, or a command.
const REPO_PREFIXES = [
  "frontend/",
  "backend/",
  "docker-entrypoint.d/",
  ".agents/",
  ".github/",
  "docs/",
];

// Root files worth checking by name, since they are the ones skills cite.
const ROOT_FILES = new Set([
  "Dockerfile",
  "nginx.conf.template",
  "README.md",
  "skills-lock.json",
]);

// Folders the search for `AGENTS.md` files never enters: installed packages,
// and what builds and tests write. Hidden folders are skipped too, but for
// `.agents`.
const SKIPPED_FOLDERS = new Set(["node_modules", "dist", "coverage", "public"]);

/**
 * Returns whether a skill cites another project's source tree, so its paths
 * aren't checked.
 *
 * @param {string} name
 * @returns {boolean}
 */
function isUpstream(name) {
  if (UPSTREAM_SKILLS.has(name)) return true;
  return name.startsWith("phaser-") && !PHASER_SKILLS_WRITTEN_HERE.has(name);
}

/**
 * Returns every markdown file under a directory.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function markdownFilesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFilesIn(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

/**
 * Returns every `AGENTS.md` under a directory.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function agentsFilesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hidden = entry.name.startsWith(".") && entry.name !== ".agents";
      return hidden || SKIPPED_FOLDERS.has(entry.name)
        ? []
        : agentsFilesIn(full);
    }
    return entry.name === "AGENTS.md" ? [full] : [];
  });
}

/**
 * Returns the folder an `AGENTS.md` cites paths from: its own, or for the
 * repository's `.agents/AGENTS.md`, the repository's root.
 *
 * @param {string} file
 * @returns {string}
 */
function baseOfAgentsFile(file) {
  const dir = path.dirname(file);
  return path.basename(dir) === ".agents" ? path.dirname(dir) : dir;
}

/**
 * Returns whether git ignores a path, as it does what a build or a script
 * writes, which a fresh checkout doesn't have yet.
 *
 * @param {string} candidate
 * @returns {boolean}
 */
function isIgnored(candidate) {
  try {
    execFileSync("git", ["check-ignore", "-q", candidate], {
      cwd: REPO_ROOT,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns whether a path exists, where its last part may be a `*` glob, as in
 * the Solitaire Collection's atlas page imports.
 *
 * @param {string} candidate
 * @returns {boolean}
 */
function pathExists(candidate) {
  if (!candidate.includes("*")) return fs.existsSync(candidate);

  const dir = path.dirname(candidate);
  if (!fs.existsSync(dir)) return false;
  const pattern = new RegExp(
    `^${path
      .basename(candidate)
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")}$`,
  );
  return fs.readdirSync(dir).some((name) => pattern.test(name));
}

/**
 * Returns the folders a backticked token may be a path in, none if it is
 * prose, an identifier or a command.
 *
 * The repository's skills and `AGENTS.md` cite paths from its root. A
 * workspace's cite paths from the workspace's folder, when the first part
 * names something at its top level (`src/`, `vite.config.ts`), or from the
 * repository's root. Where both readings fit, as `.agents/` and `docs/` can,
 * either folder may hold it.
 *
 * @param {string} candidate
 * @param {string} base The folder the file cites paths from.
 * @param {Set<string>} topLevel The names at the top of that folder.
 * @returns {string[]}
 */
function foldersOfPath(candidate, base, topLevel) {
  const folders = [];
  if (base !== REPO_ROOT && topLevel.has(candidate.split("/")[0] ?? "")) {
    folders.push(base);
  }
  if (
    REPO_PREFIXES.some((prefix) => candidate.startsWith(prefix)) ||
    ROOT_FILES.has(candidate)
  ) {
    folders.push(REPO_ROOT);
  }
  return folders;
}

/**
 * Adds a problem for each relative link in a file that leads nowhere: a
 * markdown link's target, or a `./` or `../` path to a markdown file anywhere
 * in the text.
 *
 * @param {string} file
 * @param {string} text The file's contents.
 * @param {string[]} problems
 */
function checkRelativeLinks(file, text, problems) {
  const dir = path.dirname(file);
  const targets = [
    ...[...text.matchAll(/\]\(([^)\s]+)\)/g)].map(([, target]) => target),
    ...[...text.matchAll(/(\.\.?\/[A-Za-z0-9_./-]+\.md)/g)].map(
      ([, target]) => target,
    ),
  ];
  for (const target of new Set(targets)) {
    // An address, an anchor on the same page, a path from a server's root or
    // a placeholder, none of which is a file here.
    if (!target || /^([a-z][a-z0-9+.-]*:|#|\/)|[<{]/i.test(target)) continue;
    const link = target.replace(/#.*$/, "");
    if (!fs.existsSync(path.resolve(dir, link))) {
      problems.push(
        `${path.relative(REPO_ROOT, file)}: broken link -> ${target}`,
      );
    }
  }
}

/**
 * Adds a problem for each backticked path in a file that does not exist.
 *
 * @param {string} file
 * @param {string} text The file's contents.
 * @param {string} base The folder the file cites paths from.
 * @param {string[]} problems
 */
function checkPaths(file, text, base, problems) {
  const topLevel = new Set(fs.readdirSync(base));
  for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
    const candidate = token.trim().replace(/[.,;:)]+$/, "");
    // Skip prose and placeholder paths -- `src/games/<variant>/` names a
    // shape, not a file, and is meant to stand for any of them.
    if (/[\s<>]/.test(candidate)) continue;
    const folders = foldersOfPath(candidate, base, topLevel);
    if (folders.length === 0) continue;

    const paths = folders.map((folder) => path.join(folder, candidate));
    if (!paths.some((full) => pathExists(full) || isIgnored(full))) {
      problems.push(
        `${path.relative(REPO_ROOT, file)}: no such path -> ${candidate}`,
      );
    }
  }
}

/**
 * Returns where a path leads once every link on the way is followed, or
 * null if it leads nowhere.
 *
 * @param {string} candidate
 * @returns {string | null}
 */
function realPath(candidate) {
  try {
    return fs.realpathSync(candidate);
  } catch {
    return null;
  }
}

/**
 * Returns a warning for each skill in a folder that Claude Code can't load:
 * one the `.claude/skills` beside it has no link to, and a link there that
 * leads nowhere, such as one to a skill since renamed.
 *
 * @param {SkillRoot} root
 * @returns {string[]}
 */
function linkWarnings(root) {
  const links = path.join(root.base, ".claude", "skills");
  const where = (/** @type {string} */ name) =>
    path.relative(REPO_ROOT, path.join(links, name));
  const skills = fs
    .readdirSync(root.skills, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(root.skills, name, "SKILL.md")));
  const unlinked = skills
    .filter(
      (name) =>
        realPath(path.join(links, name)) !==
        realPath(path.join(root.skills, name)),
    )
    .map((name) => `${where(name)}: no link to the skill`);
  const dangling = fs.existsSync(links)
    ? fs
        .readdirSync(links)
        .filter(
          (name) =>
            !skills.includes(name) &&
            fs.lstatSync(path.join(links, name)).isSymbolicLink() &&
            realPath(path.join(links, name)) === null,
        )
        .map((name) => `${where(name)}: leads nowhere`)
    : [];
  return [...unlinked, ...dangling];
}

/** @type {string[]} */
const problems = [];
for (const root of skillRoots()) {
  for (const entry of fs.readdirSync(root.skills, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(root.skills, entry.name);

    for (const file of markdownFilesIn(skillDir)) {
      const text = fs.readFileSync(file, "utf8");
      checkRelativeLinks(file, text, problems);
      if (!isUpstream(entry.name)) {
        checkPaths(file, text, root.base, problems);
      }
    }
  }
}
for (const file of agentsFilesIn(REPO_ROOT)) {
  const text = fs.readFileSync(file, "utf8");
  checkRelativeLinks(file, text, problems);
  checkPaths(file, text, baseOfAgentsFile(file), problems);
}

// CI has no `.claude`, which is machine-local.
if (!process.env["CI"]) {
  const warnings = skillRoots().flatMap(linkWarnings);
  if (warnings.length) {
    console.warn(
      `Claude Code can't load ${warnings.length} skill link(s); run node .agents/link-claude-skills.mjs:
`,
    );
    for (const warning of warnings) console.warn(`  ${warning}`);
    console.warn("");
  }
}

if (problems.length) {
  console.error(`Reference check failed (${problems.length}):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    "\nA skill or AGENTS.md that names a path which does not exist will be followed anyway.",
  );
  process.exit(1);
}

console.log("Skill and AGENTS.md references OK.");
