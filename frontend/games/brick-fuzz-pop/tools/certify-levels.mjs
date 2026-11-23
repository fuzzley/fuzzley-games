#!/usr/bin/env node
/**
 * Finds a line that clears every level on every depth, and writes the lines
 * as the levels' certificates, with each level's par.
 *
 *   yarn certify:levels [--set <id>] [--level <id or number>] [--depth <n>]…
 *
 * It is `@fz/dev/certify`'s pool over the game: each of its threads loads
 * the solver and the rules through Vite (`CERTIFY_API` in
 * `src/testing/certify_api.ts`, the solver `solveLevel()` in
 * `src/testing/solver.ts`) and solves a level on a depth at a time. It
 * writes each set's lines to `src/rules/levels/certificates/<set>.json`, and
 * each level's par on each depth, from every set's lines, to
 * `src/rules/levels/par.json`, their keys sorted, so a run writes the same
 * bytes as the last unless a line changed. As each level is done, it prints
 * the rounds its lines take and how widely the solver searched for them. The
 * specs in `src/rules/levels/every_level/` replay every line, so a change to
 * the rules that breaks one fails them until this is run again.
 *
 * With `--set`, `--level` or `--depth`, it certifies only those, keeping the
 * other lines as they are written. It takes every core, so it waits its turn
 * in the queue `yarn verify:changed` keeps.
 *
 * It exits with 1 where a level has no line on a depth, leaving it none, and
 * with 2, saying why, for a command line it can't read, before it solves
 * anything.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { certifyLevels } from "@fz/dev/certify";

/** @import { CertifyGame } from "@fz/dev/certify" */

/**
 * Where the game keeps its certificates and its pars, and what the pool's
 * threads load of it.
 *
 * @type {CertifyGame}
 */
export const CERTIFY_GAME = {
  root: join(dirname(fileURLToPath(import.meta.url)), ".."),
  api: "src/testing/certify_api.ts",
  certificates: "src/rules/levels/certificates",
  par: "src/rules/levels/par.json",
};

if (import.meta.main) {
  process.exitCode = await certifyLevels(process.argv.slice(2), CERTIFY_GAME);
}
