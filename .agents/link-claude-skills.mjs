#!/usr/bin/env node
// Links each skill in `.agents/skills` into `.claude/skills` beside it, where
// Claude Code discovers skills, using a junction on Windows: the repository's
// own, and each workspace's, which Claude Code loads once it works on a file
// in that workspace. And links each agent definition in `.agents/agents` into
// the repository's `.claude/agents`, where Claude Code finds agent types for
// a session started inside the repository.
//
// A session started in another folder finds no agent type here, so
// `--also-in <folder>` links the definitions into that folder's
// `.claude/agents` too, and `--also-in <folder> --remove` takes those links
// out. Nothing runs it with that option: it is one machine's choice. There it
// makes, replaces and removes only links that lead into this repository's
// `.agents/agents`, so a link to another clone's definition stays as it is.
//
// A definition's link is a file link, which Windows makes only in Developer
// Mode or from an elevated shell. Where it can't, the script says so and
// links the skills all the same.
//
// The links hold absolute paths, so re-run this script after the repository
// moves or is cloned. A link another folder holds to the repository's old
// path is then no longer this script's: remove it by hand.
//
// Usage: node .agents/link-claude-skills.mjs [--also-in <folder> [--remove]]

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  AGENT_DEFINITIONS,
  REPO_ROOT,
  agentDefinitions,
  skillRoots,
  skillsIn,
} from "./skill-roots.mjs";

/** @import { SkillRoot } from "./skill-roots.mjs" */

/**
 * The skills or the definitions a run linked, left alone or skipped, by what
 * happened to each.
 *
 * @typedef {{created: string[], repaired: string[], current: string[], pruned: string[], conflicts: string[], elsewhere: string[], foreign: string[]}} LinkResults
 */

/**
 * Returns whether a link is this script's to replace or remove.
 *
 * @callback Owns
 * @param {string} target Where the link leads, as the link holds it.
 * @param {string} dir The folder the link is in.
 * @returns {boolean}
 */

const USAGE = `Usage: node .agents/link-claude-skills.mjs [--also-in <folder> [--remove]]

Links the skills into the .claude/skills beside them, and the agent
definitions into the repository's .claude/agents.

      --also-in <folder>  Links the agent definitions into <folder>/.claude/agents
                          too, for a session started in that folder
      --remove            With --also-in, takes those links out instead
  -h, --help              Show this message`;

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
 * Links a skill or a definition into a folder, or repairs its link, and
 * records which.
 *
 * A real file or directory of that name stays, and so does a link that
 * leads elsewhere and is not this script's.
 *
 * @param {string} target What the link leads to.
 * @param {string} dir The folder the link goes in.
 * @param {string} name
 * @param {"dir" | "junction" | "file"} type
 * @param {Owns} owns
 * @param {LinkResults} results
 */
function link(target, dir, name, type, owns, results) {
  const linkPath = path.join(dir, name);

  if (!fs.existsSync(linkPath) && !isLink(linkPath)) {
    fs.symlinkSync(target, linkPath, type);
    results.created.push(name);
    return;
  }
  if (!isLink(linkPath)) {
    results.conflicts.push(name);
    return;
  }
  const leads = readLinkTarget(linkPath) ?? "";
  if (path.resolve(dir, leads) === target) {
    results.current.push(name);
    return;
  }
  if (!owns(leads, dir)) {
    results.elsewhere.push(name);
    return;
  }
  removeLink(linkPath);
  fs.symlinkSync(target, linkPath, type);
  results.repaired.push(name);
}

/**
 * Removes the links in a folder that this script owns and that match none of
 * the names kept, and records the links it left as another's.
 *
 * Real files and directories are never touched.
 *
 * @param {string} dir
 * @param {string[]} kept The names whose links stay.
 * @param {Owns} owns
 * @param {LinkResults} results
 */
function pruneStaleLinks(dir, kept, owns, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const linkPath = path.join(dir, entry.name);
    if (kept.includes(entry.name) || !isLink(linkPath)) continue;

    if (!owns(readLinkTarget(linkPath) ?? "", dir)) {
      results.foreign.push(entry.name);
      continue;
    }
    removeLink(linkPath);
    results.pruned.push(entry.name);
  }
}

