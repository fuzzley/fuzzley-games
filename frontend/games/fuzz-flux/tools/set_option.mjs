/**
 * The `--set` option of the scripts that play or prove the levels, and the
 * levels of the set it names.
 */
import { isStop, misread, readArgs } from "@fz/dev/script";

/** @import { Stop } from "@fz/dev/script" */

/**
 * What a command line asks a script for: a set's levels, by the set's id,
 * or every level.
 *
 * @typedef {object} SetRequest
 * @property {string | undefined} set
 */

/** Lists words as a message does, the last after "or". */
const OR_LIST = new Intl.ListFormat("en-GB", { type: "disjunction" });

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

/**
 * Returns the levels of the set a request names, in the order played, or
 * every level for none; or, for a set none of them is in, what to print,
 * naming the sets there are, and the code to exit with, after the
 * script's usage.
 *
 * @template {{ readonly set: { readonly id: string } }} Level
 * @param {readonly Level[]} levels
 * @param {SetRequest} request
 * @param {string} usage
 * @returns {ReadonlyArray<Level> | Stop}
 */
export function levelsOfSet(levels, { set }, usage) {
  const sets = [...new Set(levels.map((level) => level.set.id))];
  if (set !== undefined && !sets.includes(set)) {
    return misread(
      `--set takes ${OR_LIST.format(sets.map((id) => `"${id}"`))}, not "${set}".`,
      usage,
    );
  }
  return levels.filter((level) => set === undefined || level.set.id === set);
}
