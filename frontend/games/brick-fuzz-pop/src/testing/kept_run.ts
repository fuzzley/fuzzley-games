// A run as the game keeps one, played part way into its level, for the
// scripts under `tools/` to hand a page to take up. It plays rounds as the
// rules play them, so it is held as the rules are (eslint.config.js), to
// their fence and their exact arithmetic.

import { type CertifiedShot, shotOf } from "../rules/levels/certificate";
import type { LevelEntry } from "../rules/levels/levels";
import { playRound } from "../rules/round/round";
import {
  createRun,
  levelOf,
  openingOf,
  startLevel,
  takeRound,
} from "../rules/run/run";
import { type SavedGame, saveGame } from "../rules/run/saved_game";

/** Describes a run begun at a level on a field of a depth, and the rounds played into it. */
export interface KeptRun {
  /** The level it began at, by its number. */
  readonly level: number;
  /** The field's depth as the level began, 11 to 22. */
  readonly depth: number;
  /** The shot of each round played, as a certificate keeps one: an aim's index and a charge. */
  readonly shots: readonly CertifiedShot[];
}

/**
 * Returns a run as storage keeps it, for a page to take up: begun at a
 * level on a field of a depth, and a round played for each shot, the level
 * still on.
 *
 * It throws where the run can't begin, as `createRun()` does, for a shot
 * that isn't an aim and a charge, as `shotOf()` does, for no shots, which
 * leave nothing to keep, and for a shot that clears or loses the level.
 */
export function keptRun(
  levels: readonly LevelEntry[],
  kept: KeptRun,
): SavedGame {
  let run = createRun({ id: 1, level: kept.level, depth: kept.depth }, levels);
  const level = levelOf(run, levels);
  let start = openingOf(run, level);
  for (const [index, shot] of kept.shots.entries()) {
    const { outcome, next } = playRound(start, shotOf(shot), level.boon);
    if (outcome.result !== "on") {
      throw new Error(
        `Round ${String(index + 1)} of level ${String(kept.level)} ends it: ${outcome.result}.`,
      );
    }
    // A round that leaves its level on lands as it is taken in.
    run = takeRound(startLevel(run), outcome);
    start = next;
  }
  const saved = saveGame(run, start, levels, { tuned: false });
  if (!saved) throw new Error("A run with no round played keeps nothing.");
  return saved;
}
