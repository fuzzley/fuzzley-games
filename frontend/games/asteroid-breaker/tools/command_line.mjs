/**
 * What the scripts under `tools/` share in reading a command line, as
 * `@fz/dev/layout`'s `runLayoutScript()` reads the layout check's. It moves
 * into `@fz/dev` with the scripts' other copies, as the Asteroid Breaker
 * review's finding 21 plans.
 */
import { parseArgs } from "node:util";

/** @import { ParseArgsOptionsConfig } from "node:util" */

/**
 * What to print, and the code to exit with, for a command line that asks a
 * script for nothing: 0 for `--help`, and 2 for one it can't read.
 *
 * @typedef {object} Stop
 * @property {0 | 2} code
 * @property {string} message
 */

/**
 * Where a script prints, and what it loads from the game, each the script's
 * own unless a spec hands it another.
 *
 * @template Api
 * @typedef {object} ScriptIo
 * @property {() => Promise<Api>} [load] Loads what the script takes from the
 *   game.
 * @property {(line: string) => void} [print] Prints a line of its output.
 * @property {(line: string) => void} [printError] Prints a line of what went
 *   wrong.
 */

/**
 * The values a command line gives a script's options.
 *
 * @template {ParseArgsOptionsConfig} Options
 * @typedef {ReturnType<typeof parseArgs<{ args: string[], options: Options }>>["values"]} ArgValues
 */

/** The option every script takes, which asks for its usage. */
const HELP = /** @type {const} */ ({
  help: { type: "boolean", short: "h" },
});

/** Prints a script's output to stdout, and what went wrong to stderr. */
export const CONSOLE = {
  /** @param {string} line */
  print: (line) => {
    console.log(line);
  },
  /** @param {string} line */
  printError: (line) => {
    console.error(line);
  },
};

/**
 * Returns the values a command line gives a script's options, or, for
 * `--help` (`-h`), which every script takes, or one it can't read, what to
 * print and the code to exit with.
 *
 * @template {ParseArgsOptionsConfig} Options
 * @param {readonly string[]} args
 * @param {Options} options
 * @param {string} usage
 * @returns {ArgValues<Options> | Stop}
 */
export function readArgs(args, options, usage) {
  try {
    const { values } = parseArgs({
      args: [...args],
      options: { ...options, ...HELP },
    });
    // The values' type hangs on the options handed in, so TypeScript sees
    // `help` among them only once it is checked for.
    if ("help" in values && values.help === true) {
      return { code: 0, message: usage };
    }
    return values;
  } catch (error) {
    if (!isUsageError(error)) throw error;
    return misread(error.message, usage);
  }
}

/**
 * Returns the stop for a command line a script can't read: what is wrong
 * with it, a blank line, then the script's usage.
 *
 * @param {string} problem
 * @param {string} usage
 * @returns {Stop}
 */
export function misread(problem, usage) {
  return { code: 2, message: `${problem}\n\n${usage}` };
}

/**
 * Prints a stop's message, the usage asked for as output and a command line
 * misread as what went wrong, and returns the code to exit with.
 *
 * @param {Stop} stop
 * @param {(line: string) => void} print
 * @param {(line: string) => void} printError
 * @returns {number}
 */
export function stopWith(stop, print, printError) {
  if (stop.code === 0) print(stop.message);
  else printError(stop.message);
  return stop.code;
}

/**
 * Returns whether `parseArgs()` threw for a command line it can't read.
 *
 * @param {unknown} error
 * @returns {error is Error}
 */
function isUsageError(error) {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("ERR_PARSE_ARGS_")
  );
}
