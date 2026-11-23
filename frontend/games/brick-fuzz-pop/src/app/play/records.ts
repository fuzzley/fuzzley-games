import type { Signal } from "@angular/core";
import { levelIdOf } from "@fz/brick-wall/rules/progress";
import { afterLanding, isInProgress } from "@fz/brick-wall/rules/run";
import { levelResultOf } from "@fz/brick-wall/rules/stats";
import { hasEnded } from "@fz/core/run";
import type { LevelEntry } from "../../rules/levels/levels";
import { RUN_RULES, type Run } from "../../rules/run/run";
import { STATS_RULES } from "../../rules/run/stats";
import type { DebugService, RunStart } from "../debug/debug.service";
import type { ProgressService } from "../stats/progress.service";
import type { StatsService } from "../stats/stats.service";

/**
 * Keeps a run's records as its flights land, but for a run the debug menu
 * takes off the record: a run started as its first round is released, a
 * level cleared and the levels it opens, and the run's end; and tells the
 * debug menu how each run begins, which decides whether it is on the
 * record.
 */
export class RunRecords {
  /** Whether the run under way keeps no records, as the debug menu took it off the record. */
  readonly offRecord: Signal<boolean>;

  constructor(
    private readonly stats: StatsService,
    private readonly progress: ProgressService,
    private readonly levels: readonly LevelEntry[],
    private readonly debug: DebugService,
  ) {
    this.offRecord = debug.runOffRecord;
  }

  /**
   * Tells the debug menu how a run begins, which decides whether it keeps
   * its records: as handed, or a new run by whether its level is open.
   */
  began(run: Run, start?: RunStart): void {
    this.debug.startRun(start ?? { locked: !this.progress.isOpen(run.level) });
  }

  /**
   * Counts a run started, from the run as it stood before its round was
   * released, if that is its first.
   */
  started(before: Run): void {
    if (this.offRecord() || isInProgress(before)) return;
    this.stats.recordStart();
  }

  /**
   * Keeps what a run's landing brings to the records, from the run landed:
   * a level cleared and the levels it opens, and the run's end, returning
   * whether that set a new best.
   */
  landed(run: Run): boolean {
    if (this.offRecord()) return false;
    const result = levelResultOf(run, STATS_RULES);
    if (result !== null) {
      const id = levelIdOf(this.levels, run.level);
      this.stats.recordLevel(id, result);
      this.progress.recordCleared(id);
    }
    return hasEnded(run.outcome) && this.stats.recordEnd(run);
  }

  /**
   * Keeps what the round a run left in flight would have brought as it
   * landed, as nothing can change it once the run is left, so the level it
   * clears is open to the next run.
   */
  left(run: Run): void {
    if (run.ending !== null) this.landed(afterLanding(run, RUN_RULES));
  }

  /**
   * Marks every level a run taken up cleared before its own as cleared in
   * the progress.
   *
   * A page killed with a flight in the air keeps the run as it stands once
   * the flight lands, but not the clear the landing would have kept. Call
   * it once the run has begun, which says whether it is off the record.
   */
  takenUp(run: Run): void {
    if (this.offRecord()) return;
    for (let level = run.firstLevel; level < run.level; level++) {
      this.progress.recordCleared(levelIdOf(this.levels, level));
    }
  }
}
