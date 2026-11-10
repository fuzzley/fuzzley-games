#!/usr/bin/env node
// Checks the draft levels of the Brick Breaker uplift, and prints what each
// asks for.
//
//   node docs/brick-breaker-uplift/levels/check-levels.mjs
//
// A draft is no level of the game until the autopilot has cleared it, and the
// kinds the plan adds have no rules for it to play by yet. Until they do,
// this holds each draft to what can be told from its picture: its shape, its
// characters, its pairs, and that a ball can come at every brick the level
// needs, by the rules the plan gives each kind. It exits with 1 where a draft
// fails.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGEND } from "../art/scene.mjs";
import { GAME_LEVELS, asksOf } from "../art/levels.mjs";

/** @import { LevelData, SetData } from "../art/levels.mjs" */
/** @import { Cell } from "../art/scene.mjs" */

const here = import.meta.dirname;
const COLUMNS = 13;
const ROWS = 16;

/** The kinds a ball never breaks, whatever comes at them. */
const NEVER = new Set(["steel", "bumper", "portal"]);

/**
 * Reads a set of drafts.
 *
 * @param {string} id
 * @returns {SetData}
 */
function readSet(id) {
  return JSON.parse(readFileSync(join(here, `${id}.json`), "utf8"));
}

/**
 * Returns what is wrong with a level's shape and characters.
 *
 * @param {LevelData} level
 * @returns {string[]}
 */
function shapeFaults(level) {
  /** @type {string[]} */
  const faults = [];
  const rows = level.bricks;
  if (rows.length === 0 || rows.length > ROWS) {
    faults.push(`has ${rows.length} rows, not 1 to ${ROWS}`);
  }
  rows.forEach((row, r) => {
    if (row.length !== COLUMNS) {
      faults.push(`row ${r} is ${row.length} wide, not ${COLUMNS}`);
    }
    for (const character of row) {
      if (character !== "." && !LEGEND[character]) {
        faults.push(`row ${r} holds "${character}", which no legend has`);
      }
    }
    const ways = new Set([...row].filter((c) => c === ">" || c === "<"));
    if (ways.size > 1) faults.push(`row ${r} has sliders going both ways`);
  });
  if (level.tints) {
    if (level.tints.length !== rows.length) {
      faults.push("has tints of another height than its bricks");
    }
    level.tints.forEach((row, r) => {
      if (!/^[.1-8]{13}$/.test(row)) faults.push(`tints' row ${r} is misdrawn`);
    });
  }
  const all = rows.join("");
  for (const portal of ["@", "%"]) {
    const count = [...all].filter((c) => c === portal).length;
    if (count !== 0 && count !== 2) {
      faults.push(`has ${count} of the portal "${portal}", not a pair`);
    }
  }
  const keys = all.includes("k");
  const gates = all.includes("=");
  if (keys !== gates)
    faults.push("has keys with no gate, or a gate no key opens");
  return faults;
}

/**
 * Returns the bricks a level needs that no ball can come at: it opens the
 * field from the paddle's side, breaks each brick an open cell lies beside,
 * as its kind allows, and goes on until nothing more breaks.
 *
 * A plated brick breaks only from above or a side, a gate goes when the last
 * key has, and a portal joins the cells beside it to those beside its twin.
 *
 * @param {LevelData} level
 * @returns {string[]} Each as "row,column".
 */
