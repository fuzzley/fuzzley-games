// Runs TypeScript 7's compiler, which `@fz/dev` installs as
// `@typescript/native`, for the type-check passes that need no compiler API:
// the `tsc7` binary every workspace's `typecheck` runs. `ngc`, ESLint and
// Analog's plugin load TypeScript 6, as `typescript`, which 7 can't stand in
// for until it has an API.

import { type StdioOptions, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Returns the path of TypeScript 7's `tsc` script, from the package
 * installed as `@typescript/native`, an alias, so that its `tsc` binary
 * takes nothing from TypeScript 6's.
 */
export function tsc7Script(): string {
  const manifest = createRequire(import.meta.url).resolve(
    "@typescript/native/package.json",
  );
  return join(dirname(manifest), "bin/tsc");
}

/** Says where {@link runTsc7} runs and where what it prints goes. */
export interface Tsc7Options {
  /** The folder it runs in, the process's own unless given. */
  readonly cwd?: string;
  /** Where what it prints goes, the process's own output unless given. */
  readonly stdio?: StdioOptions;
}

/**
 * Runs TypeScript 7's `tsc` on its arguments, and returns the code it exited
 * with, 1 where a signal ended it.
 */
export function runTsc7(
  args: readonly string[],
  { cwd = process.cwd(), stdio = "inherit" }: Tsc7Options = {},
): number {
  const { status, error } = spawnSync(
    process.execPath,
    [tsc7Script(), ...args],
    { cwd, stdio },
  );
  if (error) throw error;
  return status ?? 1;
}
