#!/usr/bin/env node
/**
 * Prints the game state in a bug report as JSON, for reading an issue's
 * state without a browser. It takes the report's whole Game state field,
 * the summary and the code fences too, from a file or the standard input:
 *
 *   node tools/read-report.mjs game-state.txt
 *   pbpaste | node tools/read-report.mjs
 *
 * It finds the state by its tag, whichever game's, and unpacks it with
 * `@fz/game-ui`'s codec, whose file imports nothing, so Node runs it with its
 * types stripped.
 */
import { readFile } from "node:fs/promises";
import { text } from "node:stream/consumers";
import {
  packedTag,
  unpackState,
} from "../lib/game-ui/src/bug_report/packed.ts";

/**
 * Returns the state packed in a report's text, under whichever game's tag it
 * carries, as indented JSON.
 *
 * @param {string} report
 * @returns {Promise<string>}
 * @throws {Error} Saying what is wrong: no state, a corrupt one, or one too
 *   large to unpack.
 */
export async function readReport(report) {
  const tag = packedTag(report);
  if (tag === undefined) {
    throw new Error("There is no game state in that text.");
  }
  return JSON.stringify(await unpackState(tag, report), null, 2);
}

if (import.meta.main) {
  const [file] = process.argv.slice(2);
  try {
    const report =
      file === undefined
        ? await text(process.stdin)
        : await readFile(file, "utf8");
    console.log(await readReport(report));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
