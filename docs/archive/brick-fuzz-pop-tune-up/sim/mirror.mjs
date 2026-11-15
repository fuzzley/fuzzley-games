#!/usr/bin/env node
/**
 * Makes a scratch mirror of the Brick Fuzz Pop workspace, with the tune-up's
 * prototype of the rules in it, so the sim plays variants of the rules
 * without touching the game's files.
 *
 *   node docs/archive/brick-fuzz-pop-tune-up/sim/mirror.mjs [folder]
 *
 * The mirror is `<folder>/fz/frontend/games/brick-fuzz-pop`, its `src`,
 * `tools` and configs copied from the workspace, and `node_modules` and
 * `lib` linked from the real `frontend/`, so Vite resolves what the game
 * does. Over the copy it lays `variant.ts`, the switches a variant sets, and
 * `flight.patch`, which has `fly()` read them, and `tune_up.ts`, what the
 * sim measures. It prints the mirror's path. The folder is
 * `<tmp>/bfp-tune-up` unless one is given, and the mirror in it is made
 * again from nothing each time.
 */
import { execFileSync } from "node:child_process";
import { cp, mkdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SIM = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(SIM, "../../../../frontend");
const WORKSPACE = join(FRONTEND, "games/brick-fuzz-pop");

/** What the mirror copies of the workspace. */
const COPIED = [
  "src",
  "tools",
  "package.json",
  "eslint.config.js",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "tsconfig.scripts.json",
  "tsconfig.spec.json",
  "vite.config.ts",
  "vitest.config.ts",
  "index.html",
];

/**
 * Makes the mirror under a folder, and returns the mirrored workspace's
 * path.
 *
 * @param {string} folder
 * @returns {Promise<string>}
 */
export async function makeMirror(folder) {
  const frontend = join(folder, "fz/frontend");
  const workspace = join(frontend, "games/brick-fuzz-pop");
  // Only the mirror goes: the folder also holds what `run.mjs` counted.
  await rm(join(folder, "fz"), { recursive: true, force: true });
  await mkdir(workspace, { recursive: true });
  await symlink(join(FRONTEND, "node_modules"), join(frontend, "node_modules"));
  await symlink(join(FRONTEND, "lib"), join(frontend, "lib"));
  await cp(join(FRONTEND, "package.json"), join(frontend, "package.json"));
  for (const name of COPIED) {
    await cp(join(WORKSPACE, name), join(workspace, name), { recursive: true });
  }
  await cp(
    join(SIM, "variant.ts"),
    join(workspace, "src/rules/flight/variant.ts"),
  );
  await cp(join(SIM, "tune_up.ts"), join(workspace, "src/testing/tune_up.ts"));
  execFileSync("patch", ["-p1", "--quiet", "-i", join(SIM, "flight.patch")], {
    cwd: workspace,
    stdio: "inherit",
  });
  return workspace;
}

/** The folder the mirror is made under unless one is given. */
export const MIRROR_FOLDER = join(tmpdir(), "bfp-tune-up");

if (import.meta.main) {
  console.log(await makeMirror(resolve(process.argv[2] ?? MIRROR_FOLDER)));
}
