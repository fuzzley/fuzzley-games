#!/usr/bin/env node
// Checks that the skills, the repository's under `.agents/skills` and each
// workspace's under its own, the agent definitions under `.agents/agents`
// and every `AGENTS.md` still describe the code as it is: every relative
// markdown link resolves, and every backticked path exists. It holds each
// `AGENTS.md` to its budget of bytes, and each skill's description to its cap
// of characters. Outside CI, it also warns about a skill or a definition
// Claude Code can't load, whose link in the `.claude/skills` beside it, or in
// the repository's `.claude/agents`, is missing or leads nowhere.
//
// Usage: node .agents/check-skill-references.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  AGENT_DEFINITIONS,
  REPO_ROOT,
  agentDefinitions,
  skillRoots,
  skillsIn,
} from "./skill-roots.mjs";

/** @import { SkillRoot } from "./skill-roots.mjs" */

// Skills pulled from another project, whose backticked paths point into its
// source tree and whose descriptions are its own to write, so neither is
// checked: the vendored Angular one.
//
// A skill about this repository needs no entry here, so it is checked.
const UPSTREAM_SKILLS = new Set(["angular-developer"]);

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

// The most bytes each `AGENTS.md` that many workspaces read may hold, by its
// path from the repository's root: the repository's, every workspace's and
// every game's. An agent loads each one whole with the first file it opens
// beneath it.
const SHARED_LAYER_BUDGETS = new Map([
  [".agents/AGENTS.md", 20_000],
  ["frontend/AGENTS.md", 20_000],
  ["frontend/games/AGENTS.md", 12_000],
]);

// The most bytes any other `AGENTS.md` may hold.
const OWN_BUDGET = 8_000;

