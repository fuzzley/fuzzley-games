#!/usr/bin/env node
/**
 * Runs TypeScript 7's `tsc` on its arguments and exits as it does, for the
 * type-check passes that need no compiler API (`src/tsc7.ts`).
 *
 *   tsc7 -p tsconfig.spec.json --noEmit
 */
import { runTsc7 } from "../src/tsc7.ts";

process.exitCode = runTsc7(process.argv.slice(2));
