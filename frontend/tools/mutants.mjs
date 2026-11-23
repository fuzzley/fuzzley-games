#!/usr/bin/env node
/**
 * Runs a mutation pass over a workspace: breaks its code one mutant at a
 * time, from a list kept outside the repository, runs the specs that should
 * catch each, puts each file back whatever the run came to, on a signal
 * too, and prints the table for the commit's body: the root's
 * `yarn mutants`.
 *
 *   yarn mutants games/brick-fuzz-pop /tmp/pass/mutants.json
 *   yarn mutants --help
 *
 * It waits its turn in the queue `yarn verify:changed` keeps.
 * `@fz/dev/mutants` holds what it does, with its specs.
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMutants } from "@fz/dev/mutants";

/** The frontend's folder, whose workspaces it mutates. */
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

if (import.meta.main) {
  process.exitCode = await runMutants(process.argv.slice(2), ROOT);
}
