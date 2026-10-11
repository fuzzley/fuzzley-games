#!/usr/bin/env node
// Checks that the skills under `.agents/skills` still describe the repository
// as it is: every relative markdown link resolves, and every backticked repo
// path exists.
//
// Usage: node .agents/check-skill-references.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AGENTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(AGENTS_DIR);
const SKILLS_DIR = path.join(AGENTS_DIR, "skills");

// Skills whose backticked paths point into another project's source tree: the
// vendored Angular ones.
//
// A skill about this repository needs no entry here, so it is checked.
const UPSTREAM_SKILLS = new Set(["angular-developer", "angular-new-app"]);

// A backticked token is treated as a repo path when it starts with one of
// these. Anything else in backticks is prose, an identifier, or a command.
const REPO_PREFIXES = [
  "frontend/",
  "backend/",
  "docker-entrypoint.d/",
  ".agents/",
  ".github/",
];

// Root files worth checking by name, since they are the ones skills cite.
const ROOT_FILES = new Set([
  "Dockerfile",
  "nginx.conf.template",
  "README.md",
  "skills-lock.json",
]);

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
 * Returns whether a path exists, where its last part may be a `*` glob.
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
 * Adds a problem for each backticked repository path in a file that does not
 * exist.
 *
 * @param {string} file
 * @param {string} text The file's contents.
 * @param {string[]} problems
 */
function checkRepoPaths(file, text, problems) {
  for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
    const candidate = token.trim().replace(/[.,;:)]+$/, "");
    const looksLikeRepoPath =
      REPO_PREFIXES.some((prefix) => candidate.startsWith(prefix)) ||
      ROOT_FILES.has(candidate);
    if (!looksLikeRepoPath) continue;
    // Skip prose and placeholder paths -- `frontend/src/app/component/<name>/`
    // names a shape, not a file, and is meant to stand for any of them.
    if (/[\s<>]/.test(candidate)) continue;

    if (!pathExists(path.join(REPO_ROOT, candidate))) {
      problems.push(
        `${path.relative(REPO_ROOT, file)}: no such path -> ${candidate}`,
      );
    }
  }
}

/** @type {string[]} */
const problems = [];
for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const skillDir = path.join(SKILLS_DIR, entry.name);

  for (const file of markdownFilesIn(skillDir)) {
    const text = fs.readFileSync(file, "utf8");
    checkRelativeLinks(file, text, problems);
    if (!UPSTREAM_SKILLS.has(entry.name)) {
      checkRepoPaths(file, text, problems);
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
