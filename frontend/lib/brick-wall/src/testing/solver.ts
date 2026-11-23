// The solver a wall game's levels' certificates are found by, and the replay
// that holds a certificate to its level, each over the game's LinePlay: how
// it plays a level on a field of a depth. A line found in Node must clear its
// level in every browser, so this is held as the rules are
// (eslint.config.js), to their fence and their exact arithmetic.

import {
  DANGER_ROW,
  type Wall,
  type WallRules,
  inDanger,
  lowestNeededRow,
} from "../rules/wall";

/** A line of shots, played in turn from a level's opening, as a certificate keeps it, each shot as its game's certificates keep one. */
export type Line<C> = readonly C[];

/** Names how a round leaves its level: still on, cleared or lost. */
export type LineResult = "on" | "cleared" | "lost";

/** Describes a round a line played, so far as the solver and the careless player read it. */
export interface PlayedRound<T> {
  readonly outcome: {
    readonly result: LineResult;
    /** Whether the wall jumped after it. */
    readonly jumped: boolean;
  };
  /** Where the next round starts. */
  readonly next: T;
}

/** Describes where a wall game's round starts, so far as the solver reads it: the wall standing. */
export interface WallStart<K extends string> {
  readonly wall: Wall<K>;
}

/**
 * Describes how a wall game plays a level on a field of a depth, which the
 * solver searches, a replay plays and the careless player plays: where it
 * opens, every shot a round can take, a shot played, what tells one round's
 * start from another, how well a round leaves the level, and which kinds of
 * brick it needs broken.
 */
export interface LinePlay<K extends string, T extends WallStart<K>, C> {
  /** Where the level's first round starts. */
  readonly opening: T;
  /** Every shot a round can take, by aim: each aim's, in the order tried, and one at least in all. */
  readonly shots: readonly (readonly C[])[];
  /** Returns the round a shot plays from where a round starts, throwing a `RangeError` for a shot that isn't one. */
  readonly play: (start: T, shot: C) => PlayedRound<T>;
  /** Returns what tells one round's start from another: two starts of one key play alike. */
  readonly keyOf: (start: T) => string;
  /** Returns how well a round left the level, the higher the better, given the rounds the level has played, this one among them. */
  readonly score: (round: PlayedRound<T>, rounds: number) => number;
  /** Says which kinds of brick the level needs broken, as the wall's rules read them. */
  readonly wallRules: Pick<WallRules<K>, "needed">;
}

/** Describes how widely the solver searches: the aims it tries, and how many walls it keeps after each round. */
export interface Search {
  /** How many aims apart the aims it tries stand: 4, every fourth, or 1, every one. */
  readonly aimStep: 4 | 1;
  /** How many of the best walls it keeps after each round: 1, greedy, or 4. */
  readonly beam: 1 | 4;
}

/**
 * The searches the solver tries in turn, till one finds a line: greedy at
 * every fourth aim, then a beam of 4, then every aim.
 */
export const SEARCHES: readonly Search[] = [
  { aimStep: 4, beam: 1 },
  { aimStep: 4, beam: 4 },
  { aimStep: 1, beam: 4 },
];

/** The most rounds a line may take: a search gives up past them. */
export const SOLVER_ROUNDS = 40;

/** Describes a line the solver found: its shots, how many of its rounds jumped the wall, and the search that found it. */
export interface Solved<C> {
  readonly line: Line<C>;
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

/** Describes a wall the search has come to: where the next round starts, the line there, and its jumps. */
interface Reached<T, C> {
  readonly start: T;
  readonly line: Line<C>;
  readonly jumps: number;
}

/** Describes a wall a round came to, measured, which the search may keep. */
interface Measured<T, C> extends Reached<T, C> {
  readonly score: number;
}

/**
 * Returns a line that clears a level as a game plays it, found by the
 * first of {@link SEARCHES} that finds one, or null if none does. A line
 * counts only if no brick the level needs stands in the danger row between
 * its rounds, so no certificate wins by a hair.
 *
 * Its shots are tried in the order the game gives them and its ties broken
 * one way, so it finds the same line every run.
 */
export function solveLine<K extends string, T extends WallStart<K>, C>(
  play: LinePlay<K, T, C>,
): Solved<C> | null {
  for (const search of SEARCHES) {
    const found = searchLine(play, search);
    if (found) return { ...found, search };
  }
  return null;
}

/**
 * Returns how a line plays a level as its game plays it: round by round
 * till the line ends or its level does. It throws what the game's `play()`
 * throws for a shot that isn't one.
 *
 * A certificate holds only if its line clears the level in as many rounds
 * as it has shots, every needed brick kept over `DANGER_ROW` between them
 * (`leastRow`): a line that clears early says its par is wrong.
 */
export function replayLine<K extends string, T extends WallStart<K>, C>(
  play: LinePlay<K, T, C>,
  line: Line<C>,
): LinePlayed {
  let start = play.opening;
  let jumps = 0;
  let leastRow = Number.POSITIVE_INFINITY;
  for (const [played, shot] of line.entries()) {
    const { outcome, next } = play.play(start, shot);
    jumps += outcome.jumped ? 1 : 0;
    if (outcome.result !== "on") {
      const cleared = outcome.result === "cleared";
      return { cleared, rounds: played + 1, jumps, leastRow };
    }
    leastRow = Math.min(leastRow, lowestNeededRow(next.wall, play.wallRules));
    start = next;
  }
  return { cleared: false, rounds: line.length, jumps, leastRow };
}

/**
 * Returns whether a line holds as a certificate, as {@link replayLine}
 * played it: clearing its level in as many rounds as it has shots, every
 * needed brick kept over `DANGER_ROW` between them.
 */
export function lineHolds(line: Line<unknown>, played: LinePlayed): boolean {
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
function searchLine<K extends string, T extends WallStart<K>, C>(
  play: LinePlay<K, T, C>,
  { aimStep, beam }: Search,
): Omit<Solved<C>, "search"> | null {
  const shots = play.shots.filter((_, aim) => aim % aimStep === 0).flat();
  const seen = new Set([play.keyOf(play.opening)]);
  let kept: readonly Reached<T, C>[] = [
    { start: play.opening, line: [], jumps: 0 },
  ];
  for (let rounds = 1; rounds <= SOLVER_ROUNDS && kept.length > 0; rounds++) {
    const measured: Measured<T, C>[] = [];
    for (const reached of kept) {
      for (const shot of shots) {
        const round = play.play(reached.start, shot);
        const line = [...reached.line, shot];
        const jumps = reached.jumps + (round.outcome.jumped ? 1 : 0);
        if (round.outcome.result === "cleared") return { line, jumps };
        if (
          round.outcome.result === "on" &&
          !inDanger(round.next.wall, play.wallRules)
        ) {
          const score = play.score(round, rounds);
          measured.push({ start: round.next, line, jumps, score });
        }
      }
    }
    kept = bestUnseen(measured, beam, seen, play.keyOf);
  }
  return null;
}

/**
 * Returns the best of some walls by their measure, as many as the beam
 * keeps, skipping any the search has seen, and marks them seen. Ties keep
 * the order the walls were reached in.
 */
function bestUnseen<T, C>(
  measured: readonly Measured<T, C>[],
  beam: number,
  seen: Set<string>,
  keyOf: (start: T) => string,
): Reached<T, C>[] {
  const best: Reached<T, C>[] = [];
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
