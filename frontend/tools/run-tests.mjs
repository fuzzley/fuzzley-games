#!/usr/bin/env node
/**
 * Runs a test script of every workspace that has one, the slowest first, a
 * few side by side, each Vitest on an equal share of the cores: the root's
 * `yarn test` and `yarn test:coverage`.
 *
 *   yarn test:coverage
 *   yarn test --jobs 2
 *   node tools/run-tests.mjs test:coverage --only solitaire --jobs 1
 *
 * Yarn's `foreach` starts workspaces by name, so the Solitaire Collection's
 * suite, the longest on one worker, would start thirteenth and run alone at
 * the end. `@fz/dev/workspaces` holds what it does, with its specs.
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runTestsScript } from "@fz/dev/workspaces";

/** The frontend's folder, whose workspaces it runs. */
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

if (import.meta.main) {
  process.exitCode = await runTestsScript(process.argv.slice(2), ROOT);
}