/**
 * Returns whether a link's target passes through an `.agents` folder, as
 * this script's links inside the repository do, a dangling one from the
 * repository's earlier path among them.
 *
 * @type {Owns}
 */
function throughAgents(target) {
  return target.split(path.sep).includes(".agents");
}

/**
 * Returns whether a link leads to one of this repository's agent
 * definitions, or to where one was: the only links this script touches
 * outside the repository.
 *
 * @type {Owns}
 */
function intoDefinitions(target, dir) {
  return path.dirname(path.resolve(dir, target)) === AGENT_DEFINITIONS;
}

/**
 * Returns empty results, to record a run in.
 *
 * @returns {LinkResults}
 */
function noResults() {
  return {
    created: [],
    repaired: [],
    current: [],
    pruned: [],
    conflicts: [],
    elsewhere: [],
    foreign: [],
  };
}

/**
 * Returns how many names a run left linked: those it linked, repaired or
 * found current.
 *
 * @param {LinkResults} results
 * @returns {number}
 */
function linked(results) {
  return (
    results.created.length + results.repaired.length + results.current.length
  );
}

/**
 * Returns a folder's `.claude/agents`, by its real path where it exists, so
 * that a relative link in it is resolved from where it really is.
 *
 * @param {string} base
 * @returns {string}
 */
function claudeAgentsOf(base) {
  const dir = path.join(base, ".claude", "agents");
  return fs.existsSync(dir) ? fs.realpathSync(dir) : dir;
}

/**
 * Prints the folder a run's lines are about, from the repository's root
 * where it is inside.
 *
 * @param {string} dir
 */
function heading(dir) {
  const inside = !path.relative(REPO_ROOT, dir).startsWith("..");
  console.log(`${inside ? path.relative(REPO_ROOT, dir) : dir}:`);
}

/**
 * Prints what a run did in a folder.
 *
 * @param {string} dir
 * @param {LinkResults} results
 * @param {string} noun What is linked there: a skill, or a definition.
 * @param {string} real What a name in the way is, where it is no link.
 * @param {string} [foreign] Why a link was left, where the folder is the
 *   repository's, whose every link should be this script's.
 */
