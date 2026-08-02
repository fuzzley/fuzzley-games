#!/usr/bin/env node
// Bridges `.agents/skills` into `.claude/skills` so Claude Code can discover
// the project's skills.
//
// `.agents/skills` is the source of truth: it is committed, and Gemini CLI
// reads it directly. Claude Code only discovers project skills at
// `.claude/skills/<name>/SKILL.md`, but it follows a symlink placed at that
// `<name>` entry. This script creates one link per skill (a junction on
// Windows, where symlinks need Administrator or Developer Mode).
//
// The links live under the gitignored `.claude/` and hold absolute targets, so
// they are machine-local and break whenever the repository is moved or cloned.
// Re-run `yarn skills:link` to rebuild them.
//
// Usage: node .agents/link-claude-skills.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AGENTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.dirname(AGENTS_DIR);
const SOURCE_DIR = path.join(AGENTS_DIR, "skills");
const TARGET_DIR = path.join(REPO_ROOT, ".claude", "skills");

// Only a directory directly under `.agents/skills` holding `SKILL.md` is a skill.
// Every skill (including all `phaser-*` skills) lives directly under `.agents/skills/<name>/SKILL.md`.
function discoverSkills(sourceDir) {
  return fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(sourceDir, name, "SKILL.md")))
    .sort();
}

// Windows junctions report as directories, so unlink fails on them; rmdir
// removes the link without touching what it points at.
function removeLink(linkPath) {
  try {
    fs.unlinkSync(linkPath);
  } catch (error) {
    if (error.code !== "EPERM" && error.code !== "EISDIR") throw error;
    fs.rmdirSync(linkPath);
  }
}

function readLinkTarget(linkPath) {
  try {
    return fs.readlinkSync(linkPath);
  } catch {
    return null;
  }
}

function isLink(linkPath) {
  try {
    return fs.lstatSync(linkPath).isSymbolicLink();
  } catch {
    return false;
  }
}

function linkSkill(name, results) {
  const target = path.join(SOURCE_DIR, name);
  const linkPath = path.join(TARGET_DIR, name);

  if (fs.existsSync(linkPath) || isLink(linkPath)) {
    if (!isLink(linkPath)) {
      results.conflicts.push(name);
      return;
    }
    if (path.resolve(readLinkTarget(linkPath) ?? "") === target) {
      results.current.push(name);
      return;
    }
    removeLink(linkPath);
    fs.symlinkSync(target, linkPath, LINK_TYPE);
    results.repaired.push(name);
    return;
  }

  fs.symlinkSync(target, linkPath, LINK_TYPE);
  results.created.push(name);
}

// Remove links this script owns -- ones pointing into any `.agents/skills`,
// including the dangling ones left behind by an earlier repository path -- that
// no longer match a skill. Real directories are never touched.
function pruneStaleLinks(skills, results) {
  for (const entry of fs.readdirSync(TARGET_DIR, { withFileTypes: true })) {
    const linkPath = path.join(TARGET_DIR, entry.name);
    if (skills.includes(entry.name) || !isLink(linkPath)) continue;

    const target = readLinkTarget(linkPath) ?? "";
    if (!target.split(path.sep).includes(".agents")) {
      results.foreign.push(entry.name);
      continue;
    }
    removeLink(linkPath);
    results.pruned.push(entry.name);
  }
}

const LINK_TYPE = process.platform === "win32" ? "junction" : "dir";

if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`No skills directory at ${SOURCE_DIR}`);
  process.exit(1);
}

fs.mkdirSync(TARGET_DIR, { recursive: true });

const skills = discoverSkills(SOURCE_DIR);
const results = {
  created: [],
  repaired: [],
  current: [],
  pruned: [],
  conflicts: [],
  foreign: [],
};

for (const name of skills) linkSkill(name, results);
pruneStaleLinks(skills, results);

const report = [
  ["linked", results.created],
  ["repaired", results.repaired],
  ["already current", results.current],
  ["pruned stale", results.pruned],
];
for (const [label, names] of report) {
  if (names.length)
    console.log(`${label} (${names.length}): ${names.join(", ")}`);
}
for (const name of results.conflicts) {
  console.warn(
    `skipped ${name}: a real directory, not a link -- remove it to link the skill`,
  );
}
for (const name of results.foreign) {
  console.warn(
    `left ${name}: links outside .agents, so this script does not own it`,
  );
}

console.log(
  `\n${skills.length} skill(s) available to Claude Code at .claude/skills`,
);
console.log(
  "Restart Claude Code if .claude/skills did not exist when the session started.",
);
