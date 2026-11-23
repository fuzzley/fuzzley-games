import type { CertifiedShot, Line } from "../../rules/levels/certificate";
import type { RoundStart } from "../../rules/round/round";
import type { Run } from "../../rules/run/run";

/**
 * Holds a certificate's line as the debug menu plays it: its shots still to
 * fly, in order, for the run and the level it began, on the field's depth
 * it was found on.
 */
export class CertificateLine {
  private shots: Line = [];
  private depth = 0;
  private runId = 0;
  private level = 0;

  /** Starts a line: its shots to fly in a run's level, on the field's depth the line was found on. */
  start(shots: Line, depth: number, { id, level }: Run): void {
    this.shots = shots;
    this.depth = depth;
    this.runId = id;
    this.level = level;
  }

  /**
   * Returns the line's next shot, if any, the line dropped once another run
   * or level is in play, or the field takes a depth it wasn't found on, as
   * its shots would miss there.
   */
  next(run: Run, start: RoundStart): CertifiedShot | undefined {
    if (
      run.id !== this.runId ||
      run.level !== this.level ||
      start.depth !== this.depth
    ) {
      this.shots = [];
    }
    return this.shots[0];
  }

  /** Takes the shot {@link next} gave off the line, as it flew. */
  flew(): void {
    this.shots = this.shots.slice(1);
  }
}
