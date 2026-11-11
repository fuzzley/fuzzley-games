// The solver the levels' certificates are found by, and the replay that
// holds a certificate to its level (docs/brick-fuzz-pop/plan.md, "The
// guarantee"). A line found in Node must clear its level in every browser,
// so it is held as the rules are (eslint.config.js), to their fence and
// their exact arithmetic.

import { type Line, shotOf } from "../rules/levels/certificate";
import { type Level, levelStart } from "../rules/levels/level";
import {
  RULES,
  type RoundRules,
  type RoundStart,
  playRound,
} from "../rules/round/round";
import { type Charge, type Shot, isCharge } from "../rules/shot";
import { AIM_COUNT, MOST_CHARGE } from "../rules/tuning";
import { DANGER_ROW, inDanger, lowestNeededRow } from "../rules/wall/lower";
import { wallScore } from "./wall_score";

// P3's scripts and specs were built to take a certificate's types from here.
export type { CertifiedShot, Line } from "../rules/levels/certificate";

/** Describes how widely the solver searches: the aims it tries, and how many walls it keeps after each round. */
export interface Search {
  /** How many aims apart the aims it tries stand: 4, every fourth, or 1, every one. */
  readonly aimStep: 4 | 1;
  /** How many of the best walls it keeps after each round: 1, greedy, or 4. */
  readonly beam: 1 | 4;
}

/**
 * The searches the solver tries in turn, till one finds a line: greedy at
 * every fourth aim, 165 aims and 6 charges a round, then a beam of 4, then
 * every aim.
 */
export const SEARCHES: readonly Search[] = [
  { aimStep: 4, beam: 1 },
  { aimStep: 4, beam: 4 },
  { aimStep: 1, beam: 4 },
];

/** The most rounds a line may take: a search gives up past them. */
export const SOLVER_ROUNDS = 40;

/** Describes a line the solver found: its shots, how many of its rounds jumped the wall, and the search that found it. */
export interface Solved {
  readonly line: Line;
  readonly jumps: number;
  readonly search: Search;
}

/** Describes how a level was played: whether it was cleared, its rounds and their jumps, and how low the wall came. */
export interface LinePlayed {
  readonly cleared: boolean;
  readonly rounds: number;
  readonly jumps: number;
  /** The lowest field row a brick the level needs stood in between rounds, or Infinity where no round left the level on. */
  readonly leastRow: number;
}

/** Every charge, in the order the solver tries them. */
const CHARGES: readonly Charge[] = Array.from(
  { length: MOST_CHARGE + 1 },
  (_, charge) => charge,
).filter(isCharge);

/** Describes a wall the search has come to: where the next round starts, the line there, and its jumps. */
interface Reached {
  readonly start: RoundStart;
  readonly line: Line;
  readonly jumps: number;
}

/** Describes a wall a round came to, measured, which the search may keep. */
interface Measured extends Reached {
  readonly score: number;
}

/**
 * Returns a line that clears a level on a field of a depth, found by the
 * first of {@link SEARCHES} that finds one, or null if none does. A line
 * counts only if no brick the level needs stands in the danger row between
 * its rounds, so no certificate wins by a hair.
 *
 * Its shots are tried in one order and its ties broken one way, so it
 * finds the same line every run.
 */
export function solveLevel(
  level: Level,
  depth: number,
  rules: RoundRules = RULES,
): Solved | null {
  for (const search of SEARCHES) {
    const found = searchLine(level, depth, search, rules);
    if (found) return { ...found, search };
  }
  return null;
}

/**
 * Returns how a line plays a level on a field of a depth through
 * `playRound()`, as the game plays it: round by round till the line ends
 * or its level does. It throws a `RangeError` for a shot that isn't one.
 *
 * A certificate holds only if its line clears the level in as many rounds
 * as it has shots, every needed brick kept over `DANGER_ROW` between them
 * (`leastRow`): a line that clears early says its par is wrong.
 */
