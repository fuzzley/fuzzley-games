// What the tools share: where the site is, and how they report.

import path from "node:path";
import { fileURLToPath } from "node:url";

/** The site's folder, which every tool works in. */
export const SITE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * The workspace root, frontend/, which games.json's workspace paths are
 * relative to, as `yarn workspaces list` prints them.
 */
export const WORKSPACE_ROOT = path.resolve(SITE_DIR, "..");

/**
 * Returns a function that prints a line of progress under a script's name.
 *
 * @param {string} name
 * @returns {(message: string) => void}
 */
export function logger(name) {
  return (message) => {
    console.log(`${name}: ${message}`);
  };
}

/**
 * Returns what went wrong, from anything thrown.
 *
 * @param {unknown} error
 * @returns {string}
 */
export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
