#!/usr/bin/env node
// Checks that the skills under `.agents/skills` still describe the repository
// as it is.
//
// Skills are read by agents as authoritative, so a skill naming a path that
// does not exist is worse than no skill at all: an agent follows it into a
// compile error rather than looking. Two checks, both cheap:
//
//   1. Every relative markdown link resolves. Renaming a skill directory
//      silently breaks the links pointing at it, and nothing else notices.
//   2. Every backticked repo path exists. Catches guessed paths and ones left
//      behind by a move.
//
// Usage: node .agents/check-skill-references.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AGENTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(AGENTS_DIR);
const SKILLS_DIR = path.join(AGENTS_DIR, "skills");

// Skills whose backticked paths point into someone else's source tree, so the
// repo-path check would fail on every line of them. The Phaser topic skills are
// generated from Phaser's own documentation and cite paths like
// `src/tweens/TweenManager.js`; the Angular ones are vendored and hash-locked
// in skills-lock.json.
//
// Everything else is checked. Adding a skill that describes THIS repository
// needs no entry here -- that default is deliberate, so a new project skill is
// held to the check rather than quietly exempt.
const UPSTREAM_SKILLS = new Set([
  "angular-developer",
  "angular-new-app",
  ...fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("phaser-"))
    .map((entry) => entry.name)
    // Written for this project rather than derived from Phaser's docs, so they
    // cite real paths in this repository and are checked like any other.
    .filter(
      (name) => name !== "phaser-core" && name !== "phaser-canvas-performance",
    ),
]);

// A backticked token is treated as a repo path when it starts with one of
// these. Anything else in backticks is prose, an identifier, or a command.
const REPO_PREFIXES = [
  "src/",
  "test/",
  "tools/",
  "public/",
  "assets/",
  ".agents/",
  ".github/",
];

// Root files worth checking by name, since they are the ones skills cite.
const ROOT_FILES = new Set([
  "package.json",
  "vite.config.ts",
  "vitest.config.ts",
  "eslint.config.cjs",
  "tsconfig.json",
  "tsconfig.spec.json",
  "register.cjs",
  "index.html",
  "skills-lock.json",
  ".prettierignore",
]);

function markdownFilesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFilesIn(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

// Resolves a path that may end in a `*` glob, as the atlas page imports do.
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

function checkRepoPaths(file, text, problems) {
  for (const [, token] of text.matchAll(/`([^`\n]+)`/g)) {
    const candidate = token.trim().replace(/[.,;:)]+$/, "");
    const looksLikeRepoPath =
      REPO_PREFIXES.some((prefix) => candidate.startsWith(prefix)) ||
      ROOT_FILES.has(candidate);
    if (!looksLikeRepoPath) continue;
    // Skip prose and placeholder paths -- `src/games/<variant>/` names a shape,
    // not a file, and is meant to stand for any of them.
    if (/[\s<>]/.test(candidate)) continue;

    if (!pathExists(path.join(REPO_ROOT, candidate))) {
      problems.push(
        `${path.relative(REPO_ROOT, file)}: no such path -> ${candidate}`,
      );
    }
  }
}

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