function unreached(level) {
  const height = level.bricks.length;
  // A row is added above the bricks, for the room under the top wall, and
  // one below them, for the open field.
  /** @type {(Cell | null)[][]} */
  const grid = [
    Array.from({ length: COLUMNS }, () => null),
    ...level.bricks.map((row) => [...row].map((c) => LEGEND[c] ?? null)),
    Array.from({ length: COLUMNS }, () => null),
  ];
  const last = height + 1;
  /** @type {(r: number, c: number) => boolean} */
  const inside = (r, c) => r >= 0 && r <= last && c >= 0 && c < COLUMNS;
  const sides = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  /** @type {(pair: number | undefined, r: number, c: number) => [number, number] | undefined} */
  const twinOf = (pair, r, c) => {
    for (let tr = 0; tr <= last; tr++) {
      for (let tc = 0; tc < COLUMNS; tc++) {
        const cell = grid[tr][tc];
        if (
          cell?.kind === "portal" &&
          cell.pair === pair &&
          (tr !== r || tc !== c)
        ) {
          return [tr, tc];
        }
      }
    }
    return undefined;
  };

  for (;;) {
    // The cells a ball can be in: the open ones joined to the field below.
    const open = grid.map((row) => row.map(() => false));
    /** @type {[number, number][]} */
    const queue = [];
    for (let c = 0; c < COLUMNS; c++) {
      open[last][c] = true;
      queue.push([last, c]);
    }
    while (queue.length > 0) {
      const [r, c] = /** @type {[number, number]} */ (queue.pop());
      for (const [dr, dc] of sides) {
        let nr = r + dr;
        let nc = c + dc;
        if (!inside(nr, nc)) continue;
        const cell = grid[nr][nc];
        if (cell?.kind === "portal") {
          // A ball that goes in comes out of the twin, so it can be there.
          const twin = twinOf(cell.pair, nr, nc);
          if (!twin) continue;
          [nr, nc] = twin;
        } else if (cell) {
          continue;
        }
        if (open[nr][nc]) continue;
        open[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }

    let broke = false;
    const keysLeft = grid.some((row) =>
      row.some((cell) => cell?.kind === "key"),
    );
    for (let r = 1; r <= height; r++) {
      for (let c = 0; c < COLUMNS; c++) {
        const cell = grid[r][c];
        if (!cell || NEVER.has(cell.kind)) continue;
        if (cell.kind === "gate") {
          if (!keysLeft) {
            grid[r][c] = null;
            broke = true;
          }
          continue;
        }
        const from =
          cell.kind === "plated" ? sides.filter(([dr]) => dr !== 1) : sides;
        if (
          from.some(
            ([dr, dc]) => inside(r + dr, c + dc) && open[r + dr][c + dc],
          )
        ) {
          grid[r][c] = null;
          broke = true;
        }
      }
    }
    if (!broke) break;
  }

  /** @type {string[]} */
  const left = [];
  for (let r = 1; r <= height; r++) {
    for (let c = 0; c < COLUMNS; c++) {
      if (grid[r][c]?.needed) left.push(`${r - 1},${c}`);
    }
  }
  return left;
}

/**
 * Checks every set of drafts and prints what each level asks for.
 *
 * @returns {number} How many levels failed.
 */
function main() {
  const gameIds = new Set(GAME_LEVELS.map((level) => level.id));
  /** @type {Set<string>} */
  const seen = new Set();
  let failed = 0;
  let number = GAME_LEVELS.length;
  for (const id of ["revisions", "friends", "machines"]) {
    const set = readSet(id);
    console.log(`\n${set.name}`);
    for (const level of set.levels) {
      const faults = shapeFaults(level);
      const redrawn = id === "revisions";
      if (redrawn !== gameIds.has(level.id)) {
        faults.push(
          redrawn ? "redraws no level of the game" : "takes an id the game has",
        );
      }
      if (seen.has(level.id)) faults.push("has an id another draft has");
      seen.add(level.id);
      if (faults.length === 0) {
        const left = unreached(level);
        if (left.length > 0)
          faults.push(`needs bricks no ball reaches: ${left.join(" ")}`);
      }
      const { needed, hits, kinds } = asksOf(level);
      const was = redrawn
        ? GAME_LEVELS.find((entry) => entry.id === level.id)
        : undefined;
      const before = was ? asksOf(was) : undefined;
      const label = was ? String(was.number) : String((number += 1));
      console.log(
        `  ${label.padStart(2)}  ${level.name.padEnd(16)} ${String(needed).padStart(3)} bricks ${String(hits).padStart(3)} hits` +
          (before ? `  (was ${before.needed} and ${before.hits})` : "") +
          (kinds.length > 0 ? `  ${kinds.join(", ")}` : ""),
      );
      for (const fault of faults) console.log(`      FAILS: ${fault}`);
      if (faults.length > 0) failed += 1;
    }
  }
  console.log(
    failed === 0 ? "\nEvery draft holds." : `\n${failed} drafts fail.`,
  );
  return failed;
}

process.exitCode = main() === 0 ? 0 : 1;
