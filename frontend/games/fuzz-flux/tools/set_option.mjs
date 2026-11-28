/**
 * The `--set` option of the scripts that play or prove the levels, whose
 * levels `@fz/dev/script`'s `levelsOfSet()` picks.
 */
import { isStop, readArgs } from "@fz/dev/script";

/** @import { Stop } from "@fz/dev/script" */

/**
 * What a command line asks a script for: a set's levels, by the set's id,
 * or every level.
 *
 * @typedef {object} SetRequest
 * @property {string | undefined} set
 */

/**
 * Returns what a command line asks a script for, or, for `--help` or one
 * it can't read, what to print and the code to exit with, after the
 * script's usage.
 *
 * @param {readonly string[]} args
 * @param {string} usage
 * @returns {SetRequest | Stop}
 */
export function readSetOption(args, usage) {
  const read = readArgs(args, { options: { set: { type: "string" } }, usage });
  if (isStop(read)) return read;
  return { set: read.values.set };
}
