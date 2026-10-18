#!/usr/bin/env node
// Checks that the skills, the repository's under `.agents/skills` and each
// workspace's under its own, still describe the code as it is: every relative
// markdown link resolves, and every backticked path exists.
//
// Usage: node .agents/check-skill-references.mjs

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, skillRoots } from "./skill-roots.mjs";

/** @import { SkillRoot } from "./skill-roots.mjs" */

// Skills whose backticked paths point into another project's source tree: the
// vendored Angular ones.
//
// A skill about this repository needs no entry here, so it is checked.
const UPSTREAM_SKILLS = new Set(["angular-developer", "angular-new-app"]);

// The Solitaire Collection's Phaser skills are generated from Phaser's
// documentation and cite its source tree, all but these two, which were
// written for the game and cite its own.
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
 * The repository's skills cite paths from its root. A workspace's cite paths
 * from the workspace's folder, when the first part names something at its top
 * level (`src/`, `vite.config.ts`), or from the repository's root. Where both
 * readings fit, as `.agents/` and `docs/` can, either folder may hold it.
 *
 * @param {string} candidate
 * @param {SkillRoot} root
 * @param {Set<string>} topLevel The names at the top of the root's base.
 * @returns {string[]}
 */
function foldersOfPath(candidate, root, topLevel) {
  const folders = [];
  if (root.base !== REPO_ROOT && topLevel.has(candidate.split("/")[0] ?? "")) {
    folders.push(root.base);
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
 * Adds a problem for each relative markdown link in a file that leads nowhere.
 *
 * @param {string} file
 * @param {string} text The file's contents.
 * @param {string[]} problems
 */
function checkRelativeLinks(file, text, problems) {
  const dir = path.dirname(file);
  for (const [, link] of text.matchAll(/(\.\.?\/[A-Za-z0-9_./-]+\.md)/g)) {
    if (!fs.existsSync(path.resolve(dir, link))) {
      problems.push(
        `${path.relative(REPO_ROOT, file)}: broken link -> ${link}`,
      );
    }
  }
}

/**
 * Adds a problem for each backticked path in a file that does not exist.
 *
 * @param {string} file
 * @param {string} text The file's contents.
 * @param {SkillRoot} root
 * @param {Set<string>} topLevel The names at the top of the root's base.
 * @param {string[]} problems
 */
function checkPaths(file, text, root, topLevel, problems) {
  for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
    const candidate = token.trim().replace(/[.,;:)]+$/, "");
    // Skip prose and placeholder paths -- `src/games/<variant>/` names a
    // shape, not a file, and is meant to stand for any of them.
    if (/[\s<>]/.test(candidate)) continue;
    const folders = foldersOfPath(candidate, root, topLevel);
    if (folders.length === 0) continue;

    if (!folders.some((folder) => pathExists(path.join(folder, candidate)))) {
      problems.push(
        `${path.relative(REPO_ROOT, file)}: no such path -> ${candidate}`,
      );
    }
  }
}

/** @type {string[]} */
const problems = [];
for (const root of skillRoots()) {
  const topLevel = new Set(fs.readdirSync(root.base));
  for (const entry of fs.readdirSync(root.skills, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(root.skills, entry.name);

    for (const file of markdownFilesIn(skillDir)) {
      const text = fs.readFileSync(file, "utf8");
      checkRelativeLinks(file, text, problems);
      if (!isUpstream(entry.name)) {
        checkPaths(file, text, root, topLevel, problems);
      }
    }
  }
}

if (problems.length) {
  console.error(`Skill reference check failed (${problems.length}):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    "\nA skill that names a path which does not exist will be followed anyway.",
  );
  process.exit(1);
}

console.log("Skill references OK.");
