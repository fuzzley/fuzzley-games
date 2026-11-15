#!/usr/bin/env node
/**
 * Verifies only what a branch changed: the root's checks, and the lint,
 * typecheck, tests, build and layout check of each workspace the change
 * reaches, side by side under a budget of the cores and the free memory,
 * the longest first: the root's `yarn verify:changed`.
 *
 *   yarn verify:changed
 *   yarn verify:changed --base main --dry-run
 *   yarn verify:changed --coverage
 *
 * `yarn verify` still runs everything, one step after another, and the
 * merge into `main` takes `yarn verify:full`. `@fz/dev/verify` holds what it
 * does, with its specs.
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runVerifyChanged } from "@fz/dev/verify";

/** The frontend's folder, whose workspaces it verifies. */
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

if (import.meta.main) {
  process.exitCode = await runVerifyChanged(process.argv.slice(2), ROOT);
}
