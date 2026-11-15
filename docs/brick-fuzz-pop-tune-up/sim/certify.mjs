#!/usr/bin/env node
/**
 * Certifies every level again under the rules the plan recommends, in a
 * scratch mirror, and writes how par moved.
 *
 *   node docs/brick-fuzz-pop-tune-up/sim/certify.mjs [--specs]
 *
 * It makes a mirror of its own (`<tmp>/bfp-tune-up/final`), sets
 * `RECOMMENDED` in its `variant.ts` and its boredom and its cap in
 * `tuning.ts`, runs the
 * game's own `tools/certify-levels.mjs` there, and writes the par it came
 * to beside the game's as `results/par.md`, with the new `par.json` as
 * `results/par.after.json`. The game's files are only read.
 *
 * With `--specs` it then runs the mirror's `sim` project, which replays
 * every certificate and holds every floor under the recommended rules, and
 * its `pure` project, whose failures are the specs the change must rewrite.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { MIRROR_FOLDER, makeMirror } from "./mirror.mjs";

const SIM = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(SIM, "../../../frontend/games/brick-fuzz-pop");
const PAR = "src/rules/levels/par.json";
const PRETTIER = resolve(SIM, "../../../frontend/node_modules/.bin/prettier");

/** How far a fuzzball flies bored under the recommended rules, in place of the game's 60. */
const BORED = 180;

/** The farthest a fuzzball flies under the recommended rules, in place of the game's 600. */
const MOST_FLIGHT = 900;

/** The recommended rules, as `variant.ts` writes them. */
const RECOMMENDED = `export const VARIANT: Variant = {
  resets: "breakable",
  mostIdle: 360,
  woolFirst: true,
  mostFlight: ${String(MOST_FLIGHT)},
  steelCosts: 0,
};`;

/**
 * Rewrites a file of the mirror, replacing what a pattern finds, and throws
 * if it finds nothing, so a game that moved on fails loudly.
 *
 * @param {string} path
 * @param {RegExp} pattern
 * @param {string} replacement
 * @returns {Promise<void>}
 */
async function rewrite(path, pattern, replacement) {
  const text = await readFile(path, "utf8");
  if (!pattern.test(text)) throw new Error(`Nothing to rewrite in ${path}.`);
  await writeFile(path, text.replace(pattern, replacement));
}

/**
 * Reads a par file: each level's par on each depth, by the level's id.
 *
 * @param {string} workspace
 * @returns {Promise<Record<string, Record<string, number>>>}
 */
async function readPar(workspace) {
  return JSON.parse(await readFile(join(workspace, PAR), "utf8"));
}

/**
 * Returns the comparison of two par files as Markdown: the totals, and a
 * row for each level whose par moved on some depth.
 *
 * @param {Record<string, Record<string, number>>} before
 * @param {Record<string, Record<string, number>>} after
 * @returns {string}
 */
function comparison(before, after) {
  let lower = 0;
  let same = 0;
  let higher = 0;
  let sumBefore = 0;
  let sumAfter = 0;
  /** @type {string[]} */
  const rows = [];
  const depths = Object.keys(Object.values(before)[0] ?? {});
  for (const [level, pars] of Object.entries(before)) {
    /** @type {string[]} */
    const cells = [];
    let moved = false;
    for (const depth of depths) {
      const was = pars[depth] ?? 0;
      const is = after[level]?.[depth] ?? 0;
      sumBefore += was;
      sumAfter += is;
      if (is < was) lower++;
      else if (is > was) higher++;
      else same++;
      moved ||= is !== was;
      cells.push(is === was ? String(was) : `${String(was)} → ${String(is)}`);
    }
    if (moved) rows.push(`| ${level} | ${cells.join(" | ")} |`);
  }
  return [
    "# Par under the recommended rules",
    "",
    `Written by \`certify.mjs\`: every level certified again in a scratch mirror with boredom at ${String(BORED)}, a touch on a brick that can break counting, held to 360 without a hit, the farthest a fuzzball flies at ${String(MOST_FLIGHT)}, and wool charging before the strike.`,
    "",
    `Of ${String(lower + same + higher)} pars, ${String(lower)} are lower, ${String(same)} the same and ${String(higher)} higher; their sum goes from ${String(sumBefore)} to ${String(sumAfter)}.`,
    "",
    "The levels whose par moved, by depth:",
    "",
    `| Level | ${depths.join(" | ")} |`,
    `| --- | ${depths.map(() => "---").join(" | ")} |`,
    ...rows,
    "",
  ].join("\n");
}

const { values } = parseArgs({ options: { specs: { type: "boolean" } } });
const workspace = await makeMirror(join(MIRROR_FOLDER, "final"));
await rewrite(
  join(workspace, "src/rules/flight/variant.ts"),
  /export const VARIANT: Variant = \{[^}]*\};/,
  RECOMMENDED,
);
await rewrite(
  join(workspace, "src/rules/tuning.ts"),
  /export const BORED = \d+;/,
  `export const BORED = ${String(BORED)};`,
);
await rewrite(
  join(workspace, "src/rules/tuning.ts"),
  /export const MOST_FLIGHT = \d+;/,
  `export const MOST_FLIGHT = ${String(MOST_FLIGHT)};`,
);
execFileSync("node", ["tools/certify-levels.mjs"], {
  cwd: workspace,
  stdio: "inherit",
});
const after = await readPar(workspace);
await writeFile(
  join(SIM, "results/par.after.json"),
  `${JSON.stringify(after, null, 2)}\n`,
);
await writeFile(
  join(SIM, "results/par.md"),
  comparison(await readPar(WORKSPACE), after),
);
// Formatted as the repository checks every file under docs/.
execFileSync(PRETTIER, ["--write", join(SIM, "results")], { stdio: "ignore" });
if (values.specs) {
  const vitest = join(workspace, "../../node_modules/.bin/vitest");
  for (const project of ["sim", "pure"]) {
    // A failing project is what this reports, so its exit code is not an error.
    spawnSync(vitest, ["run", "--project", project, "--reporter", "dot"], {
      cwd: workspace,
      stdio: "inherit",
    });
  }
}