function report(dir, results, noun, real, foreign) {
  heading(dir);
  /** @type {[string, string[]][]} */
  const lines = [
    ["linked", results.created],
    ["repaired", results.repaired],
    ["already current", results.current],
    ["pruned stale", results.pruned],
  ];
  for (const [label, names] of lines) {
    if (names.length)
      console.log(`  ${label} (${names.length}): ${names.join(", ")}`);
  }
  for (const name of results.conflicts) {
    console.warn(
      `  skipped ${name}: a real ${real}, not a link -- remove it to link the ${noun}`,
    );
  }
  for (const name of results.elsewhere) {
    console.warn(
      `  skipped ${name}: a link to elsewhere -- remove it to link the ${noun}`,
    );
  }
  if (foreign === undefined) return;
  for (const name of results.foreign) {
    console.warn(`  left ${name}: ${foreign}`);
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
 * @returns {number} How many of the folder's skills are linked.
 */
function linkRoot(root) {
  const dir = claudeSkillsOf(root);
  fs.mkdirSync(dir, { recursive: true });

  const skills = skillsIn(root.skills);
  const results = noResults();
  for (const name of skills) {
    const target = path.join(root.skills, name);
    link(target, dir, name, DIR_LINK, throughAgents, results);
  }
  pruneStaleLinks(dir, skills, throughAgents, results);

  report(dir, results, "skill", "directory", FOREIGN);
  return linked(results);
}

/**
 * Links the agent definitions into a folder's `.claude/agents`, pruning the
 * links there that this script owns and that match no definition, and
 * reports what it did.
 *
 * Where the system refuses a file link, as Windows does outside Developer
 * Mode, it says so and goes on.
 *
 * @param {string} base The folder whose `.claude/agents` takes the links.
 * @returns {number} How many definitions are linked there.
 */
function linkDefinitions(base) {
  const ours = base === REPO_ROOT;
  const owns = ours ? throughAgents : intoDefinitions;
  const definitions = agentDefinitions();
  if (definitions.length === 0 && !fs.existsSync(claudeAgentsOf(base)))
    return 0;
  fs.mkdirSync(path.join(base, ".claude", "agents"), { recursive: true });
  const dir = claudeAgentsOf(base);

  const results = noResults();
  /** @type {string[]} */
  const refused = [];
  for (const name of definitions) {
    const target = path.join(AGENT_DEFINITIONS, name);
    try {
      link(target, dir, name, "file", owns, results);
    } catch (error) {
      const { code } = /** @type {NodeJS.ErrnoException} */ (error);
      if (code !== "EPERM") throw error;
      refused.push(name);
    }
  }
  pruneStaleLinks(dir, definitions, owns, results);

  report(dir, results, "definition", "file", ours ? FOREIGN : undefined);
  for (const name of refused) {
    console.warn(
      `  not linked ${name}: the system refused the link -- on Windows, a file link is made only in Developer Mode or from an elevated shell`,
    );
  }
  return linked(results);
}

/**
 * Removes the links to this repository's agent definitions from a folder's
 * `.claude/agents`, leaving whatever else is there, and reports what it did.
 *
 * @param {string} base
 */
function unlinkDefinitions(base) {
  const dir = claudeAgentsOf(base);
  const results = noResults();
  if (fs.existsSync(dir)) pruneStaleLinks(dir, [], intoDefinitions, results);
  heading(dir);
  console.log(
    results.pruned.length
      ? `  removed (${results.pruned.length}): ${results.pruned.join(", ")}`
      : "  no link of this script's",
  );
}

/**
 * Reads the command line, and exits with its usage for one it can't read.
 *
 * @returns {{alsoIn: string | undefined, remove: boolean}} The folder
 *   `--also-in` names, as a whole path, and whether its links are removed.
 */
function readOptions() {
  /** @type {{"also-in"?: string, remove?: boolean, help?: boolean}} */
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        "also-in": { type: "string" },
        remove: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    }));
  } catch (error) {
    stop(error instanceof Error ? error.message : String(error));
  }
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const folder = values["also-in"];
  if (values.remove && folder === undefined) {
    stop(
      "--remove needs --also-in <folder>, the folder to take the links out of.",
    );
  }
  if (folder === undefined) return { alsoIn: undefined, remove: false };
  if (folder === "") stop("--also-in needs a folder, and was given none.");
  const alsoIn = path.resolve(folder);
  if (!fs.existsSync(alsoIn) || !fs.statSync(alsoIn).isDirectory()) {
    stop(`--also-in: no such folder, ${alsoIn}.`);
  }
  if (fs.realpathSync(alsoIn) === fs.realpathSync(REPO_ROOT)) {
    stop(
      "--also-in names the repository itself, whose links this script always keeps.",
    );
  }
  if (claudeAgentsOf(alsoIn) === claudeAgentsOf(REPO_ROOT)) {
    stop(
      "--also-in names a folder whose .claude/agents is the repository's own, whose links this script always keeps.",
    );
  }
  return { alsoIn, remove: values.remove === true };
}

/**
 * Prints what is wrong with the command line and its usage, and exits.
 *
 * @param {string} problem
 * @returns {never}
 */
function stop(problem) {
  console.error(`${problem}\n\n${USAGE}`);
  process.exit(2);
}

const DIR_LINK = process.platform === "win32" ? "junction" : "dir";

/** Why a link in the repository's own folders was left. */
const FOREIGN = "links outside .agents, so this script does not own it";

const { alsoIn, remove } = readOptions();

let total = 0;
for (const root of skillRoots()) total += linkRoot(root);
const definitions = linkDefinitions(REPO_ROOT);
if (alsoIn !== undefined) {
  if (remove) unlinkDefinitions(alsoIn);
  else linkDefinitions(alsoIn);
}

console.log(`
${total} skill(s) and ${definitions} agent definition(s) available to Claude Code`);
console.log(
  "Restart Claude Code if the repository's .claude/skills did not exist when the session started, or if it does not offer an agent type linked just now.",
);
if (definitions > 0 && alsoIn === undefined) {
  console.log(
    "A session started outside the repository finds no agent definition here: --also-in <folder> links them into the folder it starts in.",
  );
}