// The most characters the description in a skill's frontmatter may hold. Every
// request of every agent carries every skill's, in a list that is itself
// capped, so a long one crowds the others out.
const DESCRIPTION_CAP = 400;

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
  for (const [, token = ""] of text.matchAll(/`([^`\n]+)`/g)) {
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
 * Adds a problem for an `AGENTS.md` that holds more bytes than its budget.
 *
 * @param {string} file
 * @param {string} text The file's contents.
 * @param {string[]} problems
 */
function checkSize(file, text, problems) {
  const name = path.relative(REPO_ROOT, file).split(path.sep).join("/");
  const budget = SHARED_LAYER_BUDGETS.get(name) ?? OWN_BUDGET;
  const size = Buffer.byteLength(text);
  if (size > budget) {
    problems.push(`${name}: ${size} bytes, over its budget of ${budget}`);
  }
}

/**
 * Returns the description in a skill's frontmatter as one line, or undefined
 * where the file has no frontmatter or the frontmatter no description.
 *
 * @param {string} text The `SKILL.md`'s contents.
 * @returns {string | undefined}
 */
function descriptionOf(text) {
  // As a checkout has it, whatever wrote the working tree's copy.
  const unix = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const frontmatter = /^---\n(.*?)\n---/s.exec(unix)?.[1];
  // Up to the next key, so a description folded over several lines counts
  // whole.
  const value = /^description:(.*?)(?=\n[\w-]+:|$(?![^]))/ms.exec(
    frontmatter ?? "",
  )?.[1];
  return value
    ?.replace(/^\s*[>|][1-9+-]*[ \t]*(#.*)?\n/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2");
}

/**
 * Adds a problem for a skill whose description is missing or over the cap.
 *
 * @param {string} file The skill's `SKILL.md`.
 * @param {string} text The file's contents.
 * @param {string[]} problems
 */
function checkDescription(file, text, problems) {
  const name = path.relative(REPO_ROOT, file).split(path.sep).join("/");
  const description = descriptionOf(text);
  if (!description) {
    problems.push(`${name}: no description in its frontmatter`);
    return;
  }
  const size = [...description].length;
  if (size > DESCRIPTION_CAP) {
    problems.push(
      `${name}: a description of ${size} characters, over the cap of ${DESCRIPTION_CAP}`,
    );
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
 * Returns a warning for each skill or agent definition that Claude Code
 * can't load: one its folder of links has no link to, and a link there that
 * leads nowhere, such as one to a skill since renamed.
 *
 * @param {string} links The folder of links, a `.claude/skills` or the
 *   repository's `.claude/agents`.
 * @param {string} sources The folder the links lead into.
 * @param {string[]} names The skills' or the definitions' names there.
 * @param {string} noun What a name is: a skill, or a definition.
 * @returns {string[]}
 */
function linkWarnings(links, sources, names, noun) {
  const where = (/** @type {string} */ name) =>
    path.relative(REPO_ROOT, path.join(links, name));
  const unlinked = names
    .filter(
      (name) =>
        realPath(path.join(links, name)) !== realPath(path.join(sources, name)),
    )
    .map((name) => `${where(name)}: no link to the ${noun}`);
  const dangling = fs.existsSync(links)
    ? fs
        .readdirSync(links)
        .filter(
          (name) =>
            !names.includes(name) &&
            fs.lstatSync(path.join(links, name)).isSymbolicLink() &&
            realPath(path.join(links, name)) === null,
        )
        .map((name) => `${where(name)}: leads nowhere`)
    : [];
  return [...unlinked, ...dangling];
}

/**
 * Returns the warnings for a folder of skills, against the `.claude/skills`
 * beside it.
 *
 * @param {SkillRoot} root
 * @returns {string[]}
 */
function skillWarnings(root) {
  const links = path.join(root.base, ".claude", "skills");
  return linkWarnings(links, root.skills, skillsIn(root.skills), "skill");
}

/**
 * Returns the warnings for the agent definitions, against the repository's
 * `.claude/agents`, where a session started inside the repository finds
 * them.
 *
 * @returns {string[]}
 */
function definitionWarnings() {
  const links = path.join(REPO_ROOT, ".claude", "agents");
  return linkWarnings(
    links,
    AGENT_DEFINITIONS,
    agentDefinitions(),
    "definition",
  );
}

/** @type {string[]} */
const problems = [];
/** @type {string[]} */
const longDescriptions = [];
for (const root of skillRoots()) {
  for (const entry of fs.readdirSync(root.skills, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(root.skills, entry.name);

    for (const file of markdownFilesIn(skillDir)) {
      const text = fs.readFileSync(file, "utf8");
      checkRelativeLinks(file, text, problems);
      if (!UPSTREAM_SKILLS.has(entry.name)) {
        checkPaths(file, text, root.base, problems);
        if (file === path.join(skillDir, "SKILL.md")) {
          checkDescription(file, text, longDescriptions);
        }
      }
    }
  }
}
for (const name of agentDefinitions()) {
  const file = path.join(AGENT_DEFINITIONS, name);
  const text = fs.readFileSync(file, "utf8");
  checkRelativeLinks(file, text, problems);
  checkPaths(file, text, REPO_ROOT, problems);
}
/** @type {string[]} */
const oversized = [];
for (const file of agentsFilesIn(REPO_ROOT)) {
  const text = fs.readFileSync(file, "utf8");
  checkRelativeLinks(file, text, problems);
  checkPaths(file, text, baseOfAgentsFile(file), problems);
  checkSize(file, text, oversized);
}

// CI has no `.claude`, which is machine-local.
if (!process.env["CI"]) {
  const warnings = [
    ...skillRoots().flatMap(skillWarnings),
    ...definitionWarnings(),
  ];
  if (warnings.length) {
    console.warn(
      `Claude Code can't load ${warnings.length} skill or agent link(s); run node .agents/link-claude-skills.mjs:
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
    "\nA skill, an agent definition or an AGENTS.md that names a path which does not exist will be followed anyway.",
  );
}
if (oversized.length) {
  if (problems.length) console.error("");
  console.error(`AGENTS.md size check failed (${oversized.length}):\n`);
  for (const problem of oversized) console.error(`  ${problem}`);
  console.error(
    "\nAn AGENTS.md holds rules alone. Cut what a doc comment, a check or a skill already says, or move a task's steps into a skill.",
  );
}
if (longDescriptions.length) {
  if (problems.length || oversized.length) console.error("");
  console.error(
    `Skill description check failed (${longDescriptions.length}):\n`,
  );
  for (const problem of longDescriptions) console.error(`  ${problem}`);
  console.error(
    "\nA description goes out with every request. Say the task, then `Triggers on:` and the words that call for it.",
  );
}
if (problems.length || oversized.length || longDescriptions.length) {
  process.exit(1);
}

console.log("Skill, agent definition and AGENTS.md references OK.");
console.log("Every AGENTS.md is within its budget.");
console.log("Every skill's description is within its cap.");
