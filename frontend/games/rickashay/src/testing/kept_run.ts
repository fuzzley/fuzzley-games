// A run as the game keeps one, played part way into its level, for the
// scripts under `tools/` to hand a page to take up. It plays rounds as the
// rules play them, so it is held as the rules are (eslint.config.js), to
// their fence and their exact arithmetic.

import type { Aim } from "@fz/brick-wall/rules/aims";
import { createRun, startLevel, takeRound } from "@fz/brick-wall/rules/run";
import type { LevelEntry } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import { levelOf, openingOf, runRulesOf } from "../rules/run/run";
import { type SavedGame, saveGame } from "../rules/run/saved_game";
import type { Marks } from "../rules/run/stars";
import { FLIGHT_RULES } from "../rules/tuning";

/** Describes a run begun at a level on a field of a depth, and the rounds played into it. */
export interface KeptRun {
  /** The level it began at, by its number. */
  readonly level: number;
  /** The field's depth as the level began, 11 to 22. */
  readonly depth: number;
  /** The aim of each round played, by its index, as a certificate keeps one. */
  readonly shots: readonly Aim[];
  /**
   * The run's score, at least what its rounds scored, for a page to show a
   * longer figure than they make, such as a five-figure score; else theirs.
   */
  readonly score?: number;
}

/**
 * Returns a run as storage keeps it, for a page to take up: begun at a
 * level on a field of a depth, and a round played for each shot on the
 * rules' own numbers, the level still on.
 *
 * It throws where the run can't begin, as `createRun()` does, for a shot
 * that isn't one of the 657 aims, as `playRound()` does, for no shots,
 * which leave nothing to keep, for a shot that clears or loses the level,
 * and for a score under what the rounds scored.
 */
export function keptRun(
  levels: readonly LevelEntry[],
  marks: Marks,
  kept: KeptRun,
): SavedGame {
  const rules = runRulesOf(levels, marks);
  let run = createRun(
    { id: 1, level: kept.level, depth: kept.depth },
    levels,
    rules,
  );
  const level = levelOf(run, levels);
  let start = openingOf(run, level);
  for (const [index, aim] of kept.shots.entries()) {
    const { outcome, next } = playRound(start, { aim }, FLIGHT_RULES);
    if (outcome.result !== "on") {
      throw new Error(
        `Round ${String(index + 1)} of level ${String(kept.level)} ends it: ${outcome.result}.`,
      );
    }
    // A round that leaves its level on lands as it is taken in.
    run = takeRound(startLevel(run), outcome, rules);
    start = next;
  }
  if (kept.score !== undefined) {
    if (kept.score < run.score) {
      throw new Error(
        `A score of ${String(kept.score)} is under the ${String(run.score)} the rounds scored.`,
      );
    }
    run = { ...run, score: kept.score };
  }
  const saved = saveGame(run, start, levels, { tuned: false }, marks);
  if (!saved) throw new Error("A run with no round played keeps nothing.");
  return saved;
}
