// Prints the two tables of ../plan.md's "The drafts", for every wall on
// every field depth from 11 to 22: the rounds the solver took, never letting a
// brick the wall needs into the row over the floor's, and how the careless
// player did in forty games. It plays the walls side by side, one process
// each, and takes a few minutes.
import { execFile } from "node:child_process";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { LEVELS } from "./levels.mjs";
import { K, makeState } from "./sim.mjs";
import { casual, solve } from "./solve.mjs";

const DEPTHS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
// The depths the first table shows: the shallowest field, a middling one and the deepest.
const SHOWN = [11, 16, 22];
// The certificate's margin: no brick a wall needs in the row over the floor's.
const MARGIN = 1;
const GAMES = 40;

/** Returns what the solver and the careless player made of the wall at an index, by depth. */
function play(index) {
  const level = LEVELS[index];
  let hits = 0;
  let bricks = 0;
  for (const brick of makeState(level, 22).bricks.values()) {
    if (!K[brick.k].needed) continue;
    hits += brick.hp;
    bricks++;
  }
  const depths = DEPTHS.map((depth) => {
    let line = solve(level, depth, 1, MARGIN);
    if (!line.won) line = solve(level, depth, 4, MARGIN);
    let wins = 0;
    let rounds = 0;
    let jumps = 0;
    for (let seed = 1; seed <= GAMES; seed++) {
      const game = casual(level, depth, seed * 7919 + index);
      jumps += game.jumps;
      if (!game.won) continue;
      wins++;
      rounds += game.rounds;
    }
    return {
      depth,
      solved: line.won ? line.rounds : null,
      cleared: Math.round((wins / GAMES) * 100),
      rounds: wins ? rounds / wins : null,
      jumps: jumps / GAMES,
    };
  });
  return {
    name: level.name,
    boon: level.boon,
    rows: level.rows.length,
    bricks,
    hits,
    depths,
  };
}

/** Returns what `play()` makes of a wall, played in a process of its own. */
function playApart(index) {
  return new Promise((resolve, reject) => {
    const script = fileURLToPath(import.meta.url);
    execFile(process.execPath, [script, String(index)], (error, stdout) => {
      if (error) reject(error);
      else resolve(JSON.parse(stdout));
    });
  });
}

/** Returns every wall's result, playing as many at once as the machine has cores. */
async function playAll() {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < LEVELS.length) {
      const index = next++;
      results[index] = await playApart(index);
    }
  };
  await Promise.all(Array.from({ length: availableParallelism() }, worker));
  return results;
}

if (process.argv[2] !== undefined) {
  console.log(JSON.stringify(play(Number(process.argv[2]))));
} else {
  const started = performance.now();
  const results = await playAll();
  const one = (number) => (number === null ? "-" : number.toFixed(0));
  console.log(
    "| # | Level | Boon | Rows | Bricks | Hits | Solver's rounds | Cleared, % | Its rounds | Its jumps |",
  );
  console.log("| - | - | - | - | - | - | - | - | - | - |");
  results.forEach((result, index) => {
    const solved = result.depths.map((at) => at.solved);
    const unsolved = result.depths.filter((at) => at.solved === null);
    const span = unsolved.length
      ? `NOT SOLVED at ${unsolved.map((at) => at.depth).join(", ")}`
      : `${Math.min(...solved)}-${Math.max(...solved)}`;
    const shown = SHOWN.map((depth) =>
      result.depths.find((at) => at.depth === depth),
    );
    console.log(
      `| ${index + 1} | ${result.name} | ${result.boon} | ${result.rows} | ${result.bricks} | ${result.hits} | ${span} | ${shown.map((at) => at.cleared).join(" / ")} | ${shown.map((at) => one(at.rounds)).join(" / ")} | ${shown.map((at) => at.jumps.toFixed(1)).join(" / ")} |`,
    );
  });
  console.log("");
  console.log(`| # | Level | ${DEPTHS.join(" | ")} | Least |`);
  console.log(`| - | - | ${DEPTHS.map(() => "-").join(" | ")} | - |`);
  results.forEach((result, index) => {
    const cleared = result.depths.map((at) => at.cleared);
    console.log(
      `| ${index + 1} | ${result.name} | ${cleared.join(" | ")} | ${Math.min(...cleared)} |`,
    );
  });
  console.log("");
  console.log(`${((performance.now() - started) / 1000).toFixed(0)} s`);
}
