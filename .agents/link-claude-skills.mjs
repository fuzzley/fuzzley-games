#!/usr/bin/env node
// Links each skill in `.agents/skills` into `.claude/skills` beside it, where
// Claude Code discovers skills, using a junction on Windows: the repository's
// own, and each workspace's, which Claude Code loads once it works on a file
// in that workspace.
//
// The links hold absolute paths, so re-run this script after the repository
// moves or is cloned.
//
// Usage: node .agents/link-claude-skills.mjs

import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, skillRoots } from "./skill-roots.mjs";

/** @import { SkillRoot } from "./skill-roots.mjs" */

/**
 * The skills a run linked, left alone or skipped, by what happened to each.
 *
 * @typedef {{created: string[], repaired: string[], current: string[], pruned: string[], conflicts: string[], foreign: string[]}} LinkResults
 */

/**
 * Returns the skills in `sourceDir`: each directory directly under it that
 * holds a `SKILL.md`.
 *
 * @param {string} sourceDir
 * @returns {string[]}
 */
function discoverSkills(sourceDir) {
  return fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(sourceDir, name, "SKILL.md")))
    .sort();
}

/**
 * Removes a link without touching what it points at.
 *
 * Windows junctions report as directories, so unlink fails on them, and rmdir
 * removes them instead.
 *
 * @param {string} linkPath
 */
function removeLink(linkPath) {
  try {
    fs.unlinkSync(linkPath);
  } catch (error) {
    const { code } = /** @type {NodeJS.ErrnoException} */ (error);
    if (code !== "EPERM" && code !== "EISDIR") throw error;
    fs.rmdirSync(linkPath);
  }
}

/**
 * Returns where a link points, or null if the path is not a link.
 *
 * @param {string} linkPath
 * @returns {string | null}
 */
function readLinkTarget(linkPath) {
  try {
    return fs.readlinkSync(linkPath);
  } catch {
    return null;
  }
}

/**
 * Returns whether a path is a link.
 *
 * @param {string} linkPath
 * @returns {boolean}
 */
function isLink(linkPath) {
  try {
    return fs.lstatSync(linkPath).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Links a skill into its `.claude/skills`, or repairs its link, and records
 * which.
 *
 * @param {SkillRoot} root
 * @param {string} name
 * @param {LinkResults} results
 */
function linkSkill(root, name, results) {
  const target = path.join(root.skills, name);
  const linkPath = path.join(claudeSkillsOf(root), name);

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

/**
 * Removes the links this script owns, including dangling ones from an earlier
 * repository path, that no longer match a skill.
 *
 * Real directories are never touched.
 *
 * @param {SkillRoot} root
 * @param {string[]} skills
 * @param {LinkResults} results
 */
function pruneStaleLinks(root, skills, results) {
  const dir = claudeSkillsOf(root);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const linkPath = path.join(dir, entry.name);
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

/**
 * Returns the `.claude/skills` folder a folder of skills is linked into.
 *
 * @param {SkillRoot} root
 * @returns {string}
 */
function claudeSkillsOf(root) {
  return path.join(root.base, ".claude", "skills");
}

/**
 * Links one folder of skills, and reports what it did.
 *
 * @param {SkillRoot} root
 * @returns {number} How many skills the folder has.
 */
function linkRoot(root) {
  fs.mkdirSync(claudeSkillsOf(root), { recursive: true });

  const skills = discoverSkills(root.skills);
  /** @type {LinkResults} */
  const results = {
    created: [],
    repaired: [],
    current: [],
    pruned: [],
    conflicts: [],
    foreign: [],
  };

  for (const name of skills) linkSkill(root, name, results);
  pruneStaleLinks(root, skills, results);

  console.log(`${path.relative(REPO_ROOT, claudeSkillsOf(root))}:`);
  /** @type {[string, string[]][]} */
  const report = [
    ["linked", results.created],
    ["repaired", results.repaired],
    ["already current", results.current],
    ["pruned stale", results.pruned],
  ];
  for (const [label, names] of report) {
    if (names.length)
      console.log(`  ${label} (${names.length}): ${names.join(", ")}`);
  }
  for (const name of results.conflicts) {
    console.warn(
      `  skipped ${name}: a real directory, not a link -- remove it to link the skill`,
    );
  }
  for (const name of results.foreign) {
    console.warn(
      `  left ${name}: links outside .agents, so this script does not own it`,
    );
  }
  return skills.length;
}

const LINK_TYPE = process.platform === "win32" ? "junction" : "dir";

let total = 0;
for (const root of skillRoots()) total += linkRoot(root);

console.log(`
${total} skill(s) available to Claude Code`);
console.log(
  "Restart Claude Code if the repository's .claude/skills did not exist when the session started.",
);
