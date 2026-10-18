// Finds the folders of agent skills: the repository's own `.agents/skills`,
// and the one in each frontend workspace that has skills about it alone.
// Shared by check-skill-references.mjs and link-claude-skills.mjs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The repository's root folder. */
export const REPO_ROOT = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);

/**
 * @typedef {object} SkillRoot A folder of skills, and the folder they are about.
 * @property {string} base The repository's root, or a workspace's folder.
 * @property {string} skills The `.agents/skills` folder in it.
 */

/**
 * Returns each frontend workspace's folder, from the patterns in
 * frontend/package.json.
 *
 * @returns {string[]}
 */
export function workspaceFolders() {
  const frontend = path.join(REPO_ROOT, "frontend");
  /** @type {{workspaces?: string[]}} */
  const manifest = JSON.parse(
    fs.readFileSync(path.join(frontend, "package.json"), "utf8"),
  );
  return (manifest.workspaces ?? [])
    .flatMap((pattern) => {
      if (!pattern.endsWith("/*")) return [path.join(frontend, pattern)];
      const parent = path.join(frontend, pattern.slice(0, -2));
      if (!fs.existsSync(parent)) return [];
      return fs
        .readdirSync(parent, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(parent, entry.name));
    })
    .filter((folder) => fs.existsSync(path.join(folder, "package.json")));
}

/**
 * Returns every folder of skills, the repository's first.
 *
 * @returns {SkillRoot[]}
 */
export function skillRoots() {
  return [REPO_ROOT, ...workspaceFolders()]
    .map((base) => ({ base, skills: path.join(base, ".agents", "skills") }))
    .filter((root) => fs.existsSync(root.skills));
}
