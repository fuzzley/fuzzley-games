// What the tools share: where the frontend is, and how they report.

import path from "node:path";
import { fileURLToPath } from "node:url";

/** The frontend's folder, which every tool works in. */
export const FRONTEND_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

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
