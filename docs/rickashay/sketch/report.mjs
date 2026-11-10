// Prints the tables in the design's "The drafts": `node report.mjs`, or
// `node report.mjs quick` for fewer depths and games. It plays the levels
// side by side, a process each.
import { fork } from "node:child_process";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { LEVELS } from "./levels.mjs";
import { LEGEND, K, makeState } from "./sim.mjs";
import { blind, casual, everyAim, solve, sweetSpot } from "./solve.mjs";

const QUICK = process.argv.includes("quick");
const DEPTHS = QUICK
  ? [11, 13, 16, 22]
  : [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const GAMES = QUICK ? 12 : 40;
/** The fields the tables show side by side. */
const SHOWN = [11, 16, 22];

/** Returns the value a share `p` of a list lies under. */
function quantile(list, p) {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

/** Plays one level on every depth and returns its row of figures. */
function play(level) {
  let bricks = 0,
    hits = 0;
  for (const row of level.bricks)
    for (const ch of row) {
      const spec = LEGEND[ch];
      if (!spec || !K[spec[0]].needed) continue;
      bricks++;
      hits += spec[1];
    }
  const byDepth = {};
  for (const D of DEPTHS) {
    // The certificate: no brick the level needs ever in the row over the floor's.
    let line = solve(level, D, 1, 1);
    if (!line.won) line = solve(level, D, 4, 1, 2);
    if (!line.won) line = solve(level, D, 8, 1, 1);
    let won = 0,
      rounds = 0,
      jumps = 0,
      saves = 0,
      blindWon = 0;
    const rallies = [],
      bests = [];
    for (let seed = 1; seed <= GAMES; seed++) {
      const game = casual(level, D, seed);
      if (game.won) {
        won++;
        rounds += game.rounds;
        jumps += game.jumps;
      }
      saves += game.saves;
      rallies.push(...game.rallies);
      bests.push(Math.max(...game.rallies));
      if (blind(level, D, 1000 + seed).won) blindWon++;
    }
    let sweet = 0;
    for (const x of [1.5, 4.5, 7.5]) {
      const s = makeState(level, D);
      s.x = x;
      sweet += sweetSpot(everyAim(s), 8) / 3;
    }
    byDepth[D] = {
      solved: line.won ? line.rounds : null,
      top: line.won ? Math.max(...line.rallies) : 0,
      won: Math.round((100 * won) / GAMES),
      rounds: won ? rounds / won : 0,
      jumps: won ? jumps / won : 0,
      saves: saves / GAMES,
      rally: quantile(rallies, 0.5),
      best: quantile(bests, 0.5),
      blind: Math.round((100 * blindWon) / GAMES),
      sweet,
    };
  }
  return { rows: level.bricks.length, bricks, hits, byDepth };
}

if (process.send) {
  process.on("message", (index) => {
    process.send({ index, result: play(LEVELS[index]) });
  });
} else {
  const started = Date.now();
  const results = [];
  let next = 0;
  await new Promise((done) => {
    const workers = Math.min(availableParallelism(), LEVELS.length);
    let idle = 0;
    for (let w = 0; w < workers; w++) {
      const child = fork(fileURLToPath(import.meta.url), process.argv.slice(2));
      const give = () => {
        if (next < LEVELS.length) child.send(next++);
        else {
          child.disconnect();
          if (++idle === workers) done();
        }
      };
      child.on("message", ({ index, result }) => {
        results[index] = result;
        give();
      });
      give();
    }
  });
  const shown = (r, f) => SHOWN.map((D) => f(r.byDepth[D])).join(" / ");
  const all = (r, f) => DEPTHS.map((D) => f(r.byDepth[D]));
  console.log(
    "| #   | Level | Rows | Bricks | Hits | Solver's rounds | Its best rally | Cleared, % | Least | Its rounds | Its jumps | A round's rally | A game's best rally | Floor bounces | Sweet spot, ° | Narrowest | Blind, % | Most |",
  );
  console.log(
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  results.forEach((r, i) => {
    const solved = all(r, (d) => d.solved);
    const unsolved = DEPTHS.filter((D) => r.byDepth[D].solved === null);
    const rounds = solved.filter((n) => n !== null);
    const least = Math.min(...all(r, (d) => d.won));
    const leastOn = DEPTHS.find((D) => r.byDepth[D].won === least);
    const narrowest = Math.min(...all(r, (d) => d.sweet));
    const narrowestOn = DEPTHS.find((D) => r.byDepth[D].sweet === narrowest);
    const most = Math.max(...all(r, (d) => d.blind));
    const mostOn = DEPTHS.find((D) => r.byDepth[D].blind === most);
    console.log(
      `| ${i + 1} | ${LEVELS[i].name} | ${r.rows} | ${r.bricks} | ${r.hits} | ${
        unsolved.length
          ? `NONE on ${unsolved.join(",")}`
          : `${Math.min(...rounds)}-${Math.max(...rounds)}`
      } | ${Math.min(...all(r, (d) => d.top))}-${Math.max(...all(r, (d) => d.top))} | ${shown(r, (d) => d.won)} | ${least}${least < 100 ? `, on ${leastOn}` : ""} | ${shown(r, (d) => d.rounds.toFixed(0))} | ${shown(r, (d) => d.jumps.toFixed(1))} | ${shown(r, (d) => d.rally)} | ${shown(r, (d) => d.best)} | ${shown(r, (d) => d.saves.toFixed(1))} | ${shown(r, (d) => d.sweet.toFixed(1))} | ${narrowest.toFixed(2)}, on ${narrowestOn} | ${shown(r, (d) => d.blind)} | ${most}${most > 0 ? `, on ${mostOn}` : ""} |`,
    );
  });
  console.log(`\n${((Date.now() - started) / 1000).toFixed(0)} s`);
}
