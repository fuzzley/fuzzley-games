// A wall game's records kept as each flight lands, as its round's driver
// tells them how the run goes: the runs started, each level cleared and
// the levels it opens, and each run's end, but for a run a debug menu
// takes off the record.

import type { Signal } from "@angular/core";
import { type IdentifiedLevel, levelIdOf } from "@fz/core/levels";
import { hasEnded } from "@fz/core/run";
import {
  type Run,
  type RunRules,
  afterLanding,
  isInProgress,
} from "../rules/run";
import { type StatsRules, levelResultOf } from "../rules/stats";
import type { LandingRecords, RunBegun } from "./round_driver";
import type { StoredProgress, StoredStats } from "./stored";

/** Says how a run begins, as a debug menu hears it: as {@link RunBegun} says, or at a level the player hasn't opened (`locked`). */
export interface RunOpened extends RunBegun {
  readonly locked?: boolean;
}

/** Describes a debug menu's say over a wall game's records: it hears how each run begins, and says whether the run under way keeps none. */
export interface RecordsMenu {
  readonly runOffRecord: Signal<boolean>;
  startRun(start: RunOpened): void;
}

/**
 * Holds what a wall game's records are kept in and from, over what it
 * tallies of a level, `T`, a level's record, `L`, and what a level cleared
 * brings it, `R`: its stores, its levels, the run's rules, which land a
 * round a run left in the air, a level's result, and its debug menu.
 */
export interface RecordsKept<T, L, R extends L> {
  readonly stats: StoredStats<L, R>;
  readonly progress: StoredProgress;
  readonly levels: readonly IdentifiedLevel[];
  readonly rules: Pick<RunRules<T>, "starsOf" | "starPoints">;
  readonly results: Pick<StatsRules<T, L, R>, "resultOf">;
  readonly menu: RecordsMenu;
}

/**
 * Keeps a wall game's records as its round's driver plays the run, but for
 * a run its debug menu takes off the record: a run started as its first
 * round is released, a level cleared and the levels it opens, and the
 * run's end, each as the flight that brings it lands; and tells the debug
 * menu how each run begins, which decides whether it is on the record.
 *
 * A game makes one for its driver, over its stores and its debug menu.
 */
export class RunRecords<T, L, R extends L> implements LandingRecords<T> {
  /** Whether the run under way keeps no records, as the debug menu took it off the record. */
  readonly offRecord: Signal<boolean>;

  constructor(private readonly kept: RecordsKept<T, L, R>) {
    this.offRecord = kept.menu.runOffRecord;
  }

  /**
   * Tells the debug menu how a run begins, which decides whether it keeps
   * its records: as handed, or a new run by whether its level is open.
   */
  began(run: Run<T>, begun?: RunBegun): void {
    const { menu, progress } = this.kept;
    menu.startRun(begun ?? { locked: !progress.isOpen(run.level) });
  }

  /**
   * Counts a run started, from the run as it stood before its round was
   * released, if that is its first.
   */
  started(before: Run<T>): void {
    if (this.offRecord() || isInProgress(before)) return;
    this.kept.stats.recordStart();
  }

  /**
   * Keeps what a run's landing brings to the records, from the run landed:
   * a level cleared and the levels it opens, and the run's end, returning
   * whether that set a new best.
   */
  landed(run: Run<T>): boolean {
    if (this.offRecord()) return false;
    const { stats, progress, levels, results } = this.kept;
    const result = levelResultOf(run, results);
    if (result !== null) {
      const id = levelIdOf(levels, run.level);
      stats.recordLevel(id, result);
      progress.recordCleared(id);
    }
    return hasEnded(run.outcome) && stats.recordEnd(run);
  }

  /**
   * Keeps what the round a run left in the air would have brought as it
   * landed, as nothing can change it once the run is left, so the level it
   * clears is open to the next run.
   */
  left(run: Run<T>): void {
    if (run.ending !== null) this.landed(afterLanding(run, this.kept.rules));
  }

  /**
   * Marks every level a run taken up cleared before its own as cleared in
   * the progress.
   *
   * A page killed with a flight in the air keeps the run as it stands once
   * the flight lands, but not the clear the landing would have kept. Call
   * it once the run has begun, which says whether it is off the record.
   */
  takenUp(run: Run<T>): void {
    if (this.offRecord()) return;
    const { progress, levels } = this.kept;
    for (let level = run.firstLevel; level < run.level; level++) {
      progress.recordCleared(levelIdOf(levels, level));
    }
  }
}