export function replayLine(
  level: Level,
  depth: number,
  line: Line,
  rules: RoundRules = RULES,
): LinePlayed {
  let start = levelStart(level, depth);
  let jumps = 0;
  let leastRow = Number.POSITIVE_INFINITY;
  for (const [played, certified] of line.entries()) {
    const { outcome, next } = playRound(
      start,
      shotOf(certified),
      level.boon,
      rules,
    );
    jumps += outcome.jumped ? 1 : 0;
    if (outcome.result !== "on") {
      const cleared = outcome.result === "cleared";
      return { cleared, rounds: played + 1, jumps, leastRow };
    }
    leastRow = Math.min(leastRow, lowestNeededRow(next.wall));
    start = next;
  }
  return { cleared: false, rounds: line.length, jumps, leastRow };
}

/**
 * Returns whether a line holds as a certificate, as {@link replayLine}
 * played it: clearing its level in as many rounds as it has shots, every
 * needed brick kept over `DANGER_ROW` between them.
 */
export function lineHolds(line: Line, played: LinePlayed): boolean {
  return (
    played.cleared &&
    played.rounds === line.length &&
    played.leastRow > DANGER_ROW
  );
}

/**
 * Returns a line that clears a level by a search, and its jumps, or null:
 * each round every shot it tries from each wall it keeps, a line clearing
 * the level at once, then the best walls left that it hasn't seen, by
 * their measure, kept for the next round.
 */
function searchLine(
  level: Level,
  depth: number,
  { aimStep, beam }: Search,
  rules: RoundRules,
): Omit<Solved, "search"> | null {
  const shots = shotsEvery(aimStep);
  const start = levelStart(level, depth);
  const seen = new Set([keyOf(start)]);
  let kept: readonly Reached[] = [{ start, line: [], jumps: 0 }];
  for (let rounds = 1; rounds <= SOLVER_ROUNDS && kept.length > 0; rounds++) {
    const measured: Measured[] = [];
    for (const reached of kept) {
      for (const shot of shots) {
        const round = playRound(reached.start, shot, level.boon, rules);
        const line = [...reached.line, [shot.aim, shot.charge] as const];
        const jumps = reached.jumps + (round.outcome.jumped ? 1 : 0);
        if (round.outcome.result === "cleared") return { line, jumps };
        if (round.outcome.result === "on" && !inDanger(round.next.wall)) {
          const score = wallScore(round, rounds);
          measured.push({ start: round.next, line, jumps, score });
        }
      }
    }
    kept = bestUnseen(measured, beam, seen);
  }
  return null;
}

/** Returns the shots at every so many aims from the first, each at every charge, in the order the solver tries them. */
function shotsEvery(aimStep: number): Shot[] {
  const shots: Shot[] = [];
  for (let aim = 0; aim < AIM_COUNT; aim += aimStep) {
    for (const charge of CHARGES) {
      shots.push({ aim, charge });
    }
  }
  return shots;
}

/**
 * Returns the best of some walls by their measure, as many as the beam
 * keeps, skipping any the search has seen, and marks them seen. Ties keep
 * the order the walls were reached in.
 */
function bestUnseen(
  measured: readonly Measured[],
  beam: number,
  seen: Set<string>,
): Reached[] {
  const best: Reached[] = [];
  for (const wall of [...measured].sort((a, b) => b.score - a.score)) {
    if (best.length === beam) break;
    const key = keyOf(wall.start);
    if (!seen.has(key)) {
      seen.add(key);
      best.push(wall);
    }
  }
  return best;
}

/** Returns what tells one round's start from another: its wall's hits and height, where the fuzzball waits, the crew and the boon. */
function keyOf({ wall, x, crew, boon }: RoundStart): string {
  const hits = wall.bricks.map((brick) => brick?.hits ?? ".").join(",");
  return `${hits}|${String(wall.lowestRow)}|${String(x)}|${crew.friends.join(",")}|${String(boon)}`;
}
