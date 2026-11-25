import type { Aim } from "@fz/brick-wall/rules/aims";
import type { Run } from "@fz/brick-wall/rules/run";
import type { RoundStart } from "../../rules/flight/events";

/** Describes a line of shots, as a certificate or a rally line keeps it: each shot's aim, in order. */
export type Line = readonly Aim[];

/**
 * Holds a line of shots as the debug menu plays it, a certificate's or a
 * rally line's: its shots still to fly, in order, for the run and the
 * level it began, on the field's depth it was found on.
 */
export class CertificateLine {
  private shots: Line = [];
  private depth = 0;
  private runId = 0;
  private level = 0;

  /** Starts a line: its shots to fly in a run's level, on the field's depth the line was found on. */
  start(shots: Line, depth: number, { id, level }: Run<unknown>): void {
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
  next(run: Run<unknown>, start: RoundStart): Aim | undefined {
    if (
      run.id !== this.runId ||
      run.level !== this.level ||
      start.depth !== this.depth
    ) {
      this.shots = [];
    }
    return this.shots[0];
  }

  /**
   * Returns whether the line has a shot still to fly, as {@link next} last
   * left it: so the shot released next, or just released, is the line's.
   */
  playing(): boolean {
    return this.shots.length > 0;
  }

  /** Takes the shot {@link next} gave off the line, as it flew. */
  flew(): void {
    this.shots = this.shots.slice(1);
  }
}
